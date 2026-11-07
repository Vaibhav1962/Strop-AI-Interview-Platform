import uuid
from collections.abc import AsyncGenerator

import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import get_settings
from app.models.user import User

settings = get_settings()

# Use NullPool for tests so each connection is dedicated and never reused across different event loops
test_engine = create_async_engine(settings.database_url, echo=False, poolclass=NullPool)
async_session_factory = async_sessionmaker(test_engine, expire_on_commit=False)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


@pytest_asyncio.fixture
async def test_user() -> User:
    async with async_session_factory() as session:
        test_email = "test_orchestrator@interviewiq.local"
        result = await session.execute(select(User).where(User.email == test_email))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                id=uuid.uuid4(),
                full_name="Orchestrator Test User",
                email=test_email,
                hashed_password="hashed_test_password",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def second_test_user() -> User:
    async with async_session_factory() as session:
        test_email = "test_user_two@interviewiq.local"
        result = await session.execute(select(User).where(User.email == test_email))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                id=uuid.uuid4(),
                full_name="Second Test User",
                email=test_email,
                hashed_password="hashed_test_password",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
        return user
