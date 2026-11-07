# Strop — Production Deployment Guide & Runbook

This runbook specifies the production topology, environment variable contract, database migration procedure, cold-start handling, and verification checklist for deploying Strop to **Vercel** (Frontend) and **Render** (FastAPI Backend) connected to **Neon** (Serverless PostgreSQL).

---

## 1. Production Architecture Overview

```
+──────────────────────────────────────────────────────────────────────────────+
|                                    CLIENT                                    |
|              Browser (React 19 + Tailwind v4 + Vite Single Page App)         |
+───────────────────────────────────────┬──────────────────────────────────────+
                                        │
                         HTTPS / WSS / SSE Requests
                                        │
                                        v
+──────────────────────────────────────────────────────────────────────────────+
|                           VERCEL (Frontend Host)                             |
|  - Static Assets CDN (Rolldown / Vite output)                                |
|  - Single Page Application Rewrite to /index.html                            |
|  - Zero Secret Exposure (Only VITE_API_BASE_URL bundled)                     |
+──────────────────────────────────────────────────────────────────────────────+
                                        │
                         HTTPS / WSS / SSE to API Proxy
                                        │
                                        v
+──────────────────────────────────────────────────────────────────────────────+
|                           RENDER (Backend Web Service)                       |
|  - FastAPI (Python 3.12 / 3.13) + Uvicorn Async Server                       |
|  - Non-blocking Lifespan: Durable Evaluation Worker & Startup Recovery       |
|  - SSE Dialogue Streaming + Token Bucket Fenced Commits                      |
|  - BARS Competency Evaluator & PDF Engine (ReportLab)                        |
|  - Protected Execution & Audio Proxy                                         |
+───────────────────┬─────────────────────┬───────────────────┬────────────────+
                    │                     │                   │
         SQL Queries (asyncpg)      Code Execution      LLM & Speech APIs
                    │                     │                   │
                    v                     v                   v
      +──────────────────────+  +─────────────────+  +─────────────────────────+
      |         NEON         |  |     JUDGE0      |  | THIRD-PARTY PROVIDERS   |
      | Serverless Postgres  |  | Self-Hosted / CE|  | - OpenRouter / Qwen     |
      | - Async Connection   |  | Code Execution  |  | - Google Gemini 2.5/Flash|
      |   Pooling (NullPool) |  | Sandbox Engine  |  | - ElevenLabs TTS        |
      | - SSL Required       |  +─────────────────+  +─────────────────────────+
      +──────────────────────+
```

---

## 2. Environment Variables & Secret Classification

### Frontend (Vercel)
Set in **Vercel Project Settings -> Environment Variables**:

| Variable | Type | Example / Description |
|---|---|---|
| `VITE_API_BASE_URL` | Public URL | `https://api.interviewiq.yourdomain.com/api/v1` |

> **Security Rule**: Never configure `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, or `SECRET_KEY` in Vercel. The client bundle is scanned and guaranteed zero secret exposure.

### Backend (Render Web Service)
Set in **Render Dashboard -> Environment Variables**:

| Variable | Classification | Description |
|---|---|---|
| `DATABASE_URL` | **Secret** | Neon PostgreSQL async connection string: `postgresql+asyncpg://<user>:<password>@<neon-host>/<dbname>?ssl=require` |
| `SECRET_KEY` | **Secret** | 64-character random hex string for JWT signing (`openssl rand -hex 32`) |
| `CORS_ORIGINS` | Configuration | JSON array of permitted origins, e.g. `["https://interviewiq.vercel.app"]` |
| `JUDGE0_URL` | URL | URL of self-hosted or cloud Judge0 instance (e.g. `https://judge0-ce.p.rapidapi.com` or internal URL) |
| `JUDGE0_AUTH_TOKEN` | **Secret** | Auth token / X-RapidAPI-Key for Judge0 code execution engine |
| `GEMINI_API_KEY` | **Secret** | Google AI Studio API key for Gemini models |
| `QWEN_API_KEY` | **Secret** | OpenRouter / DashScope API key for Qwen 2.5 72B Instruct evaluator |
| `ELEVENLABS_API_KEY`| **Secret** | ElevenLabs API key for high-fidelity interviewer voice synthesis |

---

## 3. Database Migration Runbook (Neon PostgreSQL)

Neon Serverless PostgreSQL spins down inactive compute instances. When deploying:

1. **Connection String Syntax**:
   FastAPI uses SQLAlchemy Async (`asyncpg`). The Neon URI must use the `postgresql+asyncpg://` scheme and enforce SSL:
   ```
   postgresql+asyncpg://<user>:<pass>@<endpoint>.neon.tech/<database>?ssl=require
   ```

2. **Automated Migration**:
   Alembic is configured to run at startup prior to launching the Uvicorn web service:
   ```bash
   alembic upgrade head
   ```

3. **Schema Verification**:
   Verify that tables exist: `users`, `interview_sessions`, `orchestrator_sessions`.

---

## 4. Render Service Configuration

- **Environment**: Python 3.12+
- **Build Command**:
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command**:
  ```bash
  alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
- **Health Check Path**: `/api/v1/health`
- **Auto-Deploy**: Enabled on `main` branch push.

---

## 5. Vercel Frontend Configuration

The repository contains `vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "pnpm run build",
  "installCommand": "pnpm install --frozen-lockfile",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 6. Cold-Start and Background Process Resilience

1. **Serverless Neon Cold Starts**:
   - SQLAlchemy async engine uses connection recycling (`pool_pre_ping=True`) to handle Neon endpoint wakeups without dropped sessions.
2. **Evaluation Durability**:
   - Evaluation jobs are persisted transactionally in PostgreSQL (`orchestrator_sessions.evaluation_status = 'queued'`).
   - The FastAPI `lifespan` manager automatically identifies any evaluations interrupted mid-flight during deployment restarts and reverts them to `queued` for reprocessing.
   - Workers claim jobs race-free using `SELECT ... FOR UPDATE SKIP LOCKED` and release database locks before invoking AI evaluation APIs.

