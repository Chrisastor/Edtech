import uuid
from datetime import date
from pydantic import BaseModel, EmailStr, Field

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol_activo: str
    usuario_id: uuid.UUID
    nombre_visible: str
    alias_infantil: str | None = None

class UsuarioCreate(BaseModel):
    email_login: EmailStr
    password: str = Field(..., min_length=6)
    nombre_visible: str = Field(..., max_length=100)
    alias_infantil: str | None = Field(default=None, max_length=50)
    nombre_rol: str = Field(..., pattern="^(DOCENTE_UTP|ESTUDIANTE|APODERADO)$")

class CursoCreate(BaseModel):
    nivel_basico: int = Field(..., ge=1, le=6, description="Restringido a 1° a 6° Básico")
    letra_paralelo: str = Field(..., min_length=1, max_length=1)
    anio_lectivo: int = Field(default=2026)

class CursoOut(CursoCreate):
    curso_id: uuid.UUID
    docente_jefe_id: uuid.UUID

    class Config:
        from_attributes = True

class AsignaturaCreate(BaseModel):
    curso_id: uuid.UUID
    nombre_asignatura: str = Field(..., max_length=80)
    codigo_mineduc: str = Field(..., max_length=30, description="Ej: HIS04 para Historia 4° Básico")

class AsignaturaOut(AsignaturaCreate):
    asignatura_id: uuid.UUID
    docente_id: uuid.UUID

    class Config:
        from_attributes = True

class MatriculaVinculoCreate(BaseModel):
    curso_id: uuid.UUID
    estudiante_id: uuid.UUID
    apoderado_id: uuid.UUID
    parentesco: str = "Apoderado Titular"

class ComunicadoCreate(BaseModel):
    curso_id: uuid.UUID
    titulo: str = Field(..., max_length=150)
    fecha_evento: date

# --- ESQUEMAS DEL MÓDULO 2 (RAG & DOCUMENTOS) ---
class DocumentoCurricularOut(BaseModel):
    documento_id: uuid.UUID
    asignatura_id: uuid.UUID
    titulo_guia: str
    objetivo_oa: str
    nombre_archivo: str
    peso_bytes: int
    hash_sha256: str
    activo_rag: bool
    total_chunks_vectorizados: int = 0

    class Config:
        from_attributes = True

class ConsultaRAGRequest(BaseModel):
    curso_id: uuid.UUID
    asignatura_id: uuid.UUID
    pregunta: str = Field(..., min_length=4, max_length=600)
    modo_consulta: str = Field(default="ALUMNO", pattern="^(ALUMNO|PADRE)$")

class ConsultaRAGResponse(BaseModel):
    respuesta_tutor: str
    similitud_coseno_max: float
    guardrail_status: str
    motor_utilizado: str
    fuentes_curriculares: list[dict]