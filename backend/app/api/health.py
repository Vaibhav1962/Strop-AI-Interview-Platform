from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import client_ip
from app.api.rate_limiter import health_db_limiter
from app.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/db")
async def health_check_db(request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    # Unauthenticated and it opens a database connection, so keep it from being used as a flood vector.
    health_db_limiter.check(client_ip(request))
    await db.execute(text("SELECT 1"))
    return {"status": "ok"}
