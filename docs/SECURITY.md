# 🔐 Security Implementation Summary

This document provides a plain-language summary of the security architecture and access control mechanisms implemented across the FoundIt backend API.

---

## 1. Password Hashing
- **Algorithm**: Passlib with `bcrypt` (version `4.0.1`).
- **Salt & Security**: Passwords are automatically salted and hashed prior to database persistence. Plaintext passwords are never stored or logged anywhere in the application lifecycle.

```python
# Function Signature (services/auth_service.py)
def get_password_hash(password: str) -> str:
    ...

def verify_password(plain_password: str, hashed_password: str) -> bool:
    ...
```

---

## 2. JSON Web Token (JWT) Authentication
- **Algorithm**: `HS256` symmetric signing key configured via `JWT_SECRET` in environment settings.
- **Claims Included**:
  - `sub`: Unique user ID.
  - `email`: User's registered email address.
  - `role`: Authorization role (`"user"` or `"admin"`).
  - `exp`: Expiration timestamp (default: 24 hours / 1440 minutes).

```python
# Function Signature (services/auth_service.py)
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    ...
```

---

## 3. Dependency Injection & Protected Route Declarations

FastAPI dependency injection (`Depends`) enforces authentication and authorization headers before executing route logic.

### Regular Authenticated User Dependency
Decodes the Bearer JWT, verifies signature & expiration, and injects the authenticated user dict:

```python
# Function Signature (services/auth_service.py)
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    ...
```

### Protected User Route Example
```python
# Function Signature (routes/lost.py)
@router.post("", response_model=ItemResponse)
async def create_lost_item(
    ...,
    current_user=Depends(get_current_user)
):
    ...
```

### Admin Only Authorization Dependency
Decodes the JWT, verifies `role == "admin"`, and raises `HTTP 403 Forbidden` if a regular user attempts access:

```python
# Function Signature (services/auth_service.py)
async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    ...
```

### Protected Admin Route Example
```python
# Function Signature (routes/admin.py)
@router.get("/users", response_model=List[UserResponse])
async def list_all_users(
    ...,
    current_admin=Depends(require_admin)
):
    ...
```

---

## 4. Ownership Verification & Server-Side Authorization

On mutation routes (`DELETE` / `PATCH`), server-side validation ensures users can only modify their own items:

- **User Verification**: `item.user_id == current_user.id`
- **Admin Override**: Users with `role == "admin"` bypass ownership checks via `require_admin`.

```python
# Ownership Check Logic (routes/lost.py & routes/found.py)
if item.get("user_id") != current_user["id"] and current_user.get("role") != "admin":
    raise HTTPException(status_code=403, detail="Not authorized to delete this item")
```
