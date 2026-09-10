# 🛡️ FoundIt Production Hardening Summary (PATCHES.md)

This document details all 8 production hardening patches implemented across the backend, frontend, database, and AI engine in the FoundIt platform.

---

### 1. Model Warm-Up on Startup
- **Implementation**: Updated `backend/app.py` lifespan context manager to run dummy inference calls across all 4 AI models (**CLIP**, **BGE**, **YOLOv8n**, **EasyOCR**) during server boot before listening for incoming HTTP requests.
- **Benefits**: Eliminates the 5–15s cold-start latency delay for the first user. Logs warmup timing per model and total startup time.

### 2. Cloudinary Real Credentials & Fallback Warning
- **Implementation**: Updated `backend/.env.example` to explicitly label Cloudinary environment variables as `REQUIRED`. Added a startup check in `backend/app.py` that displays a prominent warning banner if Cloudinary credentials are missing or set to `"demo"`.

### 3. Vector Search Strategy Abstraction (Local vs Atlas)
- **Implementation**: 
  - Added `VECTOR_SEARCH_BACKEND` (`local` | `atlas`) configuration flag in `backend/config.py`.
  - Created `VectorSearchProvider` interface in `backend/ai/vector_search_providers.py` with `LocalCosineProvider` (in-memory Python cosine similarity) and `AtlasVectorSearchProvider` (MongoDB Atlas `$vectorSearch` pipeline stage).
  - Updated `backend/ai/agent_graph.py` `vector_search` node to delegate candidate scoring to the active provider.
  - Added committed Atlas Vector Search index schema in `database/atlas_vector_index.json`.

### 4. Global Frontend JWT Expiry Interceptor
- **Implementation**: Enhanced Axios response interceptor in `frontend/src/lib/api.ts` to intercept `401 Unauthorized` responses globally, purge stored JWT credentials from `localStorage`, and redirect to `/login` with an amber warning banner: *"Your session expired — please log back in."*

### 5. Non-Blocking Off-Thread AI Inference
- **Implementation**: Wrapped all synchronous CPU-bound model calls (`clip_service`, `text_service`, `yolo_service`, `ocr_service`) inside async HTTP route handlers in `backend/routes/lost.py`, `backend/routes/found.py`, and `backend/routes/admin.py` using `starlette.concurrency.run_in_threadpool`.
- **Benefits**: Prevents heavy AI model execution from blocking FastAPI's async event loop for concurrent users.

### 6. File Upload Validation
- **Implementation**: Created `backend/services/upload_validator.py` enforcing:
  - **8MB Maximum File Size Limit** (`HTTP 413 Payload Too Large`).
  - **Magic Byte Signature Verification** (`HTTP 415 Unsupported Media Type`) allowing only `image/jpeg`, `image/png`, and `image/webp` file headers.
- Applied in `POST /lost`, `POST /found`, `POST /admin/lost`, and `POST /admin/found` before hitting Cloudinary or AI models.

### 7. Embedding Model Versioning
- **Implementation**: Added `EMBEDDING_MODEL_VERSION = "clip-vit-b32-v1"` constant in `backend/config.py`. Automatically stamps `embedding_model_version` on all new database items. Updated `backend/ai/agent_graph.py` to check versions during matching and log a warning if candidate embeddings were generated under a different model version. Added re-embedding notes in `README.md`.

### 8. Soft Delete for Audit Log Integrity
- **Implementation**: 
  - Updated `DELETE /lost/{id}`, `DELETE /found/{id}`, `DELETE /admin/lost/{id}`, and `DELETE /admin/found/{id}` to perform soft deletes (`deleted: true`, `deleted_at: timestamp`).
  - Filtered out `deleted: true` items from all public and admin listing endpoints (`GET /lost`, `GET /found`, `GET /admin/lost`, `GET /admin/found`).
  - Stored a complete JSON snapshot of key item fields (`title`, `description`, `category`, `location`, `image_url`, `user_id`) directly in `admin_actions` audit log entries for immutable reporting.
