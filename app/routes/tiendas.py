from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.models import Tienda, TiendaRead
from app.routes.usuarios import solo_dev
from typing import List

router = APIRouter(prefix="/tiendas", tags=["Tiendas"])

@router.get("/", response_model=List[TiendaRead])
def listar_tiendas(session: Session = Depends(get_session)):
    """Lista todas las tiendas registradas."""
    return session.exec(select(Tienda)).all()

@router.post("/", response_model=TiendaRead, status_code=201)
def crear_tienda(tienda: Tienda, session: Session = Depends(get_session), _ = Depends(solo_dev)):
    """Crea una nueva tienda (Solo Dev)."""
    session.add(tienda)
    session.commit()
    session.refresh(tienda)
    return tienda

@router.get("/{tienda_id}", response_model=TiendaRead)
def obtener_tienda(tienda_id: int, session: Session = Depends(get_session)):
    tienda = session.get(Tienda, tienda_id)
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    return tienda
