from typing import TypedDict, List, Dict, Any
import logging
import asyncio
from langgraph.graph import StateGraph, END
from ai.clip_model import clip_service
from ai.text_model import text_service
from ai.matching import cosine_similarity, calculate_context_score, compute_total_match_score
from config import settings
from ai.vector_search_providers import get_vector_search_provider

logger = logging.getLogger(__name__)

class AgentState(TypedDict):
    source_item: Dict[str, Any]
    candidate_items: List[Dict[str, Any]]
    image_embedding: List[float]
    text_embedding: List[float]
    scored_candidates: List[Dict[str, Any]]
    final_matches: List[Dict[str, Any]]

async def understand_request(state: AgentState) -> AgentState:
    """Node 1 (async): Understand item details, extract key query attributes."""
    source = state["source_item"]
    query_text = f"{source.get('title', '')} {source.get('description', '')} {source.get('category', '')} {' '.join(source.get('detected_objects', []))} {source.get('extracted_text', '')}"
    source["unified_query_text"] = query_text.strip()
    state["source_item"] = source
    return state

async def generate_embeddings(state: AgentState) -> AgentState:
    """Node 2 (async): Generate CLIP image embedding and BGE text embedding.

    Checks if valid embeddings are already stored on the source item before
    offloading PyTorch calls to asyncio.to_thread.
    """
    source = state["source_item"]

    # 1. Text embedding: reuse stored vector if present, else compute
    text_emb = state.get("text_embedding") or source.get("text_embedding")
    if not text_emb or len(text_emb) == 0:
        text = source.get("unified_query_text", source.get("description", ""))
        text_emb = await asyncio.to_thread(text_service.get_text_embedding, text)

    # 2. Image embedding: reuse stored vector if present & non-zero, else compute
    image_emb = state.get("image_embedding") or source.get("image_embedding")
    if not image_emb or not any(v != 0.0 for v in image_emb):
        img_url = source.get("image_url")
        if img_url:
            image_emb = await asyncio.to_thread(clip_service.get_image_embedding, img_url)
        else:
            image_emb = [0.0] * 512

    state["image_embedding"] = image_emb
    state["text_embedding"] = text_emb
    return state

async def vector_search(state: AgentState) -> AgentState:
    """Node 3 (async): Compute candidate vector similarity scores using VectorSearchProvider."""
    candidates = state.get("candidate_items", [])
    src_img_emb = state.get("image_embedding", [])
    src_txt_emb = state.get("text_embedding", [])
    source = state.get("source_item", {})

    src_version = source.get("embedding_model_version", settings.EMBEDDING_MODEL_VERSION)

    # Embedding version check
    filtered_candidates = []
    for cand in candidates:
        cand_version = cand.get("embedding_model_version", settings.EMBEDDING_MODEL_VERSION)
        if cand_version != src_version:
            logger.warning(
                f"Embedding version mismatch between source ({src_version}) and candidate {cand.get('id')} ({cand_version}). Skipping candidate."
            )
            continue
        filtered_candidates.append(cand)

    target_type = "found" if source.get("type") == "lost" else "lost"
    provider = get_vector_search_provider(settings.VECTOR_SEARCH_BACKEND)
    # provider.search is already async (awaits Mongo / does CPU work)
    scored = await provider.search(src_img_emb, src_txt_emb, filtered_candidates, target_type=target_type)
    
    state["scored_candidates"] = scored
    return state

async def context_rank(state: AgentState) -> AgentState:
    """Node 4 (async): Compute context score and calculate final formula.

    Reads image_available from each scored entry (set by the vector search
    provider) and chooses the correct weight preset:
      - Both images present → 0.60 img + 0.25 text + 0.15 ctx
      - No image on either side → 0.70 text + 0.30 ctx
    CPU-bound work is offloaded to a thread pool.
    """
    source = state["source_item"]
    scored = state.get("scored_candidates", [])

    def _rank_sync() -> List[Dict[str, Any]]:
        results = []
        for entry in scored:
            cand            = entry["item"]
            img_sim         = entry["img_sim"]          # None when image absent
            txt_sim         = entry["txt_sim"]
            image_available = entry.get("image_available", img_sim is not None)

            ctx_score   = calculate_context_score(source, cand)
            total_score = compute_total_match_score(
                img_sim, txt_sim, ctx_score,
                image_available=image_available,
            )

            results.append({
                "target_item": cand,
                "score_breakdown": {
                    # None serialises to null in JSON; frontend treats null as absent
                    "image_similarity": round(img_sim, 4) if img_sim is not None else None,
                    "text_similarity":  round(txt_sim, 4),
                    "context_score":    round(ctx_score, 4),
                    "total_score":      round(total_score, 4),
                    "image_available":  image_available,
                },
            })

        results.sort(key=lambda x: x["score_breakdown"]["total_score"], reverse=True)
        return results

    state["final_matches"] = await asyncio.to_thread(_rank_sync)
    return state

async def explain_match(state: AgentState) -> AgentState:
    """Node 5 (async): Generate natural language explanations for each candidate.

    Adapts wording to the image_available flag so no misleading visual-
    similarity references appear when one side has no photo.
    Pure Python string-building — offloaded to a thread pool for consistency.
    """
    final_matches = state.get("final_matches", [])

    def _explain_sync() -> List[Dict[str, Any]]:
        for match in final_matches:
            cand      = match["target_item"]
            breakdown = match["score_breakdown"]
            tot       = breakdown["total_score"]
            has_img   = breakdown.get("image_available", breakdown["image_similarity"] is not None)
            img_sim   = breakdown.get("image_similarity")  # may be None

            reasons = []

            # Visual signal — only when both items have images
            if has_img and img_sim is not None:
                if img_sim > 0.7:
                    reasons.append("High visual similarity detected via CLIP model")
                elif img_sim > 0.4:
                    reasons.append("Moderate visual resemblance")
            else:
                reasons.append(
                    "Matched primarily on description and location similarity "
                    "(no photo provided — visual comparison skipped)"
                )

            if breakdown["text_similarity"] > 0.6:
                reasons.append("Strong description match")

            if breakdown["context_score"] > 0.5:
                reasons.append(
                    f"Matching location ({cand.get('location')}) "
                    f"or category ({cand.get('category')})"
                )

            match["explanation"] = (
                f"Match confidence is {int(tot * 100)}%. "
                + (" and ".join(reasons) if reasons else "Partial attributes overlap detected.")
            )
        return final_matches

    state["final_matches"] = await asyncio.to_thread(_explain_sync)
    return state

# ---------------------------------------------------------------------------
# Build explicit LangGraph workflow graph
# ---------------------------------------------------------------------------
workflow = StateGraph(AgentState)

workflow.add_node("understand_request", understand_request)
workflow.add_node("generate_embeddings", generate_embeddings)
workflow.add_node("vector_search", vector_search)
workflow.add_node("context_rank", context_rank)
workflow.add_node("explain_match", explain_match)

workflow.set_entry_point("understand_request")
workflow.add_edge("understand_request", "generate_embeddings")
workflow.add_edge("generate_embeddings", "vector_search")
workflow.add_edge("vector_search", "context_rank")
workflow.add_edge("context_rank", "explain_match")
workflow.add_edge("explain_match", END)

agent_graph = workflow.compile()
