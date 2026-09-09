from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ScoreBreakdown(BaseModel):
    image_similarity: float
    text_similarity: float
    context_score: float
    total_score: float

class MatchCandidate(BaseModel):
    item_id: str
    target_item: Dict[str, Any]
    score_breakdown: ScoreBreakdown
    explanation: str
    match_status: str = "pending"  # pending, confirmed, rejected

class MatchResponse(BaseModel):
    source_item_id: str
    candidates: List[MatchCandidate]
