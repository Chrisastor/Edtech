from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_pg_db
from app.models.sql_models import (
    Usuario, Rol, Curso, Asignatura, Matricula, VinculoParental, Comunicado
)
from app.schemas.base_schemas import (
    TokenResponse, UsuarioCreate, CursoCreate, CursoOut,
    AsignaturaCreate, AsignaturaOut, MatriculaVinculoCreate, ComunicadoCreate
)
from app.core.security import (
    verify_password, get_password_hash, create_access_token, 
    require_docente, require_cualquier_rol
)

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

# 2. GESTIÓN DE CURSOS Y ASIGNATURAS (CU-01 / HU-01 - Exclusivo DOCENTE_UTP)
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