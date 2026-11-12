# Strop

AI mock-interview prep app — demanding technical, behavioral, and coding
interviews with every score traced back to the transcript line that earned it.

Frontend: React 19, Vite, Tailwind CSS v4, Recharts.
Backend: FastAPI + PostgreSQL, JWT auth. Code (Python and JavaScript) runs
entirely in the browser, in sandboxed Web Workers, so no execution service
is needed.

## Quick start (Docker)

The whole stack — frontend, backend and the app's database — runs with two
commands:

```bash
cp .env.example .env   # then fill in real secrets — see that file for how
docker compose up --build
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend + docs: [http://localhost:8000/docs](http://localhost:8000/docs)

First run builds everything, so it takes a few minutes; later runs are fast. Database migrations run automatically on
backend startup.

`.env` is gitignored and required — `docker-compose.yml` deliberately has no
secrets in it and no insecure fallback defaults (`docker compose up` fails
fast with a clear message if a variable is missing), so nothing sensitive
ends up in git history.

## Repo layout

- [`frontend/`](./frontend) — the React app
- [`backend/`](./backend) — FastAPI + PostgreSQL API

## Features

- **Auth** — signup/login with bcrypt-hashed passwords, JWT sessions, a
  profile dropdown with logout. Signup redirects to sign-in rather than
  auto-logging in.
- **Compiler tab** — a real code editor (CodeMirror, syntax highlighting,
  adjustable font size) that runs Python (Pyodide) and JavaScript in
  sandboxed Web Workers inside the browser. Submitted code never reaches the
  server: workers have no DOM, no storage and no network.

## Local development without Docker

### Frontend

Requires Node 22 and pnpm 10 (`corepack enable` will provision pnpm).

```bash
pnpm install
pnpm dev        # start the Vite dev server
pnpm build      # production build → frontend/dist/
pnpm preview    # serve the production build locally
```

### Backend

Requires Python 3.12+ and a running PostgreSQL instance. See
[`backend/README.md`](./backend/README.md) for full setup; quick version:

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # then fill in DATABASE_URL, SECRET_KEY
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | backend | Postgres connection string (`postgresql+asyncpg://...`) |
| `SECRET_KEY` | backend | JWT signing key |
| `CORS_ORIGINS` | backend | Allowed frontend origins, JSON array |
| `GROQ_API_KEY` | backend | Groq key (free tier): the interviewer's LLM, speech-to-text and voice. Tried first |
| `GROQ2_API_KEY` | backend | Optional second Groq key; load is spread across both and it takes over when one is rate limited |
| `ELEVENLABS_API_KEY`, `GEMINI_API_KEY`, `QWEN_API_KEY` | backend | Optional fallbacks for voice, transcription and the interviewer LLM (OpenRouter) |
| `VITE_API_BASE_URL` | frontend | Backend API base URL, baked in at build time |

Each package has its own `.env.example` (`backend/.env.example`,
`frontend/.env.example`) for local,
non-Docker development.

## Deployment (Vercel — frontend only)

The repo is Vercel-ready via [`vercel.json`](./vercel.json):

| Setting           | Value                            |
| ----------------- | --------------------------------- |
| Framework preset  | Vite                              |
| Install command   | `pnpm install --frozen-lockfile`  |
| Build command     | `pnpm run build`                  |
| Output directory  | `frontend/dist`                   |

Import the GitHub repo at [vercel.com/new](https://vercel.com/new) — all
routing is client-side, so `vercel.json` rewrites every path to `index.html`.
The backend and database need to be deployed and reachable
separately; point the deployed frontend at them via `VITE_API_BASE_URL`.

## Project structure

- `frontend/src/App.tsx` — root component, auth gate, page switcher
- `frontend/src/pages/*` — one component per screen (`Compiler.tsx`,
  `Landing.tsx`, `Settings.tsx`, etc.)
- `frontend/src/lib/api.ts` — backend API client, session storage
- `frontend/src/lib/editorTheme.ts` — CodeMirror theme matching the app palette
- `frontend/src/components/ui.tsx` — shared UI primitives
- `backend/app/main.py` — FastAPI app, CORS, router registration
- `backend/app/api/` — routers (`auth.py`, `interviews.py`, `orchestrator.py`, `tts.py`, `stt.py`, `health.py`)
- `backend/app/models/`, `backend/alembic/` — SQLAlchemy models and migrations
- `frontend/src/lib/codeExecution.ts` — in-browser Python and JavaScript runners
- `frontend/public/sandbox/js-runner.js` — the sandboxed JavaScript worker (served with its own CSP)
