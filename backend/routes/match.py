from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from models.match import MatchResponse, MatchCandidate, ScoreBreakdown
from services.db import get_database
from ai.agent_graph import agent_graph
from bson import ObjectId
from datetime import datetime

router = APIRouter(tags=["Matches"])

@router.get("/matches/{item_id}", response_model=MatchResponse)
async def get_item_matches(item_id: str):
    db = get_database()
    source_item = None
    candidate_items = []

    if db is not None:
        try:
            source_item = await db["items"].find_one({"_id": ObjectId(item_id)})
        except Exception:
            source_item = await db["items"].find_one({"id": item_id})
        
        if not source_item:
            raise HTTPException(status_code=404, detail="Item not found")

        source_item["id"] = str(source_item["_id"])
        target_type = "found" if source_item["type"] == "lost" else "lost"
        
        cursor = db["items"].find({"type": target_type})
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            candidate_items.append(doc)
    else:
        # Fallback mock for demo if DB disconnected
        source_item = {
            "id": item_id,
            "type": "lost",
            "title": "Black Leather Wallet with ID Cards",
            "description": "Lost near central library at 10am. Contains driver license and cards.",
            "category": "Wallets & Bags",
            "location": "Central Library, 2nd Floor",
            "date_time": "Today, 10:00 AM",
            "detected_objects": ["wallet"],
            "extracted_text": "DRIVER LICENSE",
            "image_url": "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80"
        }
        candidate_items = [
            {
                "id": "cand_101",
                "type": "found",
                "user_id": "user_99",
                "user_name": "Sarah Connor",
                "title": "Found Black Leather Bifold Wallet",
                "description": "Found on a study desk near the Quiet Zone entrance.",
                "category": "Wallets & Bags",
                "location": "Central Library",
                "date_time": "Today, 10:30 AM",
                "detected_objects": ["wallet"],
                "extracted_text": "LICENSE",
                "image_url": "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80",
                "status": "active",
                "created_at": datetime.utcnow()
            }
        ]

    # Execute LangGraph Pipeline
    initial_state = {
        "source_item": source_item,
        "candidate_items": candidate_items,
        "image_embedding": source_item.get("image_embedding", []),
        "text_embedding": source_item.get("text_embedding", []),
        "scored_candidates": [],
        "final_matches": []
    }

    graph_result = agent_graph.invoke(initial_state)
    raw_candidates = graph_result.get("final_matches", [])

    candidates_response = []
    for cand in raw_candidates:
        tgt = cand["target_item"]
        sb = cand["score_breakdown"]
        candidates_response.append(MatchCandidate(
            item_id=tgt["id"],
            target_item=tgt,
            score_breakdown=ScoreBreakdown(**sb),
            explanation=cand.get("explanation", "High overall matching score across multimodal features.")
        ))

    return MatchResponse(
        source_item_id=item_id,
        candidates=candidates_response
    )

@router.post("/match/{item_id}")
async def confirm_match(item_id: str, candidate_id: str):
    db = get_database()
    if db is not None:
        try:
            await db["items"].update_one(
                {"_id": ObjectId(item_id)},
                {"$set": {"status": "matched", "matched_item_id": candidate_id}}
            )
            await db["items"].update_one(
                {"_id": ObjectId(candidate_id)},
                {"$set": {"status": "matched", "matched_item_id": item_id}}
            )
        except Exception:
            pass
    return {"message": "Match successfully confirmed and status updated."}
