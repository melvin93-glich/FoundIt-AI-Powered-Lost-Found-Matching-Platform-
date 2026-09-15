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
import logging
import asyncio
from config import settings
from services.email_service import (
    send_email_async,
    build_candidate_match_email,
    build_confirmed_match_email,
)

logger = logging.getLogger(__name__)

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
        tot_score = sb.get("total_score", 0.0)

        candidates_response.append(MatchCandidate(
            item_id=tgt["id"],
            target_item=tgt,
            score_breakdown=ScoreBreakdown(**sb),
            explanation=cand.get("explanation", "High overall matching score across multimodal features.")
        ))

        # Upsert candidate into db["matches"] collection for user match overview
        if db is not None:
            match_pair_filter = {
                "lost_item_id": source_item["id"] if source_item.get("type") == "lost" else tgt["id"],
                "found_item_id": tgt["id"] if source_item.get("type") == "lost" else source_item["id"],
            }
            match_pair_doc = {
                "lost_item_id": match_pair_filter["lost_item_id"],
                "found_item_id": match_pair_filter["found_item_id"],
                "lost_user_id": source_item.get("user_id") if source_item.get("type") == "lost" else tgt.get("user_id"),
                "found_user_id": tgt.get("user_id") if source_item.get("type") == "lost" else source_item.get("user_id"),
                "lost_item": {
                    "id": source_item["id"] if source_item.get("type") == "lost" else tgt["id"],
                    "title": source_item.get("title") if source_item.get("type") == "lost" else tgt.get("title"),
                    "category": source_item.get("category") if source_item.get("type") == "lost" else tgt.get("category"),
                    "location": source_item.get("location") if source_item.get("type") == "lost" else tgt.get("location"),
                    "image_url": source_item.get("image_url") if source_item.get("type") == "lost" else tgt.get("image_url"),
                    "user_name": source_item.get("user_name") if source_item.get("type") == "lost" else tgt.get("user_name"),
                },
                "found_item": {
                    "id": tgt["id"] if source_item.get("type") == "lost" else source_item["id"],
                    "title": tgt.get("title") if source_item.get("type") == "lost" else source_item.get("title"),
                    "category": tgt.get("category") if source_item.get("type") == "lost" else source_item.get("category"),
                    "location": tgt.get("location") if source_item.get("type") == "lost" else source_item.get("location"),
                    "image_url": tgt.get("image_url") if source_item.get("type") == "lost" else source_item.get("image_url"),
                    "user_name": tgt.get("user_name") if source_item.get("type") == "lost" else source_item.get("user_name"),
                },
                "score": tot_score,
                "status": "pending",
                "updated_at": datetime.utcnow()
            }
            # Preserve status if already confirmed
            existing_m = await db["matches"].find_one(match_pair_filter)
            if existing_m and existing_m.get("status") == "confirmed":
                match_pair_doc["status"] = "confirmed"
            await db["matches"].update_one(match_pair_filter, {"$set": match_pair_doc}, upsert=True)

        # TRIGGER 1: Lost item reporter candidate match notification
        if db is not None and source_item.get("type") == "lost" and tot_score >= settings.MATCH_NOTIFICATION_THRESHOLD:
            lost_user_id = source_item.get("user_id")
            lost_item_id = source_item["id"]
            found_item_id = tgt["id"]

            if lost_user_id:
                # Deduplication check
                already_notified = await db["notifications_sent"].find_one({
                    "lost_item_id": lost_item_id,
                    "candidate_id": found_item_id
                })

                if not already_notified:
                    # Record notification sent
                    await db["notifications_sent"].insert_one({
                        "lost_item_id": lost_item_id,
                        "candidate_id": found_item_id,
                        "notified_at": datetime.utcnow()
                    })

                    # Create in-app notification
                    score_pct = int(tot_score * 100)
                    notif_doc = {
                        "user_id": lost_user_id,
                        "type": "match_found",
                        "title": "Possible Match Detected!",
                        "message": f"A candidate match ({score_pct}% score) was found for your lost item: {source_item.get('title')}",
                        "related_match_id": lost_item_id,
                        "read": False,
                        "created_at": datetime.utcnow()
                    }
                    await db["notifications"].insert_one(notif_doc)

                    # Trigger email to lost item owner
                    try:
                        lost_user = await db["users"].find_one({"_id": ObjectId(lost_user_id)})
                        if lost_user and lost_user.get("email"):
                            match_url = f"{settings.FRONTEND_URL}/matches/{lost_item_id}"
                            email_html = build_candidate_match_email(
                                user_name=lost_user.get("name", "User"),
                                lost_item=source_item,
                                found_item=tgt,
                                score_pct=score_pct,
                                match_link=match_url
                            )
                            # Non-blocking async email send
                            from services.email_service import send_email_async
                            asyncio.create_task(send_email_async(
                                to_email=lost_user["email"],
                                subject=f"Good news — a possible match was found for your {source_item.get('title')}",
                                html_content=email_html
                            ))
                    except Exception as email_err:
                        logger.error(f"Failed to dispatch candidate match email: {email_err}")

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

        # Update db["matches"] collection status to "confirmed"
        await db["matches"].update_one(
            {"lost_item_id": lost_item_id, "found_item_id": found_item_id},
            {"$set": {"status": "confirmed", "confirmed_at": now, "confirmed_by": confirmed_by}},
            upsert=True
        )

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

        # 5. TRIGGER 2: Notify the FOUND item's reporter upon match confirmation
        if found_user_id:
            found_user_doc = None
            try:
                found_user_doc = await db["users"].find_one({"_id": ObjectId(found_user_id)})
            except Exception:
                pass

            if found_user_doc:
                # In-app notification for finder
                found_title = candidate_item.get("title", "Found Item") if candidate_item else "Found Item"
                notif_doc = {
                    "user_id": found_user_id,
                    "type": "match_confirmed",
                    "title": "Match Confirmed!",
                    "message": f"Your found item '{found_title}' was confirmed as a match! Contact info for the owner is now unlocked.",
                    "related_match_id": lost_item_id,
                    "read": False,
                    "created_at": now
                }
                await db["notifications"].insert_one(notif_doc)

                # Email for finder
                if found_user_doc.get("email"):
                    try:
                        other_name = reporter_contact.name if reporter_contact else "Item Owner"
                        other_email = reporter_contact.email if reporter_contact else ""
                        other_phone = reporter_contact.phone if reporter_contact else None
                        match_url = f"{settings.FRONTEND_URL}/matches/{lost_item_id}"
                        email_html = build_confirmed_match_email(
                            user_name=found_user_doc.get("name", "User"),
                            item_title=found_title,
                            other_party_name=other_name,
                            contact_email=other_email,
                            contact_phone=other_phone,
                            match_link=match_url
                        )
                        asyncio.create_task(send_email_async(
                            to_email=found_user_doc["email"],
                            subject=f"Match Confirmed for your found item '{found_title}'",
                            html_content=email_html
                        ))
                    except Exception as email_err:
                        logger.error(f"Failed to dispatch match confirmed email to finder: {email_err}")

        # 6. Audit log — contact reveal
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


