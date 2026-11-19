import uuid
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.db.session import get_pg_db
from app.models.sql_models import (
    Usuario, Rol, Curso, Asignatura, Matricula, VinculoParental,
    Comunicado, DocumentoCurricular, EmbeddingVectorial, HistorialInteraccionRAG
)
from app.schemas.base_schemas import (
    TokenResponse, UsuarioCreate, CursoCreate, CursoOut,
    AsignaturaCreate, AsignaturaOut, MatriculaVinculoCreate, ComunicadoCreate,
    DocumentoCurricularOut, ConsultaRAGRequest, ConsultaRAGResponse
)
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    generate_anonymous_session_hash, require_docente, require_cualquier_rol
)
from app.core.guardrails import ChildSafetyGuardrails
from app.services.pdf_processor import PDFProcessorService
from app.services.rag_engine import HybridRAGEngine

router = APIRouter()

# 1. REGISTRO Y LOGIN CON EMISIÓN DE TOKEN JWT (CU-13 / RNF-02)
@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, tags=["Autenticación RBAC"])
async def registrar_usuario(datos: UsuarioCreate, db: AsyncSession = Depends(get_pg_db)):
    existe = await db.execute(select(Usuario).where(Usuario.email_login == datos.email_login))
    if existe.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")

    res_rol = await db.execute(select(Rol).where(Rol.nombre_rol == datos.nombre_rol))
    rol_obj = res_rol.scalar_one_or_none()
    if not rol_obj:
        raise HTTPException(status_code=400, detail="El rol especificado no existe.")

    nuevo_usuario = Usuario(
        rol_id=rol_obj.rol_id,
        email_login=datos.email_login,
        password_hash=get_password_hash(datos.password),
        nombre_visible=datos.nombre_visible,
        alias_infantil=datos.alias_infantil if datos.nombre_rol == "ESTUDIANTE" else None
    )
    db.add(nuevo_usuario)
    await db.commit()
    await db.refresh(nuevo_usuario)

    token = create_access_token(str(nuevo_usuario.usuario_id), rol_obj.nombre_rol)
    return TokenResponse(
        access_token=token,
        rol_activo=rol_obj.nombre_rol,
        usuario_id=nuevo_usuario.usuario_id,
        nombre_visible=nuevo_usuario.nombre_visible,
        alias_infantil=nuevo_usuario.alias_infantil
    )

@router.post("/auth/login", response_model=TokenResponse, tags=["Autenticación RBAC"])
async def login_jwt(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_pg_db)):
    res = await db.execute(select(Usuario).where(Usuario.email_login == form_data.username))
    user = res.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Correo o contraseña incorrectos")

    token = create_access_token(str(user.usuario_id), user.rol.nombre_rol)
    return TokenResponse(
        access_token=token,
        rol_activo=user.rol.nombre_rol,
        usuario_id=user.usuario_id,
        nombre_visible=user.nombre_visible,
        alias_infantil=user.alias_infantil
    )

# 2. GESTIÓN DE CURSOS Y ASIGNATURAS (CU-01 / HU-01)
@router.post("/cursos", response_model=CursoOut, status_code=status.HTTP_201_CREATED, tags=["Gestión Académica (Docente)"])
async def crear_curso(
    datos: CursoCreate,
    docente: Usuario = Depends(require_docente),
    db: AsyncSession = Depends(get_pg_db)
):
    nuevo_curso = Curso(
        docente_jefe_id=docente.usuario_id,
        nivel_basico=datos.nivel_basico,
        letra_paralelo=datos.letra_paralelo.upper(),
        anio_lectivo=datos.anio_lectivo
    )

    existe_curso = await db.execute(
        select(Curso).where(
            Curso.nivel_basico == datos.nivel_basico,
            Curso.letra_paralelo == datos.letra_paralelo.upper(),
            Curso.anio_lectivo == datos.anio_lectivo,
        )
    )
    if existe_curso.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Ya existe un curso registrado con ese nivel, paralelo y año lectivo.",
        )
    db.add(nuevo_curso)
    await db.commit()
    await db.refresh(nuevo_curso)
    return nuevo_curso

