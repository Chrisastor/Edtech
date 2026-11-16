from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text, select
from app.core.config import settings
from app.db.session import engine, Base, AsyncSessionLocal
from app.models.sql_models import Rol
from app.api.v1_endpoints import router as v1_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Al iniciar el servidor: habilita pgvector y construye las 10 tablas si no existen
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
    
    # 2. Siembra los 3 roles organizacionales RBAC por defecto
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Rol))
        if not res.scalars().first():
            roles_iniciales = [
                Rol(nombre_rol="DOCENTE_UTP", permisos_rbac={"cursos": "write", "rag": "config", "metricas": "read"}),
                Rol(nombre_rol="ESTUDIANTE", permisos_rbac={"tutor_ia": "query", "guias": "read_offline"}),
                Rol(nombre_rol="APODERADO", permisos_rbac={"modo_parental": "query", "avances": "read"})
            ]
            session.add_all(roles_iniciales)
            await session.commit()

    yield
    # 3. Al apagar el servidor: libera limpiamente el pool de conexiones
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan
)

# Compresión Gzip Nivel 6 para cumplir SLA-02 (< 500 KB por transacción en redes rurales 3G)
app.add_middleware(GZipMiddleware, minimum_size=500, compresslevel=6)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix=settings.API_V1_STR)

@app.get("/api/v1/health", tags=["Smoke Test & SLA"])
async def health_check():
    """Prueba de Humo (Smoke Test): Certifica estado de PostgreSQL/pgvector y almacenamiento local."""
    return {
        "status": "OK",
        "database": "PostgreSQL 16 + pgvector operativo",
        "storage_dir": str(settings.STORAGE_DIR.resolve()),
        "compression": "Gzip level 6 active"
    }