# ---------------------------------------------------------------------------
# GET /matches — list all match records for the current user (lost or found)
# ---------------------------------------------------------------------------
@router.get("/matches")
async def list_user_matches(
    status_filter: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    """Retrieve all matches where current user is the reporter of either side.

    Gates full contact info (email/phone) to confirmed matches only.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    user_id = str(current_user["id"])
    db = get_database()
    if db is None:
        return {"matches": []}

    query: Dict[str, Any] = {
        "$or": [
            {"lost_user_id": user_id},
            {"found_user_id": user_id},
        ]
    }
    if status_filter and status_filter.lower() in ["pending", "confirmed"]:
        query["status"] = status_filter.lower()

    cursor = db["matches"].find(query).sort("updated_at", -1)
    results = []
    async for doc in cursor:
        m_status = doc.get("status", "pending")
        lost_u_id = doc.get("lost_user_id")
        found_u_id = doc.get("found_user_id")

        # Contact details gating logic
        reporter_contact_info = None
        finder_contact_info = None

        if m_status == "confirmed":
            lost_user = None
            found_user = None
            if lost_u_id:
                try:
                    lost_user = await db["users"].find_one({"_id": ObjectId(lost_u_id)})
                except Exception:
                    pass
            if found_u_id:
                try:
                    found_user = await db["users"].find_one({"_id": ObjectId(found_u_id)})
                except Exception:
                    pass
            if lost_user:
                reporter_contact_info = _contact_from_user(lost_user).dict()
            if found_user:
                finder_contact_info = _contact_from_user(found_user).dict()

        results.append({
            "id": str(doc["_id"]),
            "lost_item_id": doc.get("lost_item_id"),
            "found_item_id": doc.get("found_item_id"),
            "score": round(float(doc.get("score", 0.0)), 4),
            "score_pct": int(float(doc.get("score", 0.0)) * 100),
            "status": m_status,
            "lost_item": doc.get("lost_item", {}),
            "found_item": doc.get("found_item", {}),
            "reporter_contact": reporter_contact_info,
            "finder_contact": finder_contact_info,
            "updated_at": doc.get("updated_at", datetime.utcnow()),
        })

    return {"matches": results}