@router.get("/cursos", response_model=list[CursoOut], tags=["Gestión Académica (Docente)"])
async def listar_cursos(
    usuario: Usuario = Depends(require_cualquier_rol),
    db: AsyncSession = Depends(get_pg_db)
):
    res = await db.execute(select(Curso))
    return res.scalars().all()

@router.post("/asignaturas", response_model=AsignaturaOut, status_code=status.HTTP_201_CREATED, tags=["Gestión Académica (Docente)"])
async def crear_asignatura(
    datos: AsignaturaCreate,
    docente: Usuario = Depends(require_docente),
    db: AsyncSession = Depends(get_pg_db)
):
    nueva_asig = Asignatura(
        curso_id=datos.curso_id,
        docente_id=docente.usuario_id,
        nombre_asignatura=datos.nombre_asignatura,
        codigo_mineduc=datos.codigo_mineduc.upper()
    )
    db.add(nueva_asig)
    await db.commit()
    await db.refresh(nueva_asig)
    return nueva_asig

# 3. MATRÍCULA Y VÍNCULO PARENTAL (CU-01 / HU-02)
@router.post("/matriculas-vinculo", status_code=status.HTTP_201_CREATED, tags=["Gestión Académica (Docente)"])
async def matricular_y_vincular_apoderado(
    datos: MatriculaVinculoCreate,
    docente: Usuario = Depends(require_docente),
    db: AsyncSession = Depends(get_pg_db)
):
    nueva_matricula = Matricula(curso_id=datos.curso_id, estudiante_id=datos.estudiante_id)
    nuevo_vinculo = VinculoParental(
        apoderado_id=datos.apoderado_id,
        estudiante_id=datos.estudiante_id,
        parentesco=datos.parentesco,
        autorizado_utp=True
    )
    db.add_all([nueva_matricula, nuevo_vinculo])
    await db.commit()
    return {"mensaje": "Alumno matriculado y vinculado exitosamente con su apoderado mediador."}

# 4. COMUNICADOS ESCOLARES (CU-03 / HU-05)
@router.post("/comunicados", status_code=status.HTTP_201_CREATED, tags=["Comunicación Escolar"])
async def publicar_comunicado(
    datos: ComunicadoCreate,
    docente: Usuario = Depends(require_docente),
    db: AsyncSession = Depends(get_pg_db)
):
    comunicado = Comunicado(
        curso_id=datos.curso_id,
        docente_id=docente.usuario_id,
        titulo=datos.titulo,
        fecha_evento=datos.fecha_evento
    )
    db.add(comunicado)
    await db.commit()
    await db.refresh(comunicado)
    return {"mensaje": "Comunicado publicado", "comunicado_id": comunicado.comunicado_id}

# 5. CARGA DE GUÍAS PDF EN SERVIDOR Y VECTORIZACIÓN EN PGVECTOR (CU-02 / HU-03 y HU-04)
@router.post("/documentos/subir-y-vectorizar", response_model=DocumentoCurricularOut, status_code=status.HTTP_201_CREATED, tags=["Motor Híbrido RAG e Ingesta"])
async def subir_y_vectorizar_guia_pdf(
    asignatura_id: uuid.UUID = Form(...),
    titulo_guia: str = Form(...),
    objetivo_oa: str = Form(..., description="Ej: OA 04 - Pueblos Originarios"),
    activo_rag: bool = Form(True),
    archivo_pdf: UploadFile = File(...),
    docente: Usuario = Depends(require_docente),
    db: AsyncSession = Depends(get_pg_db)
):
    if not archivo_pdf.filename or not archivo_pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se permiten documentos en formato PDF.")

    contenido_bytes = await archivo_pdf.read()
    hash_archivo = PDFProcessorService.compute_sha256(contenido_bytes)

    chunks = PDFProcessorService.extract_and_chunk_pdf(contenido_bytes)

    nombre_seguro = f"{uuid.uuid4()}_{archivo_pdf.filename.replace(' ', '_')}"
    ruta_fisica = settings.STORAGE_DIR / nombre_seguro
    async with aiofiles.open(ruta_fisica, "wb") as f:
        await f.write(contenido_bytes)

    nuevo_doc = DocumentoCurricular(
        asignatura_id=asignatura_id,
        titulo_guia=titulo_guia,
        objetivo_oa=objetivo_oa,
        nombre_archivo=archivo_pdf.filename,
        ruta_servidor=str(ruta_fisica),
        peso_bytes=len(contenido_bytes),
        hash_sha256=hash_archivo,
        activo_rag=activo_rag
    )
    db.add(nuevo_doc)
    await db.flush()

    for item in chunks:
        vector_768 = await HybridRAGEngine.generate_embedding_768(item["texto_fragmento"])
        nuevo_emb = EmbeddingVectorial(
            documento_id=nuevo_doc.documento_id,
            chunk_index=item["chunk_index"],
            pagina_origen=item["pagina_origen"],
            texto_fragmento=item["texto_fragmento"],
            embedding=vector_768,
            hash_sha256=item["hash_sha256"]
        )
        db.add(nuevo_emb)

    await db.commit()
    await db.refresh(nuevo_doc)

    respuesta = DocumentoCurricularOut.model_validate(nuevo_doc)
    respuesta.total_chunks_vectorizados = len(chunks)
    return respuesta

