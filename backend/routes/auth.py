from fastapi import APIRouter, HTTPException, status, Depends
from models.user import UserRegister, UserLogin, UserResponse, Token, UserProfileUpdate
from services.auth_service import get_password_hash, verify_password, create_access_token, get_current_user
from services.db import get_database
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=Token)
async def register(user_in: UserRegister):
    db = get_database()
    # Force public registration path to role="user" regardless of payload input
    user_role = "user"
    
    if db is not None:
        existing = await db["users"].find_one({"email": user_in.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        user_doc = {
            "name": user_in.name,
            "email": user_in.email,
            "password_hash": get_password_hash(user_in.password),
            "role": user_role,
            "phone": user_in.phone,
            "preferred_contact": user_in.preferred_contact or "email",
            "created_at": datetime.utcnow()
        }
        res = await db["users"].insert_one(user_doc)
        user_id = str(res.inserted_id)
    else:
        user_id = "demo_user_123"

    user_resp = UserResponse(
        id=user_id,
        name=user_in.name,
        email=user_in.email,
        role=user_role,
        phone=user_in.phone,
        preferred_contact=user_in.preferred_contact or "email",
        created_at=datetime.utcnow()
    )
    access_token = create_access_token(data={"sub": user_in.email, "role": user_role})
    return Token(access_token=access_token, user=user_resp)

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    db = get_database()
    if db is not None:
        user = await db["users"].find_one({"email": credentials.email})
        if not user or not verify_password(credentials.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user_role = user.get("role", "user")
        user_resp = UserResponse(
            id=str(user["_id"]),
            name=user["name"],
            email=user["email"],
            role=user_role,
            phone=user.get("phone"),
            preferred_contact=user.get("preferred_contact", "email"),
            created_at=user.get("created_at", datetime.utcnow())
        )
    else:
        user_role = "admin" if "admin" in credentials.email.lower() else "user"
        user_resp = UserResponse(
            id="demo_user_123",
            name="Demo User",
            email=credentials.email,
            role=user_role,
            created_at=datetime.utcnow()
        )
    
    access_token = create_access_token(data={"sub": credentials.email, "role": user_role})
    return Token(access_token=access_token, user=user_resp)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user.get("role", "user"),
        phone=current_user.get("phone"),
        preferred_contact=current_user.get("preferred_contact", "email"),
        created_at=current_user.get("created_at", datetime.utcnow())
    )

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    updates: UserProfileUpdate,
    current_user=Depends(get_current_user),
):
    """Update the logged-in user's profile (name, phone, preferred_contact)."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Build $set dict from only the fields the client actually sent
    set_fields = {}
    if updates.name is not None:
        set_fields["name"] = updates.name
    if updates.phone is not None:
        set_fields["phone"] = updates.phone
    if updates.preferred_contact is not None:
        if updates.preferred_contact not in ("email", "phone", "both"):
            raise HTTPException(
                status_code=422,
                detail="preferred_contact must be 'email', 'phone', or 'both'",
            )
        set_fields["preferred_contact"] = updates.preferred_contact

    if not set_fields:
        raise HTTPException(status_code=422, detail="No fields to update")

    db = get_database()
    if db is not None:
        await db["users"].update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": set_fields},
        )
        # Re-fetch to return the updated document
        updated = await db["users"].find_one({"_id": ObjectId(current_user["id"])})
        updated["id"] = str(updated["_id"])
    else:
        # Demo fallback
        updated = {**current_user, **set_fields}

    return UserResponse(
        id=updated["id"],
        name=updated["name"],
        email=updated["email"],
        role=updated.get("role", "user"),
        phone=updated.get("phone"),
        preferred_contact=updated.get("preferred_contact", "email"),
        created_at=updated.get("created_at", datetime.utcnow()),
    )
