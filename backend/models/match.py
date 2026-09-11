from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class ScoreBreakdown(BaseModel):
    image_similarity: Optional[float] = None
    text_similarity: float
    context_score: float
    total_score: float
    image_available: bool = True


class MatchCandidate(BaseModel):
    item_id: str
    target_item: Dict[str, Any]
    score_breakdown: ScoreBreakdown
    explanation: str
    match_status: str = "pending"  # pending, confirmed, rejected


class MatchResponse(BaseModel):
    source_item_id: str
    candidates: List[MatchCandidate]


class ContactInfo(BaseModel):
    """Minimal contact payload — never includes password or internal fields."""
    name: str
    email: str
    phone: Optional[str] = None
    preferred_contact: str = "email"


class ConfirmMatchResponse(BaseModel):
    message: str
    reporter_contact: Optional[ContactInfo] = None
    finder_contact: Optional[ContactInfo] = None
    confirmed_at: Optional[datetime] = None


class MatchContactsResponse(BaseModel):
    """Returned by GET /match/{item_id}/contacts for already-confirmed matches."""
    reporter_contact: ContactInfo
    finder_contact: ContactInfo
    confirmed_at: datetime
    lost_item_id: str
    found_item_id: str