# 6. DESCARGA DE PDF PARA MODO OFFLINE-FIRST EN SQLITE (CU-06 / HU-08 y HU-09)
@router.get("/documentos/{documento_id}/descargar", tags=["Sincronización Offline-First"])
async def descargar_guia_pdf(
    documento_id: uuid.UUID,
    usuario: Usuario = Depends(require_cualquier_rol),
    db: AsyncSession = Depends(get_pg_db)
):
    res = await db.execute(select(DocumentoCurricular).where(DocumentoCurricular.documento_id == documento_id))
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Guía curricular no encontrada.")
    return FileResponse(path=doc.ruta_servidor, filename=doc.nombre_archivo, media_type="application/pdf")

# 7. CONSULTA AL TUTOR IA SOCRÁTICO Y MODO "AYÚDAME A AYUDAR" (CU-05 y CU-08)
@router.post("/rag/consultar", response_model=ConsultaRAGResponse, tags=["Motor Híbrido RAG e Ingesta"])
async def consultar_tutor_rag(
    datos: ConsultaRAGRequest,
    usuario: Usuario = Depends(require_cualquier_rol),
    db: AsyncSession = Depends(get_pg_db)
):
    hash_anonimo = generate_anonymous_session_hash(str(usuario.usuario_id), str(datos.curso_id))

    es_seguro, estado_guardrail, msg_contencion = ChildSafetyGuardrails.validate_prompt(datos.pregunta)
    if not es_seguro:
        log_bloq = HistorialInteraccionRAG(
            curso_id=datos.curso_id,
            asignatura_id=datos.asignatura_id,
            hash_sesion_anon=hash_anonimo,
            modo_consulta=datos.modo_consulta,
            topico_detectado="FILTRO_GUARDRAIL",
            similitud_coseno=0.0,
            guardrail_status=estado_guardrail
        )
        db.add(log_bloq)
        await db.commit()
        return ConsultaRAGResponse(
            respuesta_tutor=msg_contencion,
            similitud_coseno_max=0.0,
            guardrail_status=estado_guardrail,
            motor_utilizado="GUARDRAIL_DETERMINISTA",
            fuentes_curriculares=[]
        )

    texto_busqueda = await HybridRAGEngine.build_retrieval_query(
        db=db,
        asignatura_id=datos.asignatura_id,
        pregunta_usuario=datos.pregunta
    )
    vector_pregunta = await HybridRAGEngine.generate_embedding_768(texto_busqueda)
    chunks_relevantes = await HybridRAGEngine.retrieve_relevant_chunks(
        db=db,
        asignatura_id=datos.asignatura_id,
        query_vector=vector_pregunta,
        top_k=3
    )

    max_sim = max([c["similitud"] for c in chunks_relevantes], default=0.0)
    umbral_efectivo = min(settings.RAG_SIMILARITY_THRESHOLD, 0.45) if datos.modo_consulta == "PADRE" else settings.RAG_SIMILARITY_THRESHOLD

    if not chunks_relevantes or max_sim < umbral_efectivo:
        msg_fuera_contexto = (
            "Revisé con mucho cuidado todas las guías que ha subido tu profesor, "
            "pero esa información no aparece en el material de la asignatura. "
            "¡Te recomiendo anotar esta duda para preguntársela al profesor en la próxima clase!"
        )
        log_fuera = HistorialInteraccionRAG(
            curso_id=datos.curso_id,
            asignatura_id=datos.asignatura_id,
            hash_sesion_anon=hash_anonimo,
            modo_consulta=datos.modo_consulta,
            topico_detectado="FUERA_DE_CONTEXTO_DOCENTE",
            similitud_coseno=max_sim,
            guardrail_status="BLOQUEADO_SIN_CONTEXTO"
        )
        db.add(log_fuera)
        await db.commit()
        return ConsultaRAGResponse(
            respuesta_tutor=msg_fuera_contexto,
            similitud_coseno_max=round(max_sim, 4),
            guardrail_status="BLOQUEADO_SIN_CONTEXTO",
            motor_utilizado="PGVECTOR_THRESHOLD_FILTER",
            fuentes_curriculares=[]
        )

    topico_oa = chunks_relevantes[0]["objetivo_oa"]
    respuesta_ia, motor_usado = await HybridRAGEngine.generate_socratic_response(
        pregunta_usuario=datos.pregunta,
        chunks_recuperados=chunks_relevantes,
        modo=datos.modo_consulta
    )

    log_ok = HistorialInteraccionRAG(
        curso_id=datos.curso_id,
        asignatura_id=datos.asignatura_id,
        hash_sesion_anon=hash_anonimo,
        modo_consulta=datos.modo_consulta,
        topico_detectado=topico_oa,
        similitud_coseno=max_sim,
        guardrail_status="APROBADO"
    )
    db.add(log_ok)
    await db.commit()

    return ConsultaRAGResponse(
        respuesta_tutor=respuesta_ia,
        similitud_coseno_max=round(max_sim, 4),
        guardrail_status="APROBADO",
        motor_utilizado=motor_usado,
        fuentes_curriculares=[
            {"guia": c["titulo_guia"], "oa": c["objetivo_oa"], "pagina": c["pagina_origen"], "similitud": round(c["similitud"], 3)}
            for c in chunks_relevantes
        ]
    )

