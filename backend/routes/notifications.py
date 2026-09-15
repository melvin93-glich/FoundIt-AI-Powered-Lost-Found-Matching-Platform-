from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from services.auth_service import get_current_user
from services.db import get_database

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: str
    related_match_id: Optional[str] = None
    read: bool
    created_at: datetime

class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int

@router.get("", response_model=NotificationListResponse)
async def get_user_notifications(current_user: dict = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to fetch notifications"
        )

    user_id = str(current_user["id"])
    db = get_database()

    notifications = []
    unread_count = 0

    if db is not None:
        cursor = db["notifications"].find({"user_id": user_id}).sort("created_at", -1).limit(50)
        async for doc in cursor:
            is_read = doc.get("read", False)
            if not is_read:
                unread_count += 1
            notifications.append(
                NotificationResponse(
                    id=str(doc["_id"]),
                    user_id=doc.get("user_id", user_id),
                    type=doc.get("type", "match_found"),
                    title=doc.get("title", "Notification"),
                    message=doc.get("message", ""),
                    related_match_id=doc.get("related_match_id"),
                    read=is_read,
                    created_at=doc.get("created_at", datetime.utcnow())
                )
            )

    return NotificationListResponse(
        notifications=notifications,
        unread_count=unread_count
    )

@router.patch("/{id}/read", response_model=dict)
async def mark_notification_read(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    user_id = str(current_user["id"])
    db = get_database()

    if db is not None:
        try:
            result = await db["notifications"].update_one(
                {"_id": ObjectId(id), "user_id": user_id},
                {"$set": {"read": True}}
            )
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Notification not found")
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=400, detail="Invalid notification ID")

    return {"message": "Notification marked as read"}

@router.patch("/read-all", response_model=dict)
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    user_id = str(current_user["id"])
    db = get_database()

    if db is not None:
        await db["notifications"].update_many(
            {"user_id": user_id, "read": False},
            {"$set": {"read": True}}
        )

    return {"message": "All notifications marked as read"}
