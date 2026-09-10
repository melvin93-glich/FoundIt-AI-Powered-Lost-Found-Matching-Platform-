# 🔍 FoundIt — AI-Powered Lost & Found Matching Platform

> An intelligent, full-stack civic utility application that leverages computer vision, natural language processing, vector embeddings, and multi-agent workflow orchestration to automatically identify and match lost and found items.

---

## ✨ Features

- 📸 **Multi-Modal AI Analysis**:
  - **Image Embeddings**: Powered by OpenAI's **CLIP** (`openai/clip-vit-base-patch32`) for visual representation.
  - **Text Embeddings**: Powered by **BAAI BGE** (`BAAI/bge-small-en-v1.5`) for deep semantic text search.
  - **Object & Tag Detection**: Automated visual feature detection using **YOLOv8n** (`ultralytics`).
  - **OCR Text Extraction**: Optical Character Recognition via **EasyOCR** to parse serial numbers, names, and text visible on items.
- ⚙️ **Agentic Workflow Engine**:
  - Implemented using **LangGraph** with an explicit node pipeline:
    `understand_request` ➔ `generate_embeddings` ➔ `vector_search` ➔ `context_rank` ➔ `explain_match`.
  - Smart scoring system combining visual similarity ($60\%$), text semantics ($25\%$), and contextual metadata ($15\%$).
- ⚡ **Production Hardened**:
  - AI model warm-up on server startup.
  - Non-blocking off-thread inference via `run_in_threadpool`.
  - File upload validation (8MB limit + magic byte signature verification).
  - Soft delete for audit log integrity (`deleted: true`).
  - Dual vector search strategy (In-memory Python Cosine Similarity vs. MongoDB Atlas `$vectorSearch`).

---

## 🔄 Embedding Versioning & Re-Embedding Notes

Items are stamped with an `embedding_model_version` tag (default: `"clip-vit-b32-v1"`).

> [!IMPORTANT]
> **Switching Embedding Models in Production**:
> If you update the underlying CLIP or BGE embedding model versions in the future, previously computed vector embeddings in MongoDB will no longer be directly comparable with newly generated query embeddings.
> 
> The matching engine automatically flags and skips candidate pairs with mismatched embedding versions. To upgrade models across existing items, run a batch re-embedding script (e.g. `python scripts/reembed_items.py`) to re-compute vectors for existing database items under the new model version tag.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide Icons |
| **Backend** | Python, FastAPI, Motor (Async PyMongo), Pydantic |
| **Database** | MongoDB (Local or MongoDB Atlas Vector Search) |
| **AI / Machine Learning** | PyTorch, Hugging Face Transformers (CLIP), Sentence-Transformers (BGE), YOLOv8, EasyOCR |
| **Agent Orchestration** | LangGraph |

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn app:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!
