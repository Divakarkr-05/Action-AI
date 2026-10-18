# REALITY → ACTION AI

> **SEE IT. UNDERSTAND IT. ACT.**
>
> A multimodal AI system that turns what you see into structured, actionable steps — powered by **Google Gemma 4**, **FastAPI + Strawberry GraphQL**, **Supabase Auth & Database**, and **React (Vite + TypeScript + Tailwind CSS)**.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Database Setup (Supabase)](#database-setup-supabase)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [GraphQL API Reference](#graphql-api-reference)
- [Safety & Emergency Response](#safety--emergency-response)
- [Safety & Verification](#safety--verification)

---

## Overview

**REALITY → ACTION AI** allows engineers, technicians, and everyday users to upload or snap a photo of any real-world object, machine, electrical circuit, error screen, or physical device. Instead of manually explaining a technical issue with text, the user shows the system the reality in front of them.

The system processes the image using multimodal AI to return:
1. **What I See** – Precise visual breakdown of components and elements.
2. **What's Happening** – Diagnosis of current state, defects, or failure points.
3. **What to Do Next** – Primary high-priority recommendation.
4. **Step-by-Step Instructions** – Numbered action steps to solve the issue.
5. **Confidence Rating & Safety Warnings** – Prominent hazard warnings (e.g. electrical shock, high pressure) and clear uncertainty quantification.
6. **Safety & Emergency Response Banner** – Immediate life-safety advisory with verified clickable helplines (`112`, `1933`, `14416`, `1800-891-4416`) when danger is detected.
7. **Follow-Up Interactive Chat** – Conversational Q&A grounded on the image analysis session.
8. **Cloud History & Session Persistence** – User authentication and history storage via Supabase with Row Level Security (RLS).

---

## Key Features

- **Multi-Modal Inspection**: Drag-and-drop file upload or live camera capture directly from the browser.
- **Safety & Emergency Response Layer**: Authoritative detection and response for potential acute hazards, self-harm, drug risks, and injuries.
- **Structured AI Insights**: Clean separation of observation, diagnosis, and action plan.
- **Conversational Follow-Up**: Ask questions in natural language about specific steps or components.
- **User Authentication**: Secure email & password authentication powered by Supabase Auth (`/login`, `/signup`).
- **Session History & Search**: Authenticated users can browse previous analyses, filter and search through findings, view full technical logs, and restore sessions back into the workspace.
- **Row-Level Security (RLS)**: Enforces strict data isolation so users only access their own analysis records.
- **Mock & Gemma 4 AI Modes**: Switch between realistic mock responses for instant testing and live multimodal inference via Hugging Face.

---

## Architecture

```
REALITY (Uploaded / Captured Image)
   ↓
IMAGE VALIDATION (Non-empty, base64 check)
   ↓
AUTHENTICITY CHECK (Detectra v3 via onnxruntime-web in browser)
   ├── WebGPU EP (Shader execution)
   └── WASM EP Fallback (CPU SIMD)
   ↓
SAFETY CLASSIFICATION (Authoritative Pre-flight)
   ├── NORMAL
   ├── POSSIBLE_DRUG_RELATED
   ├── POSSIBLE_SELF_HARM
   ├── POSSIBLE_SUICIDE_ATTEMPT
   ├── POSSIBLE_SERIOUS_INJURY
   ├── POSSIBLE_UNCONSCIOUS_PERSON
   └── EMERGENCY_UNCERTAIN
   ↓
SAFETY POLICY INJECTION (Authoritative system context)
   ↓
UNDERSTANDING & REASONING (Gemma 4 / Sarvam multimodal pipeline)
   * Gemma receives safety state & detector assessment as CONTEXT
   * Gemma CANNOT downgrade emergency states to NORMAL
   ↓
SAFETY IMMUTABILITY & CLAIM SANITIZATION
   * Enforces tentative, non-definitive phrasing
   ↓
GROUNDING (RAG over technical documentation)
   ↓
ACTION RESPONSE & EMERGENCY ADVISORY
   ↓
HISTORY PERSISTENCE (Supabase PostgreSQL with RLS)
```

### Image Authenticity Layer (Detectra v3)

The authenticity detector runs 100% locally in the user's browser using `onnxruntime-web`, eliminating any external detector API calls or third-party image sharing.

- **Model**: Detectra v3 (`TensorFold/detectra-v1`), 43.7 MB ONNX format.
- **Model Path**: Served deterministically from `/models/detectra.onnx` via `frontend/public/models/detectra.onnx`.
- **Model Preprocessing**:
  1. Load image and scale shortest edge to 440 pixels.
  2. Center crop to 384 x 384 pixels.
  3. Normalize pixels to [0, 1].
  4. Apply ImageNet normalization (mean: `[0.485, 0.456, 0.406]`, std: `[0.229, 0.224, 0.225]`).
  5. Tensor format: `pixel_values`, float32, shape `[1, 3, 384, 384]`.
  6. Output: Single logit tensor `logit` converted via sigmoid: $\text{probability} = \frac{1}{1 + e^{-\text{logit}}}$.
- **Configurable Product Thresholds**:
  - `probability >= 0.75` $\rightarrow$ `LIKELY_AI_GENERATED`
  - `probability <= 0.25` $\rightarrow$ `LIKELY_REAL`
  - `0.25 < probability < 0.75` $\rightarrow$ `UNCERTAIN`
  - Error/Failure $\rightarrow$ `UNAVAILABLE`
- **Execution Strategy**:
  - Tries hardware-accelerated **WebGPU** first for near-instant inference.
  - Automatically falls back to multi-threaded **WASM** if WebGPU is unsupported.
  - Caches both session and result per unique image to prevent re-computation.
  - Non-blocking: background check runs without halting image browsing or prompt typing.
- **Limitations**:
  - AI-image detection is probabilistic and can be affected by compression, resizing, screenshots, editing, camera ISP pipelines, and unseen generators.
  - Never presented as forensic proof; non-alarmist UI phrasing is enforced.
- **Evaluation & Benchmarks**:
  - Comprehensive evaluation framework located in `evaluation/authenticity/`.

### Large Model Storage Strategy
- The model file `models/detectra.onnx` (~43.7 MB) is excluded from regular git commits via `.gitignore`.
- **Recommended Setup**:
  - Option A: Git LFS tracking `*.onnx` for teams using GitHub LFS.
  - Option B: Automated setup script (`npm run setup-model` or curl from releases).
  - Development: Zero-copy hard-link between `models/detectra.onnx` and `frontend/public/models/detectra.onnx` (`mklink /H`).

---

## Project Structure

```
reality-action-ai/
├── supabase/
│   └── schema.sql                 # PostgreSQL DDL, RLS policies & search indexes
├── backend/                       # FastAPI application
│   ├── app/
│   │   ├── config/                # Environment configuration (pydantic-settings)
│   │   ├── graphql/               # Strawberry GraphQL queries, mutations, schema
│   │   ├── middleware/            # JWT token validation & user extraction
│   │   ├── schemas/               # Pydantic domain models
│   │   ├── services/              # Analysis, History, Gemma 4, and Supabase client
│   │   └── main.py                # FastAPI entry point & CORS configuration
│   ├── requirements.txt           # Python dependencies (FastAPI, Strawberry, Supabase, PyJWT)
│   └── .env.example
├── frontend/                      # React SPA
│   ├── src/
│   │   ├── components/            # UI components (Camera, Uploader, AnalysisPanel, etc.)
│   │   ├── contexts/              # AuthContext (Supabase session provider)
│   │   ├── lib/                   # Supabase client initialization
│   │   ├── pages/                 # Route pages (LoginPage, SignupPage, HistoryPage)
│   │   ├── services/              # Client services (graphql.ts, auth.ts, history.ts)
│   │   ├── types/                 # TypeScript type definitions
│   │   ├── App.tsx                # Main inspection workspace
│   │   ├── main.tsx               # Root router & context tree
│   │   └── index.css              # Dark graphite & lime design system
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
├── .gitignore
└── README.md
```

---

## Database Setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Run the SQL script located in [`supabase/schema.sql`](file:///c:/Users/Divakar%20K%20R/Action-AI/reality-action-ai/supabase/schema.sql):
   - Creates the `analysis_history` table linked to `auth.users(id)`.
   - Enables Row Level Security (RLS) with user-scoped `SELECT`, `INSERT`, and `DELETE` policies.
   - Generates full-text search indexes (`tsvector`) for fast query execution.

---

## Backend Setup

### Prerequisites
- Python 3.10+ (tested with Python 3.14)

### Installation

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Run the Server

```bash
# Copy and configure environment variables
copy .env.example .env

# Run FastAPI with hot-reloading
uvicorn app.main:app --reload --port 8000
```

Backend will be available at: **http://localhost:8000**
- Health Check: **http://localhost:8000/health**
- Interactive GraphQL Playground (GraphiQL): **http://localhost:8000/graphql**
- OpenAPI Docs: **http://localhost:8000/docs**

---

## Frontend Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation & Run

```bash
cd frontend

# Install packages
npm install

# Copy environment template
copy .env.example .env.local

# Start development server
npm run dev
```

Frontend will run at: **http://localhost:5173**

### Build for Production

```bash
npm run build
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                    | Default                   | Description |
|-----------------------------|---------------------------|-------------|
| `SUPABASE_URL`              | *(empty)*                 | Supabase project URL (`https://<project>.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | *(empty)*                 | Supabase service role secret key (backend only) |
| `HF_TOKEN`                  | *(empty)*                 | Hugging Face API token for Gemma 4 |
| `HF_MODEL`                  | `google/gemma-4-31B-it`   | Gemma 4 model identifier |
| `AI_MODE`                   | `mock`                    | `mock` for local dev or `gemma` for live HF API |
| `CORS_ORIGINS`              | `http://localhost:5173`   | Comma-separated list of allowed CORS origins |
| `MAX_UPLOAD_SIZE_MB`        | `10`                      | Maximum image upload size in MB |

### Frontend (`frontend/.env.local`)

| Variable                 | Default                          | Description |
|--------------------------|----------------------------------|-------------|
| `VITE_SUPABASE_URL`      | *(empty)*                        | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | *(empty)*                        | Supabase client anonymous public key |
| `VITE_GRAPHQL_URL`       | `http://localhost:8000/graphql`  | Backend GraphQL endpoint |

---

## GraphQL API Reference

### Queries

#### 1. `health`
Check backend readiness and active AI mode.
```graphql
query Health {
  health {
    status
    version
    aiMode
    model
  }
}
```

#### 2. `analysisHistory` (Protected)
Fetch past analyses for the logged-in user.
```graphql
query AnalysisHistory($search: String, $limit: Int, $offset: Int) {
  analysisHistory(search: $search, limit: $limit, offset: $offset) {
    id
    question
    whatISee
    whatIsHappening
    nextAction
    steps
    confidence
    safetyWarning
    createdAt
  }
}
```

---

### Mutations

#### 1. `analyzeReality`
Submit a base-64 encoded image for AI analysis.
```graphql
mutation AnalyzeReality($image: String!, $question: String) {
  analyzeReality(image: $image, question: $question) {
    whatISee
    whatIsHappening
    nextAction
    steps
    confidence
    safetyWarning
  }
}
```

#### 2. `askFollowUp`
Ask questions grounded in an ongoing inspection session.
```graphql
mutation AskFollowUp($sessionId: String!, $question: String!) {
  askFollowUp(sessionId: $sessionId, question: $question) {
    answer
    steps
    confidence
    safetyWarning
  }
}
```

#### 3. `saveAnalysis` (Protected)
Save a completed analysis result to user history.
```graphql
mutation SaveAnalysis(
  $question: String
  $whatISee: String!
  $whatIsHappening: String!
  $nextAction: String!
  $steps: [String!]
  $confidence: Float!
  $safetyWarning: String
) {
  saveAnalysis(
    question: $question
    whatISee: $whatISee
    whatIsHappening: $whatIsHappening
    nextAction: $nextAction
    steps: $steps
    confidence: $confidence
    safetyWarning: $safetyWarning
  ) {
    success
    historyId
    message
  }
}
```

#### 4. `deleteAnalysis` (Protected)
Delete a record from history.
```graphql
mutation DeleteAnalysis($id: String!) {
  deleteAnalysis(id: $id) {
    success
    message
  }
}
```

---

## Safety & Emergency Response

Reality → Action AI features an authoritative **Safety & Emergency Response Layer** that evaluates uploaded images and user prompts for acute life-safety conditions, drug-related hazards, and medical crises.

### Supported Safety Categories

1. `NORMAL` – Technical inspections with no acute life-safety emergency.
2. `POSSIBLE_DRUG_RELATED` – Unidentified substances or contraband. Surfaces MANAS (1933) and NCB contact (+91-11-26761000). Emphasizes: do not touch, consume, taste, smell, or confront.
3. `POSSIBLE_SELF_HARM` – Crisis indicators. Prioritizes immediate safety over technical analysis. Displays 112 and Tele-MANAS (14416 / 1800-891-4416).
4. `POSSIBLE_SUICIDE_ATTEMPT` – Acute crisis response with verified 24x7 mental health resources.
5. `POSSIBLE_SERIOUS_INJURY` – Potential acute trauma or bleeding. Prompts calling 112 and non-movement.
6. `POSSIBLE_UNCONSCIOUS_PERSON` – Unresponsive individual protocol.
7. `EMERGENCY_UNCERTAIN` – Ambiguous acute physical danger.

### Core Safety Principles

- **Image Analysis is NOT Proof**: Language is strictly probabilistic (*"possible"*, *"may indicate"*, *"cannot be confirmed from the image alone"*). Definitive criminal, medical, or suicide declarations are prohibited.
- **Safety Policy Immutability**: Gemma and Sarvam receive authoritative safety context and **CANNOT downgrade** any emergency state to `NORMAL`.
- **No Automatic Contact or Transmission**: The platform **NEVER** automatically calls emergency services, police, NCB, hospitals, or third parties, and never transmits images to law enforcement. The user alone makes that decision.
- **Process → Respond → Forget**: Safety analysis is transient. No permanent safety-profile memory is maintained, no emergency images are hoarded, and raw image base64 is never logged.
- **Verified Emergency Helplines (India)**:
  - `112` — National Emergency Response Support System (ERSS)
  - `1933` — MANAS / National Narcotics Helpline
  - `+91-11-26761000` — NCB Control Room
  - `14416` / `1800-891-4416` — Tele-MANAS (24x7 Mental Health Support)

For full documentation and technical architecture, see [docs/SAFETY.md](docs/SAFETY.md).

---

## Safety & Verification

1. **Safety First**: Safety warnings are prioritized in both the AI prompt templates and the UI rendering, highlighting physical danger (electrical shock, hazardous fluids, moving parts).
2. **Confidence Scoring**: High-precision indicators show confidence ratings so users know when to verify findings manually.
3. **Protected Data Access**: All user records are guarded by PostgreSQL Row-Level Security; requests require a valid Supabase JWT Bearer token.

