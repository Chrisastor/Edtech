from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# Motor asíncrono con Pool de Conexiones para soportar picos de concurrencia (18:00 a 20:30 hrs)
engine = create_async_engine(
    settings.ASYNC_DATABASE_URL,
    echo=False,
    pool_size=20,          # 20 conexiones permanentes abiertas
    max_overflow=10        # Hasta 10 conexiones extra en ráfagas de estrés
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_pg_db():
    """Inyector de dependencia que entrega una sesión transaccional ACID por petición HTTP."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()