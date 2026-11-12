from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

# pool_pre_ping + recycling: serverless Postgres (Neon) closes idle connections and sleeps its compute, so a pooled
# connection may be dead by the time it is reused. Test it before use and retire connections after five minutes.
engine = create_async_engine(settings.database_url, echo=False, future=True, pool_pre_ping=True, pool_recycle=300)
async_session = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
