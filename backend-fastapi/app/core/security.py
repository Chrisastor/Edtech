import hashlib
from datetime import datetime, timedelta, timezone
from typing import Sequence
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.db.session import get_pg_db
from app.models.sql_models import Usuario

# Hashing Bcrypt con sal aleatoria automática (Norma ISO/IEC 27001)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def generate_anonymous_session_hash(usuario_id: str, curso_id: str) -> str:
    """
    Aplica Privacy by Design (Ley 19.628 / 21.719 y COPPA):
    Transforma el ID del menor en un hash SHA-256 unidireccional para las métricas docentes.
    """
    raw = f"{usuario_id}:{curso_id}:{settings.JWT_SECRET_KEY}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def create_access_token(usuario_id: str, rol_nombre: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": str(usuario_id),
        "rol": rol_nombre,
        "exp": expire
    }
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_pg_db)
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales de autenticación JWT inválidas o expiradas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        usuario_id: str | None = payload.get("sub")
        if usuario_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    result = await db.execute(select(Usuario).where(Usuario.usuario_id == usuario_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user

class RoleChecker:
    """
    Implementación de Control de Acceso Basado en Roles (RBAC - Anderson, 2020).
    Valida criptográficamente el rol antes de ejecutar el endpoint.
    """
    def __init__(self, allowed_roles: Sequence[str]):
        self.allowed_roles = allowed_roles

    async def __call__(self, current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.rol.nombre_rol not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operación rechazada por política RBAC. Rol requerido: {self.allowed_roles}"
            )
        return current_user

# Instancias listas para proteger endpoints por perfil
require_docente = RoleChecker(["DOCENTE_UTP"])
require_estudiante = RoleChecker(["ESTUDIANTE"])
require_apoderado = RoleChecker(["APODERADO"])
require_cualquier_rol = RoleChecker(["DOCENTE_UTP", "ESTUDIANTE", "APODERADO"])