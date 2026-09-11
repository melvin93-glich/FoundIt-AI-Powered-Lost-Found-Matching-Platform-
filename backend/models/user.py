from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "user"  # Defaults to regular user
    phone: Optional[str] = None
    preferred_contact: str = "email"  # "email" | "phone" | "both"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str = "user"
    created_at: datetime
    items_count: Optional[int] = 0
    phone: Optional[str] = None
    preferred_contact: str = "email"

class UserProfileUpdate(BaseModel):
    """Partial update for user profile — only provided fields are written."""
    name: Optional[str] = None
    phone: Optional[str] = None
    preferred_contact: Optional[str] = None  # "email" | "phone" | "both"

class ContactInfo(BaseModel):
    """Minimal contact payload returned after a confirmed match.

    Never includes password_hash, role, or other internal account fields.
    """
    name: str
    email: str
    phone: Optional[str] = None
    preferred_contact: str = "email"

class UserRoleUpdate(BaseModel):
    role: str  # "user" or "admin"

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
