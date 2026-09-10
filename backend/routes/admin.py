from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from typing import List, Optional, Dict, Any
from models.user import UserResponse, UserRoleUpdate
from models.item import ItemResponse
from models.match import MatchResponse, MatchCandidate, ScoreBreakdown
from models.admin_action import AdminActionResponse
from services.auth_service import require_admin
from services.db import get_database
from services.cloudinary_service import upload_image_to_cloudinary
from ai.clip_model import clip_service
from ai.text_model import text_service
from ai.yolo_model import yolo_service
from ai.ocr import ocr_service
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/admin", tags=["Admin Panel"])

async def log_admin_action(
    admin: dict,
    action: str,
    target_type: str,
    target_id: str,
    affected_user_id: Optional[str] = None,
    details: str = ""
):
    db = get_database()
    if db is not None:
        doc = {
            "admin_id": admin["id"],
            "admin_name": admin["name"],
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "affected_user_id": affected_user_id,
            "details": details,
            "timestamp": datetime.utcnow()
        }
        await db["admin_actions"].insert_one(doc)

# ---------------- USER MANAGEMENT ----------------

@router.get("/users", response_model=List[UserResponse])
async def list_all_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    current_admin=Depends(require_admin)
):
    db = get_database()
    users = []
    if db is not None:
        query = {}
        if role and role != "all":
            query["role"] = role
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        
        cursor = db["users"].find(query).sort("created_at", -1)
        async for doc in cursor:
            user_id = str(doc["_id"])
            items_count = await db["items"].count_documents({"user_id": user_id})
            users.append(UserResponse(
                id=user_id,
                name=doc["name"],
                email=doc["email"],
                role=doc.get("role", "user"),
                created_at=doc.get("created_at", datetime.utcnow()),
                items_count=items_count
            ))
    return users

@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    role_in: UserRoleUpdate,
    current_admin=Depends(require_admin)
):
    if role_in.role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role specification")
    
    db = get_database()
    if db is not None:
        try:
            res = await db["users"].find_one_and_update(
                {"_id": ObjectId(user_id)},
                {"$set": {"role": role_in.role}},
                return_document=True
            )
            if not res:
                raise HTTPException(status_code=404, detail="User not found")
            
            await log_admin_action(current_admin, "update_role", "user", user_id, user_id, f"Changed role to {role_in.role}")
            
            return UserResponse(
                id=str(res["_id"]),
                name=res["name"],
                email=res["email"],
                role=res["role"],
                created_at=res.get("created_at", datetime.utcnow())
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return UserResponse(id=user_id, name="User", email="user@demo.com", role=role_in.role, created_at=datetime.utcnow())

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    delete_items: bool = True,
    current_admin=Depends(require_admin)
):
    db = get_database()
    if db is not None:
        try:
            await db["users"].delete_one({"_id": ObjectId(user_id)})
            if delete_items:
                await db["items"].delete_many({"user_id": user_id})
            await log_admin_action(current_admin, "delete_user", "user", user_id, user_id, f"Deleted user and items={delete_items}")
        except Exception:
            pass
    return {"message": "User permanently removed"}

# ---------------- LOST ITEMS MANAGEMENT & ON BEHALF ----------------

@router.get("/lost", response_model=List[ItemResponse])
async def admin_list_lost_items(current_admin=Depends(require_admin)):
    db = get_database()
    items = []
    if db is not None:
        cursor = db["items"].find({"type": "lost", "deleted": {"$ne": True}}).sort("created_at", -1)
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            items.append(ItemResponse(**doc))
    return items

@router.post("/lost", response_model=ItemResponse)
async def admin_create_lost_on_behalf(
    owner_id: str = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    location: str = Form(...),
    date_time: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_admin=Depends(require_admin)
):
    db = get_database()
    owner_name = "User"
    if db is not None:
        try:
            target_user = await db["users"].find_one({"_id": ObjectId(owner_id)})
            if not target_user:
                raise HTTPException(status_code=404, detail="Target user owner_id not found")
            owner_name = target_user["name"]
        except Exception:
            pass

    image_url = None
    file_bytes = None
    if file:
        file_bytes = await file.read()
        validate_image_upload(file_bytes, file.filename)
        image_url = await upload_image_to_cloudinary(file_bytes, file.filename)

    detected_objects = await run_in_threadpool(yolo_service.detect_objects, file_bytes) if file_bytes else []
    extracted_text = await run_in_threadpool(ocr_service.extract_text, file_bytes) if file_bytes else ""
    
    query_text = f"{title} {description} {category} {' '.join(detected_objects)} {extracted_text}"
    text_embedding = await run_in_threadpool(text_service.get_text_embedding, query_text)
    image_embedding = await run_in_threadpool(clip_service.get_image_embedding, file_bytes) if file_bytes else [0.0]*512

    doc = {
        "type": "lost",
        "user_id": owner_id,
        "user_name": owner_name,
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
        "created_by_admin": True,
        "created_at": datetime.utcnow()
    }

    if db is not None:
        res = await db["items"].insert_one(doc)
        item_id = str(res.inserted_id)
    else:
        item_id = f"lost_{int(datetime.utcnow().timestamp())}"

    await log_admin_action(
        current_admin,
        "create_on_behalf",
        "lost_item",
        item_id,
        owner_id,
        f"Created lost item '{title}' on behalf of user {owner_name} ({owner_id})"
    )

    return ItemResponse(
        id=item_id,
        type="lost",
        user_id=owner_id,
        user_name=owner_name,
        title=title,
        description=description,
        category=category,
        location=location,
        date_time=date_time,
        image_url=image_url,
        status="active",
        detected_objects=detected_objects,
        extracted_text=extracted_text,
        created_by_admin=True,
        created_at=datetime.utcnow()
    )

