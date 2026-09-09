from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from services.db import connect_db, close_db
from routes import auth, lost, found, match, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting FoundIt Backend Server with Admin Panel & RBAC...")
    await connect_db()
    yield
    await close_db()
    print("Shutting down FoundIt Backend Server...")

app = FastAPI(
    title="FoundIt AI - Lost & Found Matching Platform API",
    description="Multimodal AI-powered lost and found matching service with Admin Panel RBAC",
    version="1.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(lost.router)
app.include_router(found.router)
app.include_router(match.router)
app.include_router(admin.router)

@app.get("/")
async def root():
    return {
        "app": "FoundIt AI",
        "status": "online",
        "features": ["Auth", "Lost/Found CRUD", "Multimodal AI Matching", "Admin Panel & RBAC"]
    }
