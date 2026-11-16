import uuid
from datetime import datetime, date
from sqlalchemy import (
    String, Integer, SmallInteger, Float, Boolean, Text, ForeignKey, 
    DateTime, Date, CheckConstraint, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.db.session import Base

# 1. ROLES (RBAC)
class Rol(Base):
    __tablename__ = "roles"

    rol_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre_rol: Mapped[str] = mapped_column(String(30), unique=True, nullable=False) # DOCENTE_UTP, ESTUDIANTE, APODERADO
    permisos_rbac: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    usuarios: Mapped[list["Usuario"]] = relationship(back_populates="rol")

# 2. USUARIOS (Con alias_infantil para privacidad de menores)
class Usuario(Base):
    __tablename__ = "usuarios"

    usuario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rol_id: Mapped[int] = mapped_column(ForeignKey("roles.rol_id"), nullable=False)
    email_login: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre_visible: Mapped[str] = mapped_column(String(100), nullable=False)
    alias_infantil: Mapped[str | None] = mapped_column(String(50), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    rol: Mapped["Rol"] = relationship(back_populates="usuarios", lazy="joined")

# 3. VINCULO_PARENTAL (Prevención de vulnerabilidad BOLA/IDOR)
class VinculoParental(Base):
    __tablename__ = "vinculo_parental"

    vinculo_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    apoderado_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.usuario_id", ondelete="CASCADE"), nullable=False)
    estudiante_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.usuario_id", ondelete="CASCADE"), nullable=False)
    parentesco: Mapped[str] = mapped_column(String(40), nullable=False, default="Apoderado")
    autorizado_utp: Mapped[bool] = mapped_column(Boolean, default=True)

# 4. CURSOS (Restringido por regla de negocio a 1° a 6° Básico)
class Curso(Base):
    __tablename__ = "cursos"
    __table_args__ = (
        CheckConstraint("nivel_basico >= 1 AND nivel_basico <= 6", name="chk_nivel_basico_1_a_6"),
    )

    curso_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    docente_jefe_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.usuario_id"), nullable=False)
    nivel_basico: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    letra_paralelo: Mapped[str] = mapped_column(String(1), nullable=False)
    anio_lectivo: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=2026)

# 5. MATRICULAS
class Matricula(Base):
    __tablename__ = "matriculas"
    __table_args__ = (
        UniqueConstraint("curso_id", "estudiante_id", name="uq_matricula_curso_estudiante"),
    )

    matricula_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    curso_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cursos.curso_id", ondelete="CASCADE"), nullable=False)
    estudiante_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.usuario_id", ondelete="CASCADE"), nullable=False)
    estado_alumno: Mapped[str] = mapped_column(String(20), default="REGULAR")

# 6. ASIGNATURAS (Alineadas con código oficial MINEDUC)
class Asignatura(Base):
    __tablename__ = "asignaturas"

    asignatura_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    curso_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cursos.curso_id", ondelete="CASCADE"), nullable=False)
    docente_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.usuario_id"), nullable=False)
    nombre_asignatura: Mapped[str] = mapped_column(String(80), nullable=False)
    codigo_mineduc: Mapped[str] = mapped_column(String(30), nullable=False)

# 7. DOCUMENTOS_CURRICULARES (Índice de los PDFs físicos guardados en el servidor)
class DocumentoCurricular(Base):
    __tablename__ = "documentos_curriculares"

    documento_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asignatura_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("asignaturas.asignatura_id", ondelete="CASCADE"), nullable=False, index=True)
    titulo_guia: Mapped[str] = mapped_column(String(150), nullable=False)
    objetivo_oa: Mapped[str] = mapped_column(String(50), nullable=False) # Ej: 'OA 04'
    nombre_archivo: Mapped[str] = mapped_column(String(255), nullable=False)
    ruta_servidor: Mapped[str] = mapped_column(String(500), unique=True, nullable=False) # Ruta en storage/guias_pdf/
    peso_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    hash_sha256: Mapped[str] = mapped_column(String(64), nullable=False) # Sincronización diferencial con SQLite móvil
    activo_rag: Mapped[bool] = mapped_column(Boolean, default=True)
    subido_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    embeddings: Mapped[list["EmbeddingVectorial"]] = relationship(back_populates="documento", cascade="all, delete-orphan")

# 8. EMBEDDINGS_VECTORIALES (Fragmento de texto + Vector de 768 dimensiones + Índice HNSW)
class EmbeddingVectorial(Base):
    __tablename__ = "embeddings_vectoriales"

    embedding_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    documento_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documentos_curriculares.documento_id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    pagina_origen: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    texto_fragmento: Mapped[str] = mapped_column(Text, nullable=False) # Chunk de 500 tokens almacenado directamente
    embedding: Mapped[list[float]] = mapped_column(Vector(768), nullable=False)
    hash_sha256: Mapped[str] = mapped_column(String(64), nullable=False)

    documento: Mapped["DocumentoCurricular"] = relationship(back_populates="embeddings")

    __table_args__ = (
        Index(
            "idx_embeddings_hnsw",
            embedding,
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"}
        ),
    )

# 9. COMUNICADOS
class Comunicado(Base):
    __tablename__ = "comunicados"

    comunicado_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    curso_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cursos.curso_id", ondelete="CASCADE"), nullable=False)
    docente_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.usuario_id"), nullable=False)
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    fecha_evento: Mapped[date] = mapped_column(Date, nullable=False)

# 10. HISTORIAL_INTERACCIONES_RAG (Trazabilidad anónima para KPI-03 y HU-06)
class HistorialInteraccionRAG(Base):
    __tablename__ = "historial_interacciones_rag"

    interaccion_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    curso_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cursos.curso_id", ondelete="CASCADE"), nullable=False, index=True)
    asignatura_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("asignaturas.asignatura_id", ondelete="CASCADE"), nullable=False)
    hash_sesion_anon: Mapped[str] = mapped_column(String(64), nullable=False) # SHA-256 irreversible (Sin PII infantil)
    modo_consulta: Mapped[str] = mapped_column(String(20), nullable=False) # 'ALUMNO' o 'PADRE'
    topico_detectado: Mapped[str | None] = mapped_column(String(100), nullable=True)
    similitud_coseno: Mapped[float] = mapped_column(Float, nullable=False)
    guardrail_status: Mapped[str] = mapped_column(String(20), nullable=False) # 'APROBADO' o 'BLOQUEADO'
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)