import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from ai.matching import cosine_similarity
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
            # Skip deleted items
            if cand.get("deleted") is True:
                continue

            cand_img_emb = cand.get("image_embedding", [])
            cand_txt_emb = cand.get("text_embedding", [])

            img_sim = cosine_similarity(src_img_emb, cand_img_emb) if cand_img_emb else 0.0
            txt_sim = cosine_similarity(src_txt_emb, cand_txt_emb) if cand_txt_emb else 0.0

            scored.append({
                "item": cand,
                "img_sim": img_sim,
                "txt_sim": txt_sim
            })
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
            logger.warning("No DB connection for Atlas Vector Search. Falling back to LocalCosineProvider.")
            return await LocalCosineProvider().search(src_img_emb, src_txt_emb, candidates, target_type)

        try:
            # Atlas Vector Search Aggregation pipeline for text_embedding
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "foundit_vector_index",
                        "path": "text_embedding",
                        "queryVector": src_txt_emb,
                        "numCandidates": 100,
                        "limit": 20,
                        "filter": {"deleted": {"$ne": True}}
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

            # Fall back to candidate list if atlas returns empty
            target_docs = atlas_docs if atlas_docs else candidates

            scored = []
            for cand in target_docs:
                if cand.get("deleted") is True:
                    continue
                cand_img_emb = cand.get("image_embedding", [])
                cand_txt_emb = cand.get("text_embedding", [])

                img_sim = cosine_similarity(src_img_emb, cand_img_emb) if cand_img_emb else 0.0
                txt_sim = cosine_similarity(src_txt_emb, cand_txt_emb) if cand_txt_emb else 0.0

                scored.append({
                    "item": cand,
                    "img_sim": img_sim,
                    "txt_sim": txt_sim
                })
            return scored

        except Exception as e:
            logger.error(f"Atlas Vector Search aggregation failed: {e}. Falling back to local cosine scoring.")
            return await LocalCosineProvider().search(src_img_emb, src_txt_emb, candidates, target_type)

def get_vector_search_provider(backend_type: str = "local") -> VectorSearchProvider:
    if backend_type.lower() == "atlas":
        return AtlasVectorSearchProvider()
    return LocalCosineProvider()
