from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict

from services.auth_service import get_current_user
from services.db import get_database
from ai.assistant_graph import process_assistant_query

router = APIRouter(prefix="/assistant", tags=["AI Assistant"])

# Simple in-memory sliding window rate limiter (15 requests/minute per user)
RATE_LIMIT_WINDOW = 60 # seconds
MAX_REQUESTS_PER_WINDOW = 15
user_request_history: Dict[str, List[datetime]] = defaultdict(list)

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    conversation_id: Optional[str] = None

class DraftReport(BaseModel):
    title: str
    category: str
    location: str
    date_time: str
    description: str

class ChatResponse(BaseModel):
    reply: str
    draft_report: Optional[DraftReport] = None
    sources: List[str] = Field(default_factory=list)
    conversation_id: str

@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    req: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to use AI Assistant"
        )

    user_id = str(current_user["id"])
    now = datetime.utcnow()

    # Rate Limiting Check
    user_times = user_request_history[user_id]
    # Prune old entries
    cutoff = now - timedelta(seconds=RATE_LIMIT_WINDOW)
    user_request_history[user_id] = [t for t in user_times if t > cutoff]
    
    if len(user_request_history[user_id]) >= MAX_REQUESTS_PER_WINDOW:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait a minute before sending more messages."
        )

    user_request_history[user_id].append(now)

    conv_id = req.conversation_id or f"conv_{user_id}_{int(now.timestamp())}"

    # Process query through grounded Assistant Graph
    result = await process_assistant_query(req.message, current_user)

    # Persist in assistant_conversations collection
    db = get_database()
    if db is not None:
        await db["assistant_conversations"].insert_one({
            "user_id": user_id,
            "conversation_id": conv_id,
            "user_message": req.message,
            "assistant_reply": result["reply"],
            "draft_report": result.get("draft_report"),
            "sources": result.get("sources", []),
            "timestamp": now,
        })

    draft_report_obj = None
    if result.get("draft_report"):
        draft_report_obj = DraftReport(**result["draft_report"])

    return ChatResponse(
        reply=result["reply"],
        draft_report=draft_report_obj,
        sources=result.get("sources", []),
        conversation_id=conv_id
    )