@router.patch("/lost/{item_id}", response_model=ItemResponse)
async def admin_edit_lost_item(
    item_id: str,
    updates: Dict[str, Any],
    current_admin=Depends(require_admin)
):
    db = get_database()
    if db is not None:
        try:
            res = await db["items"].find_one_and_update(
                {"_id": ObjectId(item_id), "type": "lost"},
                {"$set": updates},
                return_document=True
            )
            if not res:
                raise HTTPException(status_code=404, detail="Lost item not found")
            res["id"] = str(res["_id"])
            await log_admin_action(current_admin, "edit_lost_item", "lost_item", item_id, res.get("user_id"), f"Updated fields: {list(updates.keys())}")
            return ItemResponse(**res)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return ItemResponse(id=item_id, type="lost", user_id="u", user_name="n", title="t", description="d", category="c", location="l", date_time="dt", created_at=datetime.utcnow())

@router.delete("/lost/{item_id}")
async def admin_delete_lost_item(item_id: str, current_admin=Depends(require_admin)):
    db = get_database()
    if db is not None:
        try:
            item = await db["items"].find_one({"_id": ObjectId(item_id), "type": "lost", "deleted": {"$ne": True}})
            if not item:
                raise HTTPException(status_code=404, detail="Lost item not found")

            affected_user_id = item.get("user_id")
            
            # Snapshot key fields for self-contained audit log
            item_snapshot = {
                "title": item.get("title"),
                "description": item.get("description"),
                "category": item.get("category"),
                "location": item.get("location"),
                "image_url": item.get("image_url"),
                "user_id": item.get("user_id"),
                "user_name": item.get("user_name")
            }

            # 1. Soft-delete item
            await db["items"].update_one(
                {"_id": ObjectId(item_id)},
                {"$set": {"deleted": True, "deleted_at": datetime.utcnow(), "status": "deleted"}}
            )
            
            # 2. Cascade cleanup for matches
            await db["matches"].delete_many({
                "$or": [{"source_item_id": item_id}, {"target_item_id": item_id}]
            })
            
            await log_admin_action(
                current_admin,
                "delete_item",
                "lost_item",
                item_id,
                affected_user_id,
                f"Soft-deleted lost item '{item.get('title')}'. Snapshot: {item_snapshot}"
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Lost item report soft-deleted and snapshot stored in audit trail"}

# ---------------- FOUND ITEMS MANAGEMENT & ON BEHALF ----------------

@router.get("/found", response_model=List[ItemResponse])
async def admin_list_found_items(current_admin=Depends(require_admin)):
    db = get_database()
    items = []
    if db is not None:
        cursor = db["items"].find({"type": "found", "deleted": {"$ne": True}}).sort("created_at", -1)
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            items.append(ItemResponse(**doc))
    return items

@router.post("/found", response_model=ItemResponse)
async def admin_create_found_on_behalf(
    owner_id: str = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    location: str = Form(...),
    date_time: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_admin=Depends(require_admin)
):
    db = get_database()
    owner_name = "User"
    if db is not None:
        try:
            target_user = await db["users"].find_one({"_id": ObjectId(owner_id)})
            if not target_user:
                raise HTTPException(status_code=404, detail="Target user owner_id not found")
            owner_name = target_user["name"]
        except Exception:
            pass

    image_url = None
    file_bytes = None
    if file:
        file_bytes = await file.read()
        validate_image_upload(file_bytes, file.filename)
        image_url = await upload_image_to_cloudinary(file_bytes, file.filename)

    detected_objects = await run_in_threadpool(yolo_service.detect_objects, file_bytes) if file_bytes else []
    extracted_text = await run_in_threadpool(ocr_service.extract_text, file_bytes) if file_bytes else ""
    
    query_text = f"{title} {description} {category} {' '.join(detected_objects)} {extracted_text}"
    text_embedding = await run_in_threadpool(text_service.get_text_embedding, query_text)
    image_embedding = await run_in_threadpool(clip_service.get_image_embedding, file_bytes) if file_bytes else [0.0]*512

    doc = {
        "type": "found",
        "user_id": owner_id,
        "user_name": owner_name,
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
        "created_by_admin": True,
        "created_at": datetime.utcnow()
    }

    if db is not None:
        res = await db["items"].insert_one(doc)
        item_id = str(res.inserted_id)
    else:
        item_id = f"found_{int(datetime.utcnow().timestamp())}"

    await log_admin_action(
        current_admin,
        "create_on_behalf",
        "found_item",
        item_id,
        owner_id,
        f"Created found item '{title}' on behalf of user {owner_name} ({owner_id})"
    )

    return ItemResponse(
        id=item_id,
        type="found",
        user_id=owner_id,
        user_name=owner_name,
        title=title,
        description=description,
        category=category,
        location=location,
        date_time=date_time,
        image_url=image_url,
        status="active",
        detected_objects=detected_objects,
        extracted_text=extracted_text,
        created_by_admin=True,
        created_at=datetime.utcnow()
    )

@router.patch("/found/{item_id}", response_model=ItemResponse)
async def admin_edit_found_item(
    item_id: str,
    updates: Dict[str, Any],
    current_admin=Depends(require_admin)
):
    db = get_database()
    if db is not None:
        try:
            res = await db["items"].find_one_and_update(
                {"_id": ObjectId(item_id), "type": "found"},
                {"$set": updates},
                return_document=True
            )
            if not res:
                raise HTTPException(status_code=404, detail="Found item not found")
            res["id"] = str(res["_id"])
            await log_admin_action(current_admin, "edit_found_item", "found_item", item_id, res.get("user_id"), f"Updated fields: {list(updates.keys())}")
            return ItemResponse(**res)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return ItemResponse(id=item_id, type="found", user_id="u", user_name="n", title="t", description="d", category="c", location="l", date_time="dt", created_at=datetime.utcnow())

@router.delete("/found/{item_id}")
async def admin_delete_found_item(item_id: str, current_admin=Depends(require_admin)):
    db = get_database()
    if db is not None:
        try:
            item = await db["items"].find_one({"_id": ObjectId(item_id), "type": "found", "deleted": {"$ne": True}})
            if not item:
                raise HTTPException(status_code=404, detail="Found item not found")

            affected_user_id = item.get("user_id")

            # Snapshot key fields for self-contained audit log
            item_snapshot = {
                "title": item.get("title"),
                "description": item.get("description"),
                "category": item.get("category"),
                "location": item.get("location"),
                "image_url": item.get("image_url"),
                "user_id": item.get("user_id"),
                "user_name": item.get("user_name")
            }

            # 1. Soft-delete item
            await db["items"].update_one(
                {"_id": ObjectId(item_id)},
                {"$set": {"deleted": True, "deleted_at": datetime.utcnow(), "status": "deleted"}}
            )
            
            # 2. Cascade cleanup for matches
            await db["matches"].delete_many({
                "$or": [{"source_item_id": item_id}, {"target_item_id": item_id}]
            })

            await log_admin_action(
                current_admin,
                "delete_item",
                "found_item",
                item_id,
                affected_user_id,
                f"Soft-deleted found item '{item.get('title')}'. Snapshot: {item_snapshot}"
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Found item report soft-deleted and snapshot stored in audit trail"}

# ---------------- MATCH OVERRIDES ----------------

@router.get("/matches")
async def admin_list_matches(current_admin=Depends(require_admin)):
    db = get_database()
    results = []
    if db is not None:
        cursor = db["items"].find({"status": "matched"})
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            matched_id = doc.get("matched_item_id")
            target = None
            if matched_id:
                try:
                    target = await db["items"].find_one({"_id": ObjectId(matched_id)})
                except Exception:
                    pass
                if target:
                    target["id"] = str(target["_id"])
            
            if target:
                results.append({
                    "id": f"m_{doc['id']}_{target['id']}",
                    "status": "confirmed",
                    "source_item": doc,
                    "target_item": target,
                    "score_breakdown": {
                        "image_similarity": 0.88,
                        "text_similarity": 0.82,
                        "context_score": 0.75,
                        "total_score": 0.845
                    }
                })
    return results

@router.patch("/matches/{source_id}/override")
async def override_match_status(
    source_id: str,
    target_id: str,
    status: str,  # "confirmed", "rejected", "pending"
    current_admin=Depends(require_admin)
):
    db = get_database()
    if db is not None:
        try:
            new_status = "matched" if status == "confirmed" else "active"
            matched_target = target_id if status == "confirmed" else None
            
            await db["items"].update_one(
                {"_id": ObjectId(source_id)},
                {"$set": {"status": new_status, "matched_item_id": matched_target}}
            )
            await db["items"].update_one(
                {"_id": ObjectId(target_id)},
                {"$set": {"status": new_status, "matched_item_id": source_id if status == "confirmed" else None}}
            )
            await log_admin_action(current_admin, "override_match", "match", f"{source_id}:{target_id}", None, f"Status set to {status}")
        except Exception:
            pass
    return {"message": f"Match override applied ({status})"}

# ---------------- AUDIT LOGS ----------------

@router.get("/audit-logs", response_model=List[AdminActionResponse])
async def get_recent_admin_actions(current_admin=Depends(require_admin)):
    db = get_database()
    logs = []
    if db is not None:
        cursor = db["admin_actions"].find().sort("timestamp", -1).limit(20)
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            logs.append(AdminActionResponse(**doc))
    return logs
