from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from ai.clip_model import clip_service
from ai.text_model import text_service
from ai.matching import cosine_similarity, calculate_context_score, compute_total_match_score

class AgentState(TypedDict):
    source_item: Dict[str, Any]
    candidate_items: List[Dict[str, Any]]
    image_embedding: List[float]
    text_embedding: List[float]
    scored_candidates: List[Dict[str, Any]]
    final_matches: List[Dict[str, Any]]

def understand_request(state: AgentState) -> AgentState:
    """Node 1: Understand item details, extract key query attributes."""
    source = state["source_item"]
    # Combine title, description, category, detected objects, extracted OCR text into unified query text
    query_text = f"{source.get('title', '')} {source.get('description', '')} {source.get('category', '')} {' '.join(source.get('detected_objects', []))} {source.get('extracted_text', '')}"
    source["unified_query_text"] = query_text.strip()
    state["source_item"] = source
    return state

def generate_embeddings(state: AgentState) -> AgentState:
    """Node 2: Generate CLIP image embedding and BGE text embedding."""
    source = state["source_item"]
    img_url = source.get("image_url")
    text = source.get("unified_query_text", source.get("description", ""))

    image_emb = clip_service.get_image_embedding(img_url) if img_url else [0.0]*512
    text_emb = text_service.get_text_embedding(text)

    state["image_embedding"] = image_emb
    state["text_embedding"] = text_emb
    return state

def vector_search(state: AgentState) -> AgentState:
    """Node 3: Compute candidate vector similarity scores."""
    candidates = state.get("candidate_items", [])
    src_img_emb = state.get("image_embedding", [])
    src_txt_emb = state.get("text_embedding", [])
    
    scored = []
    for cand in candidates:
        cand_img_emb = cand.get("image_embedding", [])
        cand_txt_emb = cand.get("text_embedding", [])

        img_sim = cosine_similarity(src_img_emb, cand_img_emb) if cand_img_emb else 0.0
        txt_sim = cosine_similarity(src_txt_emb, cand_txt_emb) if cand_txt_emb else 0.0

        scored.append({
            "item": cand,
            "img_sim": img_sim,
            "txt_sim": txt_sim
        })
    
    state["scored_candidates"] = scored
    return state

def context_rank(state: AgentState) -> AgentState:
    """Node 4: Compute context score and calculate final formula: 0.6*img + 0.25*txt + 0.15*ctx."""
    source = state["source_item"]
    scored = state.get("scored_candidates", [])
    
    results = []
    for entry in scored:
        cand = entry["item"]
        img_sim = entry["img_sim"]
        txt_sim = entry["txt_sim"]
        
        ctx_score = calculate_context_score(source, cand)
        total_score = compute_total_match_score(img_sim, txt_sim, ctx_score)

        results.append({
            "target_item": cand,
            "score_breakdown": {
                "image_similarity": round(img_sim, 4),
                "text_similarity": round(txt_sim, 4),
                "context_score": round(ctx_score, 4),
                "total_score": round(total_score, 4)
            }
        })
    
    # Sort descending by total match score
    results.sort(key=lambda x: x["score_breakdown"]["total_score"], reverse=True)
    state["final_matches"] = results
    return state

def explain_match(state: AgentState) -> AgentState:
    """Node 5: Generate clear, transparent natural language explanations for candidates."""
    final_matches = state.get("final_matches", [])
    source = state["source_item"]

    for match in final_matches:
        cand = match["target_item"]
        breakdown = match["score_breakdown"]
        tot = breakdown["total_score"]

        reasons = []
        if breakdown["image_similarity"] > 0.7:
            reasons.append("High visual similarity detected via CLIP model")
        elif breakdown["image_similarity"] > 0.4:
            reasons.append("Moderate visual resemblance")

        if breakdown["text_similarity"] > 0.6:
            reasons.append("Strong description match")

        if breakdown["context_score"] > 0.5:
            reasons.append(f"Matching location ({cand.get('location')}) or category ({cand.get('category')})")

        explanation = f"Match confidence is {int(tot * 100)}%. " + (" and ".join(reasons) if reasons else "Partial attributes overlap detected.")
        match["explanation"] = explanation

    state["final_matches"] = final_matches
    return state

# Build explicit LangGraph workflow graph
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
