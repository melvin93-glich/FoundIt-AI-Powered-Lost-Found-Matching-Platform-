import asyncio
import sys
import os

# Add parent directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.db import connect_db, get_database, close_db
from services.auth_service import get_password_hash

async def seed_admin(name: str, email: str, password: str):
    print(f"Seeding Admin User: {name} ({email})...")
    await connect_db()
    db = get_database()
    
    if db is None:
        print("Error: Could not connect to MongoDB. Check MONGODB_URL in backend/.env")
        return

    existing = await db["users"].find_one({"email": email})
    if existing:
        res = await db["users"].update_one(
            {"email": email},
            {"$set": {"role": "admin", "password_hash": get_password_hash(password)}}
        )
        print(f"Promoted existing user '{email}' to role='admin'.")
    else:
        doc = {
            "name": name,
            "email": email,
            "password_hash": get_password_hash(password),
            "role": "admin",
            "created_at": os.getenv("CREATED_AT") or "2026-09-08T00:00:00Z"
        }
        res = await db["users"].insert_one(doc)
        print(f"Created new admin user with ID: {res.inserted_id}")

    await close_db()
    print("Admin seeding completed successfully.")

if __name__ == "__main__":
    admin_name = sys.argv[1] if len(sys.argv) > 1 else "System Admin"
    admin_email = sys.argv[2] if len(sys.argv) > 2 else "admin@foundit.org"
    admin_password = sys.argv[3] if len(sys.argv) > 3 else "AdminSecurePass123!"

    asyncio.run(seed_admin(admin_name, admin_email, admin_password))
