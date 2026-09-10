from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import Optional, List
from starlette.concurrency import run_in_threadpool
from config import settings
from models.item import ItemResponse
from services.auth_service import get_current_user
from services.cloudinary_service import upload_image_to_cloudinary
from services.upload_validator import validate_image_upload
from services.db import get_database
from ai.clip_model import clip_service
from ai.text_model import text_service
from ai.yolo_model import yolo_service
from ai.ocr import ocr_service
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/lost", tags=["Lost Items"])

@router.post("", response_model=ItemResponse)
async def create_lost_item(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    location: str = Form(...),
    date_time: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user=Depends(get_current_user)
):
    image_url = None
    file_bytes = None
    if file:
        file_bytes = await file.read()
        # Upload validation: 8MB max size & JPEG/PNG/WEBP magic signature check
        validate_image_upload(file_bytes, file.filename)
        image_url = await upload_image_to_cloudinary(file_bytes, file.filename)

    user_id = current_user["id"] if current_user else "guest_user"
    user_name = current_user["name"] if current_user else "Guest"

    # Non-blocking AI Inference using run_in_threadpool
    detected_objects = await run_in_threadpool(yolo_service.detect_objects, file_bytes) if file_bytes else []
    extracted_text = await run_in_threadpool(ocr_service.extract_text, file_bytes) if file_bytes else ""
    
    query_text = f"{title} {description} {category} {' '.join(detected_objects)} {extracted_text}"
    text_embedding = await run_in_threadpool(text_service.get_text_embedding, query_text)
    image_embedding = await run_in_threadpool(clip_service.get_image_embedding, file_bytes) if file_bytes else [0.0]*512

    doc = {
        "type": "lost",
        "user_id": user_id,
        "user_name": user_name,
        "title": title,
        "description": description,
        "category": category,
        "location": location,
        "date_time": date_time,
        "image_url": image_url,
        "status": "active",
        "deleted": False,
        "detected_objects": detected_objects,
        "extracted_text": extracted_text,
        "text_embedding": text_embedding,
        "image_embedding": image_embedding,
        "embedding_model_version": settings.EMBEDDING_MODEL_VERSION,
        "created_at": datetime.utcnow()
    }

    db = get_database()
    if db is not None:
        res = await db["items"].insert_one(doc)
        item_id = str(res.inserted_id)
    else:
        item_id = f"lost_{int(datetime.utcnow().timestamp())}"

    return ItemResponse(
        id=item_id,
        type="lost",
        user_id=user_id,
        user_name=user_name,
        title=title,
        description=description,
        category=category,
        location=location,
        date_time=date_time,
        image_url=image_url,
        status="active",
        detected_objects=detected_objects,
        extracted_text=extracted_text,
        created_at=datetime.utcnow()
    )

@router.get("", response_model=List[ItemResponse])
async def list_lost_items():
    db = get_database()
    items = []
    if db is not None:
        # Exclude soft-deleted items
        cursor = db["items"].find({"type": "lost", "deleted": {"$ne": True}}).sort("created_at", -1)
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            items.append(ItemResponse(**doc))
    return items

@router.get("/{item_id}", response_model=ItemResponse)
async def get_lost_item(item_id: str):
    db = get_database()
    if db is not None:
        try:
            doc = await db["items"].find_one({"_id": ObjectId(item_id), "type": "lost", "deleted": {"$ne": True}})
            if doc:
                doc["id"] = str(doc["_id"])
                return ItemResponse(**doc)
        except Exception:
            pass
    raise HTTPException(status_code=404, detail="Lost item not found")

@router.delete("/{item_id}")
async def delete_lost_item(item_id: str, current_user=Depends(get_current_user)):
    """
    User endpoint to soft-delete their lost item.
    Sets deleted: true and timestamp instead of removing the document.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    db = get_database()
    if db is not None:
        try:
            obj_id = ObjectId(item_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid item ID format")

        item = await db["items"].find_one({"_id": obj_id, "type": "lost", "deleted": {"$ne": True}})
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Verify ownership server-side
        if item.get("user_id") != current_user["id"] and current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Not authorized to delete this item")

        # Soft Delete Item
        await db["items"].update_one(
            {"_id": obj_id},
            {"$set": {"deleted": True, "deleted_at": datetime.utcnow(), "status": "deleted"}}
        )

        # Clean up associated match records
        await db["matches"].delete_many({
            "$or": [{"source_item_id": item_id}, {"target_item_id": item_id}]
        })

    return {"message": "Item soft-deleted successfully"}
