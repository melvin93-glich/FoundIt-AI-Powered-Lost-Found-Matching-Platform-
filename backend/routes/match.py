from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from models.match import (
    MatchResponse, MatchCandidate, ScoreBreakdown,
    ConfirmMatchResponse, MatchContactsResponse,
    ContactInfo,
)
from services.db import get_database
from services.auth_service import get_current_user
from ai.agent_graph import agent_graph
from bson import ObjectId
from datetime import datetime

router = APIRouter(tags=["Matches"])


# ---------------------------------------------------------------------------
# Helper: build a ContactInfo from a raw user document
# ---------------------------------------------------------------------------
def _contact_from_user(user_doc: dict) -> ContactInfo:
    return ContactInfo(
        name=user_doc.get("name", "Unknown"),
        email=user_doc.get("email", ""),
        phone=user_doc.get("phone"),
        preferred_contact=user_doc.get("preferred_contact", "email"),
    )


# ---------------------------------------------------------------------------
# Helper: audit-log a contact reveal (reuses admin_actions collection)
# ---------------------------------------------------------------------------
async def _log_contact_reveal(
    db, *, viewer_id: str, viewer_name: str,
    match_doc_id: str, other_user_id: str,
    lost_item_id: str, found_item_id: str,
):
    if db is None:
        return
    await db["admin_actions"].insert_one({
        "admin_id": viewer_id,
        "admin_name": viewer_name,
        "action": "contact_reveal",
        "target_type": "match",
        "target_id": match_doc_id,
        "affected_user_id": other_user_id,
        "details": (
            f"Contact details revealed for confirmed match "
            f"between lost item {lost_item_id} and found item {found_item_id}"
        ),
        "timestamp": datetime.utcnow(),
    })


# ---------------------------------------------------------------------------
# GET /matches/{item_id} — AI candidate ranking (no contact info)
# ---------------------------------------------------------------------------
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

    graph_result = await agent_graph.ainvoke(initial_state)
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


# ---------------------------------------------------------------------------
# POST /match/{item_id} — confirm a match & return contacts
# ---------------------------------------------------------------------------
@router.post("/match/{item_id}", response_model=ConfirmMatchResponse)
async def confirm_match(
    item_id: str,
    candidate_id: str,
    current_user=Depends(get_current_user),
):
    db = get_database()
    now = datetime.utcnow()

    reporter_contact = None
    finder_contact = None

    if db is not None:
        # 1. Mark both items as matched
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

        # 2. Determine which item is lost vs found
        source_item = None
        try:
            source_item = await db["items"].find_one({"_id": ObjectId(item_id)})
        except Exception:
            pass
        candidate_item = None
        try:
            candidate_item = await db["items"].find_one({"_id": ObjectId(candidate_id)})
        except Exception:
            pass

        lost_item_id = item_id
        found_item_id = candidate_id
        lost_user_id = None
        found_user_id = None

        if source_item and candidate_item:
            if source_item.get("type") == "lost":
                lost_item_id = item_id
                found_item_id = candidate_id
                lost_user_id = source_item.get("user_id")
                found_user_id = candidate_item.get("user_id")
            else:
                lost_item_id = candidate_id
                found_item_id = item_id
                lost_user_id = candidate_item.get("user_id")
                found_user_id = source_item.get("user_id")

        # 3. Persist the confirmed match
        confirmed_by = current_user["id"] if current_user else "anonymous"
        match_doc = {
            "lost_item_id": lost_item_id,
            "found_item_id": found_item_id,
            "lost_user_id": lost_user_id,
            "found_user_id": found_user_id,
            "confirmed_at": now,
            "confirmed_by": confirmed_by,
        }
        insert_result = await db["confirmed_matches"].insert_one(match_doc)
        match_doc_id = str(insert_result.inserted_id)

        # 4. Look up both users' contact info
        if lost_user_id:
            try:
                lost_user = await db["users"].find_one({"_id": ObjectId(lost_user_id)})
                if lost_user:
                    reporter_contact = _contact_from_user(lost_user)
            except Exception:
                pass
        if found_user_id:
            try:
                found_user = await db["users"].find_one({"_id": ObjectId(found_user_id)})
                if found_user:
                    finder_contact = _contact_from_user(found_user)
            except Exception:
                pass

        # 5. Audit log — contact reveal
        if current_user:
            other_user_id = (
                found_user_id if current_user["id"] == lost_user_id else lost_user_id
            )
            await _log_contact_reveal(
                db,
                viewer_id=current_user["id"],
                viewer_name=current_user.get("name", "Unknown"),
                match_doc_id=match_doc_id,
                other_user_id=other_user_id or "unknown",
                lost_item_id=lost_item_id,
                found_item_id=found_item_id,
            )

    return ConfirmMatchResponse(
        message="Match successfully confirmed and status updated.",
        reporter_contact=reporter_contact,
        finder_contact=finder_contact,
        confirmed_at=now,
    )


# ---------------------------------------------------------------------------
# GET /match/{item_id}/contacts — re-fetch contacts for an already-confirmed match
# ---------------------------------------------------------------------------
@router.get("/match/{item_id}/contacts", response_model=MatchContactsResponse)
async def get_match_contacts(
    item_id: str,
    current_user=Depends(get_current_user),
):
    """Return contact details for an already-confirmed match.

    Privacy: only the two users involved (or an admin) may call this.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Find a confirmed match involving this item (as either side)
    match_doc = await db["confirmed_matches"].find_one({
        "$or": [
            {"lost_item_id": item_id},
            {"found_item_id": item_id},
        ]
    })
    if not match_doc:
        raise HTTPException(status_code=404, detail="No confirmed match found for this item")

    # Ownership check: caller must be one of the two involved users, or admin
    caller_id = current_user["id"]
    caller_role = current_user.get("role", "user")
    involved_ids = {match_doc.get("lost_user_id"), match_doc.get("found_user_id")}
    if caller_id not in involved_ids and caller_role != "admin":
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to view contact details for this match",
        )

    # Fetch both users
    lost_user = None
    found_user = None
    try:
        if match_doc.get("lost_user_id"):
            lost_user = await db["users"].find_one({"_id": ObjectId(match_doc["lost_user_id"])})
    except Exception:
        pass
    try:
        if match_doc.get("found_user_id"):
            found_user = await db["users"].find_one({"_id": ObjectId(match_doc["found_user_id"])})
    except Exception:
        pass

    reporter_contact = _contact_from_user(lost_user) if lost_user else ContactInfo(name="Unknown", email="")
    finder_contact = _contact_from_user(found_user) if found_user else ContactInfo(name="Unknown", email="")

    # Audit log
    other_user_id = (
        match_doc.get("found_user_id")
        if caller_id == match_doc.get("lost_user_id")
        else match_doc.get("lost_user_id")
    )
    await _log_contact_reveal(
        db,
        viewer_id=caller_id,
        viewer_name=current_user.get("name", "Unknown"),
        match_doc_id=str(match_doc["_id"]),
        other_user_id=other_user_id or "unknown",
        lost_item_id=match_doc["lost_item_id"],
        found_item_id=match_doc["found_item_id"],
    )

    return MatchContactsResponse(
        reporter_contact=reporter_contact,
        finder_contact=finder_contact,
        confirmed_at=match_doc["confirmed_at"],
        lost_item_id=match_doc["lost_item_id"],
        found_item_id=match_doc["found_item_id"],
    )
