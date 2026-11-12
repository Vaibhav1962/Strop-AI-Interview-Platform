import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, update

from app.api.routes import api_router
from app.config import get_settings
from app.database import async_session
from app.models.orchestrator_session import OrchestratorSession
from app.services.evaluation_worker import evaluation_worker_loop, notify_job_available

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup: Recover orphaned processing evaluations back to 'queued'
    try:
        async with async_session() as db:
            result = await db.execute(
                update(OrchestratorSession)
                .where(OrchestratorSession.evaluation_status == "processing")
                .values(evaluation_status="queued")
            )
            await db.commit()
            if result.rowcount > 0:
                print(f"[Lifespan] Re-queued {result.rowcount} interrupted evaluations for durable processing.")
    except Exception as e:
        print(f"[Lifespan] Startup evaluation recovery note: {e}")

    # 1b. Keep curated questions (and DSA tests) in the database in step with the catalogs in code
    try:
        from app.orchestrator.question_bank.seeder import seed_all_catalogs

        async with async_session() as db:
            await seed_all_catalogs(db)
            await db.commit()
    except Exception as e:
        print(f"[Lifespan] Question catalog sync note: {e}")

    # 2. Launch long-running durable background worker
    worker_task = asyncio.create_task(evaluation_worker_loop())
    notify_job_available()

    yield

    # 3. Shutdown: Gracefully stop background worker
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass


_docs = {} if not settings.is_production else {"docs_url": None, "redoc_url": None, "openapi_url": None}
app = FastAPI(title=settings.project_name, lifespan=lifespan, **_docs)


MAX_REQUEST_BYTES = 30 * 1024 * 1024  # the largest legitimate body is a ~10 MB audio clip or resume


@app.middleware("http")
async def security_headers(request, call_next):
    declared = request.headers.get("content-length", "")
    if declared.isdigit() and int(declared) > MAX_REQUEST_BYTES:
        return JSONResponse(status_code=413, content={"detail": "Request body too large."})
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
    if request.url.path.startswith("/api"):
        # Responses hold personal data (resumes, transcripts); never let a shared cache keep them.
        response.headers.setdefault("Cache-Control", "no-store")
    if settings.is_production:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


# Auth is a bearer token in the Authorization header, not a cookie, so credentialed CORS is not needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)

app.include_router(api_router, prefix=settings.api_v1_prefix)
app.include_router(api_router, prefix="/api")

