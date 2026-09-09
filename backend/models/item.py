from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ItemCreate(BaseModel):
    title: str
    description: str
    category: str
    location: str
    date_time: str
    image_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class ItemResponse(BaseModel):
    id: str
    type: str  # "lost" or "found"
    user_id: str
    user_name: str
    title: str
    description: str
    category: str
    location: str
    date_time: str
    image_url: Optional[str] = None
    status: str = "active"  # "active", "matched", "claimed"
    detected_objects: List[str] = []
    extracted_text: Optional[str] = ""
    created_at: datetime
    matched_item_id: Optional[str] = None
    created_by_admin: Optional[bool] = False
