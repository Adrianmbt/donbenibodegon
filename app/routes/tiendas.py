from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.models import Tienda, Usuario
from app.routes.usuarios import obtener_usuario_actual, solo_dev
from app.services.auth import crear_token_acceso
from typing import List

router = APIRouter(prefix="/tiendas", tags=["Tiendas"])

@router.get("/", response_model=List[Tienda])
def listar_tiendas(session: Session = Depends(get_session)):
    return session.exec(select(Tienda)).all()

@router.get("/{tienda_id}", response_model=Tienda)
def obtener_tienda(tienda_id: int, session: Session = Depends(get_session)):
    tienda = session.get(Tienda, tienda_id)
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    return tienda

@router.post("/switch/{tienda_id}")
def switch_tienda(
    tienda_id: int,
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    """Permite al usuario 'dev' cambiar su tienda activa y obtener un nuevo token."""
    if usuario["rol"] != "dev":
        raise HTTPException(status_code=403, detail="Solo el desarrollador puede cambiar de tienda libremente")
    
    tienda = session.get(Tienda, tienda_id)
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    # Actualizar la tienda del usuario en la DB
    db_user = session.exec(select(Usuario).where(Usuario.username == usuario["username"])).first()
    if db_user:
        db_user.tienda_id = tienda_id
        session.add(db_user)
        session.commit()
    
    # Generar nuevo token con el nuevo tienda_id
    access_token = crear_token_acceso(data={
        "sub": usuario["username"], 
        "rol": usuario["rol"],
        "tienda_id": tienda_id
    })
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "tienda": tienda.nombre
    }
