from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sistema Multiplataforma Acompañamiento Educativo IA (RAG)"
    API_V1_STR: str = "/api/v1"
    
    # 1. Credenciales PostgreSQL 16 + pgvector
    PG_USER: str = "edtech_admin"
    PG_PASSWORD: str = "secret_password"
    PG_HOST: str = "localhost"
    PG_PORT: int = 5432
    PG_DB: str = "edtech_curricular"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.PG_USER}:{self.PG_PASSWORD}@{self.PG_HOST}:{self.PG_PORT}/{self.PG_DB}"

    # 2. Ruta física en el servidor para almacenar las guías PDF
    STORAGE_DIR: Path = Path("storage/guias_pdf")

    # 3. Parámetros Criptográficos JWT (RBAC)
    JWT_SECRET_KEY: str = "clave_criptografica_escolar_alta_entropia_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # 4. Configuración Motor Híbrido RAG (Gemini Cloud + Ollama Local RTX 4060)
    GEMINI_API_KEY: str = "sin_configurar"
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_LLM_MODEL: str = "gemma3:4b"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    RAG_SIMILARITY_THRESHOLD: float = 0.50

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)