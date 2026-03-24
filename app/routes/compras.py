from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.models import Producto, CuentaPorPagar, Proveedor
from pydantic import BaseModel
from typing import List
from datetime import datetime

router = APIRouter(prefix="/compras", tags=["Compras"])

class ItemCompra(BaseModel):
    producto_id: int
    cantidad: int
    costo_unitario_usd: float
    es_caja: bool = False  # Si es True, compra por caja

class CompraRequest(BaseModel):
    proveedor_id: int
    items: List[ItemCompra]
    metodo_pago: str # Contado | Credito
    monto_total_usd: float

@router.post("/registrar", status_code=201)
def registrar_compra(req: CompraRequest, session: Session = Depends(get_session)):
    # 1. Verificar proveedor
    proveedor = session.get(Proveedor, req.proveedor_id)
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    # 2. Procesar cada item (Mercancía)
    for item in req.items:
        prod = session.get(Producto, item.producto_id)
        if not prod:
             raise HTTPException(status_code=404, detail=f"Producto ID {item.producto_id} no encontrado")
        
        # Calcular unidades totales a añadir
        unidades_a_añadir = item.cantidad
        if item.es_caja and prod.es_licor:
            unidades_a_añadir = item.cantidad * prod.unidades_por_caja
            
        # Actualizar inventario (entrada)
        prod.stock += unidades_a_añadir
        # Actualizar costo base (si es caja, promediamos el costo por unidad para el registro individual)
        if item.es_caja and prod.es_licor:
            prod.costo_usd = item.costo_unitario_usd / prod.unidades_por_caja
        else:
            prod.costo_usd = item.costo_unitario_usd
            
        session.add(prod)

    # 3. Generar Registro de Cuenta (CxP)
    # Si es crédito queda 'pendiente', si es contado queda 'pagado'
    nueva_cxp = CuentaPorPagar(
        proveedor_id=proveedor.id,
        monto_total=req.monto_total_usd,
        monto_pendiente=0.0 if req.metodo_pago.lower() == "contado" else req.monto_total_usd,
        estado="pagado" if req.metodo_pago.lower() == "contado" else "pendiente",
        fecha_emision=datetime.utcnow()
    )
    session.add(nueva_cxp)

    session.commit()
    session.refresh(nueva_cxp)
    return {"status": "Compra procesada exitosamente", "monto_total": req.monto_total_usd, "compra_id": nueva_cxp.id}

from fastapi.responses import FileResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import os

@router.get("/pdf/{compra_id}")
def descargar_pdf_compra(compra_id: int, session: Session = Depends(get_session)):
    compra = session.get(CuentaPorPagar, compra_id)
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    
    prov = session.get(Proveedor, compra.proveedor_id)
    prov_name = prov.nombre if prov else f"Proveedor #{compra.proveedor_id}"
    
    filename = f"compra_{compra_id}.pdf"
    path = os.path.join("temp_pdfs", filename)
    os.makedirs("temp_pdfs", exist_ok=True)
    
    c = canvas.Canvas(path, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, "DON BENI - HOJA DE RECEPCIÓN")
    c.setFont("Helvetica", 12)
    c.drawString(100, 730, f"Comprobante ID: {compra_id}")
    c.drawString(100, 715, f"Fecha: {compra.fecha_emision.strftime('%d/%m/%Y %H:%M')}")
    c.drawString(100, 700, f"Proveedor: {prov_name}")
    c.drawString(100, 685, f"RIF: {prov.rif if prov else 'N/A'}")
    c.line(100, 675, 500, 675)
    
    c.drawString(100, 650, "DETALLE DE OPERACIÓN:")
    c.drawString(120, 630, f"- Estado: {compra.estado.upper()}")
    c.drawString(120, 615, f"- Monto USD: ${compra.monto_total:.2f}")
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, 580, f"TOTAL A CARGO: ${compra.monto_total:.2f}")
    
    c.save()
    
    headers = {
        "Content-Disposition": f"attachment; filename=Recibo_DonBeni_{compra_id}.pdf"
    }
    return FileResponse(path, filename=f"Recibo_DonBeni_{compra_id}.pdf", media_type="application/pdf", headers=headers)

@router.get("/historial")
def historial_compras(session: Session = Depends(get_session)):
    # Retornamos todas las facturas de proveedores (contado y crédito) para auditoría
    return session.exec(select(CuentaPorPagar).order_by(CuentaPorPagar.id.desc())).all()

@router.delete("/{compra_id}")
def eliminar_compra(compra_id: int, session: Session = Depends(get_session)):
    compra = session.get(CuentaPorPagar, compra_id)
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    session.delete(compra)
    session.commit()
    return {"status": "Compra eliminada exitosamente"}

class CompraUpdate(BaseModel):
    monto_total: float | None = None
    monto_pendiente: float | None = None
    estado: str | None = None

@router.patch("/{compra_id}")
def actualizar_compra(compra_id: int, req: CompraUpdate, session: Session = Depends(get_session)):
    compra = session.get(CuentaPorPagar, compra_id)
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    
    if req.monto_total is not None:
        compra.monto_total = req.monto_total
    if req.monto_pendiente is not None:
        compra.monto_pendiente = req.monto_pendiente
    if req.estado is not None:
        compra.estado = req.estado
        
    session.add(compra)
    session.commit()
    session.refresh(compra)
    return compra