from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class AdminActionCreate(BaseModel):
    admin_id: str
    admin_name: str
    action: str  # e.g., "create_on_behalf", "delete_user", "update_role", "edit_item", "delete_item", "cascade_delete_matches", "override_match"
    target_type: str  # "user", "lost_item", "found_item", "match"
    target_id: str
    affected_user_id: Optional[str] = None
    details: Optional[str] = ""

class AdminActionResponse(BaseModel):
    id: str
    admin_id: str
    admin_name: str
    action: str
    target_type: str
    target_id: str
    affected_user_id: Optional[str] = None
    details: Optional[str] = ""
    timestamp: datetime
