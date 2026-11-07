from fastapi import APIRouter

from app.api import auth, execute, health, interviews, orchestrator, stt, tts

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(execute.router)
api_router.include_router(orchestrator.router)
api_router.include_router(interviews.router)
api_router.include_router(stt.router)
api_router.include_router(tts.router)
