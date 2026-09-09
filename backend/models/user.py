from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "user"  # Defaults to regular user

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

class UserRoleUpdate(BaseModel):
    role: str  # "user" or "admin"

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
