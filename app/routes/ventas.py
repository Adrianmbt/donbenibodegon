from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List
from app.database import get_session
from app.models import Venta, VentaDetalle, Producto, ExchangeRate, VentaRead, VentaDetalleRead, Cliente, ProductoTienda, Tienda
from app.routes.usuarios import obtener_usuario_actual
from fastapi.responses import FileResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import os
from datetime import datetime

router = APIRouter(prefix="/ventas", tags=["Ventas"])


# ── Schemas de entrada ────────────────────────────────────────
class VentaItem(BaseModel):
    producto_id: int
    cantidad: int
    es_caja: bool = False  # Si es True, vende por caja

class VentaRequest(BaseModel):
    items: List[VentaItem]
    metodo: str        # Efectivo | Punto de Venta | Pago Móvil | Biopago | Divisa | Crédito
    usuario_id: int
    cliente_id: int | None = None
    referencia: str | None = None


# ── CREATE (procesar venta) ───────────────────────────────────
@router.post("/procesar", response_model=VentaRead, status_code=201)
async def procesar_venta(
    req: VentaRequest, 
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    """Registra una venta, descuenta stock de la tienda y devuelve el resumen completo."""
    tienda_id = usuario["tienda_id"]
    if not tienda_id:
        raise HTTPException(status_code=403, detail="Debes estar asignado a una tienda para procesar ventas")

    tasa = session.exec(
        select(ExchangeRate).order_by(ExchangeRate.id.desc())
    ).first()
    
    if not tasa:
        try:
            from app.services.scraper import get_bcv_rate
            valor = await get_bcv_rate()
            tasa = ExchangeRate(rate=valor)
            session.add(tasa)
            session.flush()
        except Exception:
            raise HTTPException(status_code=400, detail="No hay tasa BCV registrada.")

    nueva_venta = Venta(
        total_usd=0,
        tasa_bcv=tasa.rate,
        usuario_id=req.usuario_id,
        tienda_id=tienda_id,
        cliente_id=req.cliente_id,
        metodo_pago=req.metodo,
        referencia=req.referencia,
        fecha=datetime.utcnow()
    )
    session.add(nueva_venta)
    session.flush()

    total_venta = 0.0
    for item in req.items:
        # Buscamos el registro de la tienda
        pt = session.exec(
            select(ProductoTienda).where(
                ProductoTienda.producto_id == item.producto_id,
                ProductoTienda.tienda_id == tienda_id
            )
        ).first()
        
        if not pt:
            raise HTTPException(status_code=404, detail=f"Producto ID {item.producto_id} no registrado en esta tienda")
        
        prod = pt.producto # Info global (nombre, unidades por caja)
        
        # Calcular unidades totales a descontar
        unidades_a_descontar = item.cantidad
        precio_a_usar = pt.precio_usd
        
        if item.es_caja and prod.es_licor:
            unidades_a_descontar = item.cantidad * prod.unidades_por_caja
            precio_a_usar = pt.precio_caja_usd

        if pt.stock < unidades_a_descontar:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para '{prod.nombre}'. Disponible: {pt.stock}")

        pt.stock -= unidades_a_descontar
        session.add(pt)

        detalle = VentaDetalle(
            venta_id=nueva_venta.id,
            producto_id=prod.id,
            cantidad=item.cantidad,
            precio_unitario_usd=precio_a_usar,
        )
        
        total_venta += precio_a_usar * item.cantidad
        session.add(detalle)

    nueva_venta.total_usd = total_venta
    session.commit()
    
    # Recargar con relaciones
    statement = select(Venta).where(Venta.id == nueva_venta.id).options(
        selectinload(Venta.detalles).selectinload(VentaDetalle.producto)
    )
    return session.exec(statement).one()


# ── READ ALL (Historial) ──────────────────────────────────────
@router.get("/", response_model=List[VentaRead])
@router.get("/historial", response_model=List[VentaRead])
def listar_ventas(
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    """Lista ventas filtrando por tienda (excepto para dev/propietario)."""
    tienda_id = usuario["tienda_id"]
    rol = usuario["rol"]

    statement = select(Venta).order_by(Venta.id.desc()).options(
        selectinload(Venta.detalles).selectinload(VentaDetalle.producto)
    )

    if rol not in ["dev", "propietario"] and tienda_id:
        statement = statement.where(Venta.tienda_id == tienda_id)
        
    return session.exec(statement).all()


# ── READ ONE ─────────────────────────────────────────────────
@router.get("/{venta_id}", response_model=VentaRead)
def obtener_venta(
    venta_id: int, 
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    tienda_id = usuario["tienda_id"]
    rol = usuario["rol"]

    statement = select(Venta).where(Venta.id == venta_id).options(
        selectinload(Venta.detalles).selectinload(VentaDetalle.producto)
    )
    venta = session.exec(statement).first()
    
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    # Verificación de tienda
    if rol not in ["dev", "propietario"] and venta.tienda_id != tienda_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta venta")

    return venta


# ── GENERAR PDF (Recibo) ──────────────────────────────────────
@router.get("/pdf/{venta_id}")
def descargar_pdf_venta(
    venta_id: int, 
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    statement = select(Venta).where(Venta.id == venta_id).options(
        selectinload(Venta.detalles).selectinload(VentaDetalle.producto),
        selectinload(Venta.tienda)
    )
    venta = session.exec(statement).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    tienda_nombre = venta.tienda.nombre if venta.tienda else "DON BENI"
    
    cliente = session.get(Cliente, venta.cliente_id) if venta.cliente_id else None
    cliente_name = cliente.nombre if cliente else "Consumidor Final"
    
    filename = f"venta_{venta_id}.pdf"
    path = os.path.join("temp_pdfs", filename)
    os.makedirs("temp_pdfs", exist_ok=True)
    
    c = canvas.Canvas(path, pagesize=letter)
    
    # Estilos de Factura
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, f"{tienda_nombre.upper()} - COMPROBANTE")
    c.setFont("Helvetica", 10)
    c.drawString(50, 735, "BODEGÓN DE CALIDAD" if "bodegon" in tienda_nombre.lower() else "MINIMARKET")
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(450, 750, f"RECIBO: #{venta_id}")
    c.setFont("Helvetica", 10)
    c.drawString(450, 735, f"FECHA: {venta.fecha.strftime('%d/%m/%Y')}")
    
    c.line(50, 720, 550, 720)
    
    # Datos Cliente
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 700, "DATOS DEL CLIENTE:")
    c.setFont("Helvetica", 10)
    c.drawString(50, 685, f"Nombre: {cliente_name}")
    c.drawString(50, 670, f"ID/RIF: {cliente.cedula_rif if cliente else 'V-000000000'}")
    metodo_texto = f"Método: {venta.metodo_pago.upper()}"
    if venta.referencia:
        metodo_texto += f" (Ref: {venta.referencia})"
    c.drawString(350, 685, metodo_texto)
    c.drawString(350, 670, f"Tasa BCV: {venta.tasa_bcv:.2f} Bs/$")
    
    c.line(50, 660, 550, 660)
    
    # Tabla de Productos
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 645, "DESCRIPCIÓN")
    c.drawString(300, 645, "CANT")
    c.drawString(380, 645, "PRECIO USD")
    c.drawString(480, 645, "SUBTOTAL")
    c.line(50, 640, 550, 640)
    
    y = 620
    for det in venta.detalles:
        if y < 100:
            c.showPage()
            y = 750
        prod_name = det.producto.nombre if det.producto else "Producto Eliminado"
        c.setFont("Helvetica", 9)
        c.drawString(50, y, prod_name[:40])
        c.drawString(310, y, str(det.cantidad))
        c.drawString(390, y, f"${det.precio_unitario_usd:.2f}")
        c.drawString(490, y, f"${(det.cantidad * det.precio_unitario_usd):.2f}")
        y -= 15
        
    c.line(50, y-5, 550, y-5)
    y -= 25
    
    # Totales
    c.setFont("Helvetica-Bold", 12)
    c.drawString(380, y, "TOTAL USD:")
    c.drawString(480, y, f"${venta.total_usd:.2f}")
    y -= 15
    c.setFont("Helvetica-Bold", 12)
    c.drawString(380, y, "TOTAL BS:")
    c.drawString(480, y, f"{(venta.total_usd * venta.tasa_bcv):.2f} Bs")
    
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(50, 50, f"Gracias por su compra. Emitido por Sistema Don Beni.")
    
    c.save()
    
    filename_pdf = f"Recibo_{tienda_nombre.replace(' ', '_')}_{venta_id}.pdf"
    headers = {"Content-Disposition": f"attachment; filename={filename_pdf}"}
    return FileResponse(path, filename=filename_pdf, media_type="application/pdf", headers=headers)


# ── DELETE (cancelar venta y restaurar stock) ─────────────────
@router.delete("/{venta_id}", status_code=200)
def cancelar_venta(
    venta_id: int, 
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    """Cancela una venta y devuelve el stock a la tienda correspondiente."""
    statement = select(Venta).where(Venta.id == venta_id).options(selectinload(Venta.detalles))
    venta = session.exec(statement).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    # Restaurar stock a ProductoTienda
    for detalle in venta.detalles:
        pt = session.exec(
            select(ProductoTienda).where(
                ProductoTienda.producto_id == detalle.producto_id,
                ProductoTienda.tienda_id == venta.tienda_id
            )
        ).first()
        if pt:
            pt.stock += detalle.cantidad
            session.add(pt)

    session.delete(venta)
    session.commit()
    return {"message": f"Venta #{venta_id} cancelada y stock restaurado"}

    session.delete(venta) # El cascade delete se encarga de los detalles
    session.commit()
    return {"message": f"Venta #{venta_id} cancelada y stock restaurado correctamente"}