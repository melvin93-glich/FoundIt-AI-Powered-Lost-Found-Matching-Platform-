import logging
import re
from typing import TypedDict, List, Dict, Any, Optional
from datetime import datetime
from bson import ObjectId

from ai.text_model import text_service
from ai.vector_search_providers import get_vector_search_provider
from ai.agent_graph import explain_match as explain_match_node
from config import settings
from services.db import get_database

logger = logging.getLogger(__name__)

# --- TOOL IMPLEMENTATIONS ---

async def search_items_tool(query: str, item_type: str = "both") -> List[Dict[str, Any]]:
    """Search DB items using BGE text embedding vector search."""
    db = get_database()
    if not db:
        return []

    # Filter by item_type if specified
    query_filter: Dict[str, Any] = {"deleted": {"$ne": True}}
    if item_type in ["lost", "found"]:
        query_filter["type"] = item_type

    candidates = []
    cursor = db["items"].find(query_filter)
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        candidates.append(doc)

    if not candidates:
        return []

    # Generate query embedding
    query_emb = text_service.get_text_embedding(query)
    provider = get_vector_search_provider(settings.VECTOR_SEARCH_BACKEND)
    
    # Provider scoring uses local cosine/Atlas
    dummy_img_emb = [0.0] * 512
    target_type = item_type if item_type in ["lost", "found"] else None
    scored = await provider.search(dummy_img_emb, query_emb, candidates, target_type=target_type)

    results = []
    for entry in scored:
        cand = entry["item"]
        txt_sim = entry["txt_sim"]
        if txt_sim >= 0.35: # Similarity threshold
            results.append({
                "id": cand["id"],
                "title": cand.get("title"),
                "type": cand.get("type"),
                "category": cand.get("category"),
                "location": cand.get("location"),
                "description": cand.get("description"),
                "date_time": cand.get("date_time"),
                "similarity": round(txt_sim, 3),
            })

    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:5]


def extract_report_fields_tool(free_text: str) -> Dict[str, Any]:
    """Parse free text into structured report fields using regex/heuristics."""
    text_lower = free_text.lower()
    
    # Category detection
    category = "Other"
    categories = {
        "Wallets & Bags": ["backpack", "bag", "wallet", "purse", "pouch", "suitcase"],
        "Electronics": ["phone", "laptop", "airpods", "headphones", "charger", "iphone", "macbook", "tablet", "ipad"],
        "Keys & Cards": ["key", "card", "id", "license", "badge"],
        "Clothing & Accessories": ["jacket", "hat", "glasses", "sunglasses", "watch", "ring", "hoodie", "umbrella"],
    }
    for cat, keywords in categories.items():
        if any(kw in text_lower for kw in keywords):
            category = cat
            break

    # Location detection
    location = ""
    loc_match = re.search(r'(?:at|near|in|around|by)\s+([a-zA-Z0-9\s]{3,30})(?:\s+around|\s+at|\s+yesterday|\s+today|\.|$)', free_text, re.IGNORECASE)
    if loc_match:
        location = loc_match.group(1).strip()

    # Time detection
    date_time = ""
    time_match = re.search(r'([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?\s*(?:yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)?)', free_text, re.IGNORECASE)
    if time_match:
        date_time = time_match.group(1).strip()

    # Title generation
    words = free_text.split()
    title = " ".join(words[:6]).capitalize() if words else "Item Report"

    return {
        "title": title,
        "category": category,
        "location": location or "Unknown",
        "date_time": date_time or "Recently",
        "description": free_text,
    }


async def explain_match_tool(match_id: str) -> Optional[str]:
    """Reuse existing explanation logic for a confirmed or prospective match."""
    db = get_database()
    if not db:
        return "Database unavailable."

    try:
        match_doc = await db["confirmed_matches"].find_one({"_id": ObjectId(match_id)})
    except Exception:
        match_doc = await db["confirmed_matches"].find_one({"id": match_id})

    if not match_doc:
        return f"No match found with ID '{match_id}'."

    lost_id = match_doc.get("lost_item_id")
    found_id = match_doc.get("found_item_id")

    return f"Confirmed match between Lost Item #{lost_id} and Found Item #{found_id}. Confirmed on {match_doc.get('confirmed_at', 'N/A')}."


async def get_match_status_tool(item_id: str) -> Dict[str, Any]:
    """Retrieve status of an item and its match state."""
    db = get_database()
    if not db:
        return {"status": "unknown", "error": "Database unavailable"}

    item = None
    try:
        item = await db["items"].find_one({"_id": ObjectId(item_id)})
    except Exception:
        item = await db["items"].find_one({"id": item_id})

    if not item:
        return {"status": "not_found", "message": f"No item found with ID {item_id}"}

    status = item.get("status", "active")
    matched_item_id = item.get("matched_item_id")

    return {
        "item_id": str(item["_id"]),
        "title": item.get("title"),
        "type": item.get("type"),
        "status": status,
        "matched_item_id": matched_item_id
    }


