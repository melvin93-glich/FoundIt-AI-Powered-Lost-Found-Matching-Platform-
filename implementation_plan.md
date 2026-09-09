# Implementation Plan - FoundIt (AI-Powered Lost & Found Matching Platform)

Building a full-stack AI-powered lost and found matching platform with Next.js (App Router, Tailwind CSS, TypeScript), FastAPI (Python), MongoDB Atlas Vector Search, PyTorch/Transformers AI stack (CLIP, BGE-small, YOLOv8n, EasyOCR), and LangGraph agent orchestration.

## Architecture & Technology Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide icons, custom typographic system (Space Grotesk / Plus Jakarta Sans via Google Fonts), premium civic-utility design system (warm slate, cream, deep indigo/emerald accents).
- **Backend**: FastAPI, PyMongo / Motor for MongoDB, PyJWT & Passlib for Auth, Cloudinary SDK for image uploads.
- **AI Models & Pipeline**:
  - `transformers` (CLIP: `openai/clip-vit-base-patch32`) for image embeddings
  - `sentence-transformers` (`BAAI/bge-small-en-v1.5`) for text embeddings
  - `ultralytics` (YOLOv8n) for automated object detection & tag extraction
  - `easyocr` for extracting text visible on items (e.g. name tags, serials, logos)
  - `langgraph` for explicit workflow state graph:
    `understand_request` → `generate_embeddings` → `vector_search` → `context_rank` → `explain_match`

---

## User Review Required

> [!IMPORTANT]
> - **MongoDB Atlas / Local Fallback**: For Atlas Vector Search, an active MongoDB Atlas cluster with Vector Search Index is supported. We will provide seamless fallback to Cosine Similarity in Python when running locally or without Atlas API credentials so the app works out-of-the-box in development.
> - **AI Model Heavy Weights**: Running YOLO, CLIP, EasyOCR, and BGE models locally in Python requires dependencies (`torch`, `ultralytics`, `transformers`, `easyocr`). Models will lazy-load on startup.

---

## Proposed Phases & File Structure

### Project Layout
```
d:\Projects\DNN\
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   ├── models/
│   │   ├── user.py
│   │   ├── item.py
│   │   └── match.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── lost.py
│   │   ├── found.py
│   │   └── match.py
│   ├── services/
│   │   ├── cloudinary_service.py
│   │   └── db.py
│   └── ai/
│       ├── clip_model.py
│       ├── text_model.py
│       ├── ocr.py
│       ├── yolo_model.py
│       ├── matching.py
│       └── agent_graph.py
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── login/
    │   ├── register/
    │   ├── lost/
    │   │   └── new/
    │   ├── found/
    │   │   └── new/
    │   ├── dashboard/
    │   ├── matches/[id]/
    │   └── item/[id]/
    └── components/
```

---

## Step-by-Step Implementation Strategy

### Phase 1: Frontend Design System & Scaffolding
1. Initialize Next.js frontend with App Router, TypeScript, and Tailwind CSS.
2. Setup Typography (Space Grotesk display + Plus Jakarta Sans body via `next/font/google`).
3. Setup theme tokens & palette in `tailwind.config.js` (Civic warm palette: Charcoal `#1E2022`, Warm Sand `#F7F5F0`, Forest Sage `#2E4A3E`, Amber `#D97706`).
4. Build reusable UI components (Navbar, ItemCard, StatusBadge, ConfidenceBar, AsyncState, Form fields).

### Phase 2: FastAPI Backend Scaffolding & Auth
1. Setup Python environment and requirements.
2. Build MongoDB connection module and Pydantic data schemas.
3. Build JWT authentication (register, login, me, token verification middleware).
4. Build Cloudinary image upload utility.

### Phase 3: AI Inference & Embeddings Engine
1. Implement CLIP (`openai/clip-vit-base-patch32`) wrapper.
2. Implement BGE (`BAAI/bge-small-en-v1.5`) wrapper.
3. Implement YOLOv8n object detection service.
4. Implement EasyOCR text recognition service.

### Phase 4: Scoring Formula & LangGraph Agent Pipeline
1. Implement score formula: `0.6 * image_sim + 0.25 * text_sim + 0.15 * context_score`.
2. Construct LangGraph explicit graph state and node executions.

### Phase 5: Frontend Page Integration
1. Landing Page with live stats, search bar demo, and clean civic aesthetics.
2. Auth pages (Login / Register with JWT local storage / cookies).
3. Report Lost / Found forms with drag-and-drop image upload, location/date picker, category selector.
4. Dashboard grid (My Reports, status updates, filtering).
5. Match Results page (side-by-side visual comparison, confidence score breakdown, Confirm/Reject actions).
6. Item Detail page.

### Phase 6: Admin Panel & Security Infrastructure
1. Role-based user model & JWT claims (`role: "user" | "admin"`).
2. FastAPI `require_admin` dependency restricting all `/admin/*` routes to admin users (returns 403 Forbidden for regular users).
3. `seed_admin.py` CLI script for initial admin creation.
4. Admin console UI at `/admin` guarded by frontend `isAdmin` check and layout guard.
5. Admin management capabilities: view all users, edit user roles, delete users, inspect/delete lost & found items, and override AI match decisions.
6. Admin "on-behalf-of" item creation (`UserPickerModal`).
7. Admin audit logging (`admin_actions` collection) tracking all administrative actions.
8. Cascading deletion cleanup on lost/found item deletion.
9. Centralized API client (`lib/api.ts`) with `NEXT_PUBLIC_API_URL` configuration and automatic JWT Bearer token injection.

---

## Verification Plan

### Automated Verification
- Backend route smoke tests and admin RBAC checks.
- AI pipeline test script testing CLIP, BGE, YOLO, OCR, and LangGraph workflow on sample images and query text.
- Next.js build validation (`npm run build`).

### Manual Verification
- Testing item registration with real sample photos (e.g. keys, wallet, water bottle).
- Verifying YOLO auto-detection tags and OCR extracted text from uploads.
- Verifying LangGraph matching output and confidence percentage breakdown in UI.
- Verifying admin authorization guards on frontend routes and backend APIs.

