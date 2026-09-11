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

### 9. Async LangGraph Node Consistency Fix (GET /matches/{item_id})
- **What broke**: `GET /matches/{item_id}` crashed with `TypeError: No synchronous function provided to "vector_search"` because the `vector_search` node was registered as `async def` but `routes/match.py` called the compiled graph via the synchronous `agent_graph.invoke(...)`.
- **Root cause**: A mixed sync/async graph cannot be driven by the synchronous `.invoke()` API — LangGraph raises a `TypeError` when it encounters an async node in that path.
### 10. Contact Detail Visibility After Match Confirmation
- **Implementation**:
  - **Data Model**: Extended `UserRegister`, `UserResponse`, and database documents with optional `phone` (string) and `preferred_contact` (`"email"` | `"phone"` | `"both"`). Added `UserProfileUpdate` and privacy-safe `ContactInfo` models that explicitly exclude `password_hash`, `role`, and internal fields.
  - **Match Confirmation & Unlocking**: Updated `POST /match/{item_id}` to store mutual matches in a `confirmed_matches` collection and return `ContactInfo` for both parties. Added `GET /match/{item_id}/contacts` for re-fetching confirmed contacts.
  - **Privacy Enforcement**: Added server-side ownership checks on contact endpoints — contact details are strictly hidden prior to confirmation and only accessible by the two involved item owners or an admin.
  - **Audit Logging**: Integrated `contact_reveal` audit log entries into the existing `admin_actions` collection whenever contact details are disclosed.
  - **Frontend UI**: Added optional Phone and Preferred Contact inputs to user registration, created a `/profile` management page, updated Navbar user badge links, and added a Contact Card component with clickable `mailto:` and `tel:` links on `/matches/[id]`.

### 11. Photo-less Report Submission Fix (False "Session Expired" Redirect)
- **What broke**: Submitting a report without a photo redirected to `/login?expired=1` with "Your session expired — please log back in", even while logged in.
- **Root cause**:
  1. Frontend submission forms in `lost/new/page.tsx`, `found/new/page.tsx`, and `UserPickerModal.tsx` explicitly set `headers: { "Content-Type": "multipart/form-data" }` in `api.post(...)`. When `FormData` contained text-only inputs with no binary `File`, Axios sent `Content-Type: multipart/form-data` literally without generating the required `boundary` string. FastAPI/Uvicorn failed to parse the multipart stream and returned `HTTP 400 Bad Request: Missing boundary in multipart`.
  2. In `api.ts`, setting `config.headers.Authorization` directly as an object property on `AxiosHeaders` in Axios 1.x failed to serialize when custom header options were passed, causing `get_current_user` or auth-gated handlers to return `HTTP 401 Unauthorized`, which triggered the global 401 response interceptor and redirected the user to login.
- **Fix**:
  - Removed explicit `headers: { "Content-Type": "multipart/form-data" }` from `api.post(...)` calls, allowing Axios and the browser to automatically compute and set the proper `multipart/form-data; boundary=...` header whether a photo is attached or omitted.
  - Updated `api.ts` request interceptor to use `config.headers.set("Authorization", ...)` for reliable header attachment in Axios 1.x.
  - Added inline form error alerts in `lost/new/page.tsx` and `found/new/page.tsx` so non-auth validation or server errors are displayed gracefully instead of redirecting or silently failing.