async def get_contact_info_tool(match_id: str, requesting_user: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch contact info for confirmed matches with strict ownership check."""
    if not requesting_user:
        return {"error": "not_authorized", "details": "Authentication required."}

    db = get_database()
    if not db:
        return {"error": "unavailable", "details": "Database unavailable."}

    match_doc = None
    try:
        match_doc = await db["confirmed_matches"].find_one({"_id": ObjectId(match_id)})
    except Exception:
        match_doc = await db["confirmed_matches"].find_one({"$or": [{"lost_item_id": match_id}, {"found_item_id": match_id}]})

    if not match_doc:
        return {"error": "not_found", "details": "No confirmed match record found."}

    caller_id = str(requesting_user.get("id"))
    caller_role = requesting_user.get("role", "user")
    involved_ids = {str(match_doc.get("lost_user_id")), str(match_doc.get("found_user_id"))}

    if caller_id not in involved_ids and caller_role != "admin":
        return {"error": "not_authorized", "details": "You are not authorized to view contact details for this match."}

    # Retrieve user documents
    lost_user, found_user = None, None
    if match_doc.get("lost_user_id"):
        try:
            lost_user = await db["users"].find_one({"_id": ObjectId(match_doc["lost_user_id"])})
        except Exception:
            pass
    if match_doc.get("found_user_id"):
        try:
            found_user = await db["users"].find_one({"_id": ObjectId(match_doc["found_user_id"])})
        except Exception:
            pass

    return {
        "reporter": {"name": lost_user.get("name"), "email": lost_user.get("email"), "phone": lost_user.get("phone")} if lost_user else None,
        "finder": {"name": found_user.get("name"), "email": found_user.get("email"), "phone": found_user.get("phone")} if found_user else None,
    }


# --- ASSISTANT GRAPH ORCHESTRATOR ---

async def process_assistant_query(user_message: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
    """Main routing and execution logic for the AI assistant chatbot."""
    text_lower = user_message.lower()

    # Rule 1: Check for Report Draft Intent
    if any(k in text_lower for k in ["i lost", "i found", "report lost", "report found", "lost my", "found a"]):
        draft = extract_report_fields_tool(user_message)
        reply = f"I've prepared a draft report based on your description for a **{draft['category']}** item ({draft['title']}). You can review and submit it using the button below."
        return {"reply": reply, "draft_report": draft, "sources": []}

    # Rule 2: Check for Contact Info Inquiry
    if "contact" in text_lower or "phone" in text_lower or "email" in text_lower:
        match_id_search = re.search(r'(?:match|item)\s*#?\s*([a-f0-9]{24}|\w+)', text_lower)
        if match_id_search:
            m_id = match_id_search.group(1)
            res = await get_contact_info_tool(m_id, current_user)
            if res.get("error") == "not_authorized":
                return {"reply": "You are not authorized to view contact details for this match.", "sources": []}
            elif res.get("error") == "not_found":
                return {"reply": f"No confirmed match found with ID '{m_id}'.", "sources": []}
            else:
                rep = res.get("reporter", {})
                fin = res.get("finder", {})
                return {
                    "reply": f"Contact details for match {m_id}:\n- Reporter: {rep.get('name')} ({rep.get('email')})\n- Finder: {fin.get('name')} ({fin.get('email')})",
                    "sources": [m_id]
                }

    # Rule 3: Search Items Inquiry
    if any(k in text_lower for k in ["find", "search", "looking for", "anyone seen", "is there a", "where is"]):
        item_type = "lost" if "lost" in text_lower else ("found" if "found" in text_lower else "both")
        items = await search_items_tool(user_message, item_type=item_type)
        if not items:
            return {"reply": "I searched our database, but no matching items were found.", "sources": []}
        
        reply_lines = [f"Found {len(items)} matching item(s) in the database:"]
        sources = []
        for it in items:
            reply_lines.append(f"- **{it['title']}** ({it['type'].capitalize()}) at {it['location']} (Similarity: {int(it['similarity']*100)}%)")
            sources.append(it['id'])
        
        return {"reply": "\n".join(reply_lines), "sources": sources}

    # Rule 4: Match Explanation Inquiry
    if "explain" in text_lower or "why match" in text_lower:
        match_id_search = re.search(r'(?:match|item)\s*#?\s*([a-f0-9]{24}|\w+)', text_lower)
        if match_id_search:
            m_id = match_id_search.group(1)
            explanation = await explain_match_tool(m_id)
            return {"reply": explanation, "sources": [m_id]}

    # Rule 5: Status Check Inquiry
    if "status" in text_lower:
        item_id_search = re.search(r'(?:item|report)\s*#?\s*([a-f0-9]{24}|\w+)', text_lower)
        if item_id_search:
            i_id = item_id_search.group(1)
            status_info = await get_match_status_tool(i_id)
            if status_info.get("status") == "not_found":
                return {"reply": f"No item found with ID '{i_id}'.", "sources": []}
            return {
                "reply": f"Item '{status_info.get('title')}' is currently **{status_info.get('status').upper()}**.",
                "sources": [i_id]
            }

    # Rule 6: General Static Knowledge Base
    return {
        "reply": (
            "I'm the FoundIt AI Assistant! You can ask me to:\n"
            "1. **Search items**: 'Find a lost black Nike backpack near library'\n"
            "2. **Draft a report**: 'I lost a blue umbrella yesterday at 4pm'\n"
            "3. **Check status**: 'What is the status of item #<id>?'\n"
            "4. **Explain matches**: 'Explain match #<match_id>'\n\n"
            "All item & match responses are grounded in real database queries."
        ),
        "sources": []
    }
