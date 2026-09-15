import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from ai.matching import cosine_similarity, has_image_embedding
from services.db import get_database

logger = logging.getLogger(__name__)


class VectorSearchProvider(ABC):
    @abstractmethod
    async def search(
        self,
        src_img_emb: List[float],
        src_txt_emb: List[float],
        candidates: List[Dict[str, Any]],
        target_type: str = None
    ) -> List[Dict[str, Any]]:
        """Perform vector search scoring over candidate items."""
        pass


def _score_pair(
    src_img_emb: List[float],
    src_txt_emb: List[float],
    cand: Dict[str, Any],
) -> Dict[str, Any]:
    """Score a single source→candidate pair.

    Returns a dict with keys: item, img_sim (Optional[float]), txt_sim,
    image_available.

    img_sim is None (not 0.0) when either side lacks a real image
    embedding, so downstream scoring can detect the missing-image case and
    apply re-normalised weights instead of treating it as 'looks nothing alike'.
    """
    cand_img_emb = cand.get("image_embedding", [])
    cand_txt_emb = cand.get("text_embedding", [])

    src_has_img  = has_image_embedding(src_img_emb)
    cand_has_img = has_image_embedding(cand_img_emb)
    image_available = src_has_img and cand_has_img

    if image_available:
        img_sim: Optional[float] = cosine_similarity(src_img_emb, cand_img_emb)
    else:
        img_sim = None  # ← explicit None so scorer knows image is absent

    txt_sim = cosine_similarity(src_txt_emb, cand_txt_emb) if cand_txt_emb else 0.0

    return {
        "item":            cand,
        "img_sim":         img_sim,
        "txt_sim":         txt_sim,
        "image_available": image_available,
    }


class LocalCosineProvider(VectorSearchProvider):
    async def search(
        self,
        src_img_emb: List[float],
        src_txt_emb: List[float],
        candidates: List[Dict[str, Any]],
        target_type: str = None
    ) -> List[Dict[str, Any]]:
        scored = []
        for cand in candidates:
            # Skip soft-deleted items
            if cand.get("deleted") is True:
                continue
            # Enforce target_type filter if specified
            if target_type and cand.get("type") and cand.get("type") != target_type:
                continue
            scored.append(_score_pair(src_img_emb, src_txt_emb, cand))
        return scored


class AtlasVectorSearchProvider(VectorSearchProvider):
    async def search(
        self,
        src_img_emb: List[float],
        src_txt_emb: List[float],
        candidates: List[Dict[str, Any]],
        target_type: str = None
    ) -> List[Dict[str, Any]]:
        db = get_database()
        if db is None:
            logger.warning(
                "No DB connection for Atlas Vector Search. "
                "Falling back to LocalCosineProvider."
            )
            return await LocalCosineProvider().search(
                src_img_emb, src_txt_emb, candidates, target_type
            )

        try:
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "foundit_vector_index",
                        "path": "text_embedding",
                        "queryVector": src_txt_emb,
                        "numCandidates": 100,
                        "limit": 20,
                        "filter": {"deleted": {"$ne": True}},
                    }
                }
            ]
            if target_type:
                pipeline[0]["$vectorSearch"]["filter"]["type"] = target_type

            cursor = db["items"].aggregate(pipeline)
            atlas_docs = []
            async for doc in cursor:
                doc["id"] = str(doc["_id"])
                atlas_docs.append(doc)

            # Fall back to candidate list if Atlas returns empty
            target_docs = atlas_docs if atlas_docs else candidates

            scored = []
            for cand in target_docs:
                if cand.get("deleted") is True:
                    continue
                scored.append(_score_pair(src_img_emb, src_txt_emb, cand))
            return scored

        except Exception as e:
            logger.error(
                f"Atlas Vector Search aggregation failed: {e}. "
                "Falling back to local cosine scoring."
            )
            return await LocalCosineProvider().search(
                src_img_emb, src_txt_emb, candidates, target_type
            )


def get_vector_search_provider(backend_type: str = "local") -> VectorSearchProvider:
    if backend_type.lower() == "atlas":
        return AtlasVectorSearchProvider()
    return LocalCosineProvider()
