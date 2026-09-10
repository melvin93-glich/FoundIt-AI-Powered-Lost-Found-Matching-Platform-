from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from services.db import connect_db, close_db
from routes import auth, lost, found, match, admin

import time
from starlette.concurrency import run_in_threadpool
from config import settings
from ai.clip_model import clip_service
from ai.text_model import text_service
from ai.yolo_model import yolo_service
from ai.ocr import ocr_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting FoundIt Backend Server with Admin Panel & RBAC...")
    await connect_db()

    # Cloudinary configuration check & warning banner
    if not settings.CLOUDINARY_CLOUD_NAME or settings.CLOUDINARY_CLOUD_NAME.lower() in ["demo", "required_your_cloudinary_cloud_name"]:
        print("\n==========================================================================")
        print("⚠ WARNING: Cloudinary not configured properly (using demo/unset credentials).")
        print("   Uploads will rely on fallback placeholder URLs until configured!")
        print("==========================================================================\n")

    # Model Warm-up on Startup
    print("\n--- Starting AI Model Warm-up Pipeline ---")
    start_time = time.time()

    # 1. Warm-up CLIP
    t0 = time.time()
    from PIL import Image
    dummy_img = Image.new("RGB", (224, 224), color="white")
    await run_in_threadpool(clip_service.get_image_embedding, dummy_img)
    print(f"✓ CLIP Model warmed up in {round(time.time() - t0, 2)}s")

    # 2. Warm-up BGE
    t0 = time.time()
    await run_in_threadpool(text_service.get_text_embedding, "warmup sample text")
    print(f"✓ BGE Text Model warmed up in {round(time.time() - t0, 2)}s")

    # 3. Warm-up YOLOv8n
    t0 = time.time()
    await run_in_threadpool(yolo_service.detect_objects, None)
    print(f"✓ YOLOv8n Model warmed up in {round(time.time() - t0, 2)}s")

    # 4. Warm-up EasyOCR
    t0 = time.time()
    await run_in_threadpool(ocr_service.extract_text, None)
    print(f"✓ EasyOCR Model warmed up in {round(time.time() - t0, 2)}s")

    total_warmup = round(time.time() - start_time, 2)
    print(f"--- AI Models Warm-up Complete! Total time: {total_warmup}s ---\n")

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
