from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import Proveedor, CuentaPorPagar
from app.routes.usuarios import obtener_usuario_actual
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/proveedores", tags=["Proveedores"])

class ProveedorCreate(BaseModel):
    rif: str
    nombre: str
    contacto: Optional[str] = None

@router.get("/")
def listar_proveedores(
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    tienda_id = usuario.get("tienda_id")
    proveedores = session.exec(select(Proveedor)).all()
    
    resultado = []
    for p in proveedores:
        balance = session.exec(
            select(func.sum(CuentaPorPagar.monto_pendiente))
            .where(
                CuentaPorPagar.proveedor_id == p.id, 
                CuentaPorPagar.estado != "pagado",
                CuentaPorPagar.tienda_id == tienda_id
            )
        ).one() or 0
        
        p_data = p.model_dump()
        p_data["balance_pendiente"] = round(float(balance), 2)
        resultado.append(p_data)
        
    return resultado

@router.post("/", status_code=201)
def crear_proveedor(
    data: ProveedorCreate, 
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    existente = session.exec(select(Proveedor).where(Proveedor.rif == data.rif)).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un proveedor con ese RIF")
    
    proveedor = Proveedor(rif=data.rif, nombre=data.nombre, contacto=data.contacto)
    session.add(proveedor)
    session.commit()
    session.refresh(proveedor)
    return proveedor

@router.get("/{proveedor_id}/facturas")
def obtener_facturas_proveedor(
    proveedor_id: int, 
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    tienda_id = usuario.get("tienda_id")
    facturas = session.exec(
        select(CuentaPorPagar)
        .where(
            CuentaPorPagar.proveedor_id == proveedor_id,
            CuentaPorPagar.tienda_id == tienda_id
        )
        .order_by(CuentaPorPagar.fecha_emision.desc())
    ).all()
    return facturas