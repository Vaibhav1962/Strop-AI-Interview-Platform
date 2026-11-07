# Backend

FastAPI + PostgreSQL API for Strop.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate       # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
copy .env.example .env       # macOS/Linux: cp .env.example .env
```

Edit `.env` and point `DATABASE_URL` at your Postgres instance.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- `GET /api/v1/health` — liveness check
- `GET /api/v1/health/db` — round-trips a query through Postgres

## Database migrations (Alembic)

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

New tables: add a model module under `app/models/`, then import it in
`app/models/__init__.py` so Alembic's autogenerate can see it.

## Project structure

- `app/main.py` — FastAPI app instance, CORS, router registration
- `app/config.py` — settings loaded from `.env` via pydantic-settings
- `app/database.py` — async SQLAlchemy engine/session and the declarative `Base`
- `app/models/` — SQLAlchemy models
- `app/api/` — API routers
- `alembic/` — migration environment and generated migration scripts

This package is plain Python and is not part of the root pnpm workspace —
only `frontend` is.
