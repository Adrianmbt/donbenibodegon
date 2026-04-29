from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select
from jose import jwt, JWTError
from typing import List

from app.database import get_session
from app.models import Usuario, UsuarioCreate, UsuarioRead, UsuarioUpdate
from app.services.auth import (  # <-- ruta correcta: services/auth.py
    verificar_password,
    crear_token_acceso,
    obtener_password_hash,
    SECRET_KEY,
    ALGORITHM,
)



router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/usuarios/login")


# ── Dependencias de seguridad ─────────────────────────────────

def obtener_usuario_actual(token: str = Depends(oauth2_scheme)) -> dict:
    """Decodifica el token JWT y retorna el payload del usuario."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        rol: str = payload.get("rol")
        tienda_id: int = payload.get("tienda_id")
        if username is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        return {"username": username, "rol": rol, "tienda_id": tienda_id}
    except JWTError:
        raise HTTPException(status_code=401, detail="Error de autenticación")


def solo_dev(usuario: dict = Depends(obtener_usuario_actual)) -> dict:
    """Restringe el acceso exclusivamente al rol 'dev'."""
    if usuario["rol"] != "dev":
        raise HTTPException(status_code=403, detail="Acceso denegado: se requiere rol 'dev'")
    return usuario


# ── LOGIN ────────────────────────────────────────────────────
@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    """Verifica credenciales y devuelve un token JWT de 8 horas."""
    user = session.exec(
        select(Usuario).where(Usuario.username == form_data.username)
    ).first()

    if not user or not verificar_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos")

    access_token = crear_token_acceso(data={
        "sub": user.username, 
        "rol": user.rol,
        "tienda_id": user.tienda_id
    })
    return {"access_token": access_token, "token_type": "bearer"}


# ── CREATE ───────────────────────────────────────────────────
@router.post("/", response_model=UsuarioRead, status_code=201)
def crear_usuario(data: UsuarioCreate, session: Session = Depends(get_session)):
    """Crea un nuevo usuario con la contraseña hasheada con bcrypt."""
    existente = session.exec(
        select(Usuario).where(Usuario.username == data.username)
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="El username ya está en uso")

    nuevo = Usuario(
        username=data.username,
        nombre=data.nombre,
        password_hash=obtener_password_hash(data.password),
        rol=data.rol,
        tienda_id=data.tienda_id
    )
    session.add(nuevo)
    session.commit()
    session.refresh(nuevo)
    return nuevo


# ── READ ALL ─────────────────────────────────────────────────
@router.get("/", response_model=List[UsuarioRead])
def listar_usuarios(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """Lista usuarios según el rol del solicitante."""
    rol_solicitante = usuario_actual.get("rol", "").lower()
    tienda_id = usuario_actual.get("tienda_id")

    if rol_solicitante == "dev":
        # Dev ve a todo el mundo
        return session.exec(select(Usuario)).all()
    elif rol_solicitante == "propietario":
        # Propietario ve a todos
        return session.exec(select(Usuario)).all()
    elif rol_solicitante == "admin":
        # Admin ve a todos los de su tienda menos a los dev/propietario
        return session.exec(
            select(Usuario).where(
                Usuario.tienda_id == tienda_id, 
                Usuario.rol.notin_(["dev", "propietario"])
            )
        ).all()
    else:
        # Vendedor no debería ver la lista de usuarios
        raise HTTPException(status_code=403, detail="No tienes permisos para ver esta lista")


# ── READ ONE ─────────────────────────────────────────────────
@router.get("/{usuario_id}", response_model=UsuarioRead)
def obtener_usuario(
    usuario_id: int, 
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """Devuelve un usuario por su ID (respetando invisibilidad del dev)."""
    usuario = session.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Si el usuario buscado es dev y el solicitante no es dev, ocultarlo
    if usuario.rol == "dev" and usuario_actual["rol"] != "dev":
         raise HTTPException(status_code=404, detail="Usuario no encontrado")
         
    return usuario


# ── VERIFY ADMIN CODE ─────────────────────────────────────────
@router.post("/verificar-autorizacion")
def verificar_autorizacion(
    admin_username: str, 
    admin_password: str, 
    session: Session = Depends(get_session)
):
    """Verifica si las credenciales pertenecen a un administrador para permitir acciones sensibles."""
    user = session.exec(
        select(Usuario).where(Usuario.username == admin_username)
    ).first()

    if not user or user.rol not in ["admin", "dev"]:
        return {"valid": False, "message": "No eres administrador"}

    if not verificar_password(admin_password, user.password_hash):
        return {"valid": False, "message": "Contraseña de administrador incorrecta"}

    return {"valid": True, "message": "Autorizado"}


# ── UPDATE ───────────────────────────────────────────────────
@router.patch("/{usuario_id}", response_model=UsuarioRead)
def actualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """Actualiza parcialmente username, contraseña y/o rol."""
    usuario = session.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Seguridad: Un admin no puede editar a un dev
    if usuario.rol == "dev" and usuario_actual["rol"] != "dev":
        raise HTTPException(status_code=403, detail="No puedes modificar a este usuario")

    if data.username is not None:
        conflicto = session.exec(
            select(Usuario).where(
                Usuario.username == data.username, Usuario.id != usuario_id
            )
        ).first()
        if conflicto:
            raise HTTPException(status_code=400, detail="El username ya está en uso")
        usuario.username = data.username

    if data.nombre is not None:
        usuario.nombre = data.nombre

    if data.password is not None:
        usuario.password_hash = obtener_password_hash(data.password)

    if data.rol is not None:
        usuario.rol = data.rol

    if data.tienda_id is not None:
        usuario.tienda_id = data.tienda_id

    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario


# ── DELETE (dev o admin) ─────────────────────────────────────────
@router.delete("/{usuario_id}")
def eliminar_usuario(
    usuario_id: int,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """Elimina un usuario. Admin puede borrar vendedores. Dev puede borrar admin+vendedores."""
    usuario = session.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Reglas de eliminación
    if usuario.rol == "dev":
        raise HTTPException(status_code=403, detail="El usuario desarrollador no puede ser eliminado")
    
    if usuario_actual["rol"] == "admin" and usuario.rol == "admin":
        # Un admin no puede borrar a otro admin (opcional, pero seguro)
        raise HTTPException(status_code=403, detail="Un administrador no puede eliminar a otro")

    if usuario_actual["rol"] not in ["admin", "dev"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar usuarios")

    session.delete(usuario)
    session.commit()
    return {"message": "Usuario eliminado exitosamente"}