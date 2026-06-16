from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker
)

from app.core.config import settings

# 1. Create async engine (connects to PostgreSQL)
engine = create_async_engine(
    settings.database_url,
    echo=True,  # prints SQL queries in terminal (good for learning)
)

# 2. Session factory (creates DB sessions per request)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# 3. Dependency for FastAPI
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session