# 8. AUDITORÍA ANÓNIMA Y KPI-03 PARA EL DOCENTE (CU-04 / HU-06)
@router.get("/rag/metricas-curso/{curso_id}", tags=["Auditoría Docente y KPIs"])
async def obtener_metricas_anonimas_curso(
    curso_id: uuid.UUID,
    docente: Usuario = Depends(require_docente),
    db: AsyncSession = Depends(get_pg_db)
):
    res_total = await db.execute(
        select(func.count(HistorialInteraccionRAG.interaccion_id))
        .where(HistorialInteraccionRAG.curso_id == curso_id)
    )
    total_consultas = res_total.scalar() or 0

    res_aprobadas = await db.execute(
        select(func.count(HistorialInteraccionRAG.interaccion_id))
        .where(
            HistorialInteraccionRAG.curso_id == curso_id,
            HistorialInteraccionRAG.guardrail_status == "APROBADO"
        )
    )
    aprobadas = res_aprobadas.scalar() or 0

    res_topicos = await db.execute(
        select(HistorialInteraccionRAG.topico_detectado, func.count(HistorialInteraccionRAG.interaccion_id))
        .where(HistorialInteraccionRAG.curso_id == curso_id)
        .group_by(HistorialInteraccionRAG.topico_detectado)
    )
    desglose_oa = {fila[0]: fila[1] for fila in res_topicos.all() if fila[0]}

    return {
        "curso_id": curso_id,
        "total_interacciones_procesadas": total_consultas,
        "consultas_contextualizadas_exitosas": aprobadas,
        "kpi_03_tasa_precision_rag_porcentaje": round((aprobadas / total_consultas * 100), 2) if total_consultas > 0 else 100.0,
        "objetivos_aprendizaje_mas_consultados": desglose_oa
    }