from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import Venta, Producto, CuentaPorPagar, CuentaPorCobrar, ExchangeRate, ProductoTienda
from app.routes.usuarios import obtener_usuario_actual
from datetime import datetime
from fastapi.responses import FileResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import os

router = APIRouter(prefix="/finanzas", tags=["Finanzas e Impuestos"])

@router.get("/stats")
def obtener_estadisticas_generales(
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    """
    Calcula Activos (Inventario + CxC), Deudas (CxP) y Patrimonio de la TIENDA ACTUAL.
    """
    tienda_id = usuario.get("tienda_id")
    if not tienda_id:
        return {
            "valor_inventario": 0, "cuentas_por_cobrar": 0, "cuentas_por_pagar": 0,
            "ventas_totales": 0, "activos_totales": 0, "patrimonio_neto": 0,
            "tasa_bcv": 0, "moneda": "USD"
        }

    # 1. Valor de Inventario (Activo Corriente) - USAR PRODUCTOTIENDA
    pts = session.exec(select(ProductoTienda).where(ProductoTienda.tienda_id == tienda_id)).all()
    valor_inventario = sum(pt.stock * pt.producto.costo_usd for pt in pts if pt.producto)
    
    # 2. Cuentas por Cobrar (Activo)
    cxc_total = session.exec(
        select(func.sum(CuentaPorCobrar.monto_pendiente))
        .where(CuentaPorCobrar.tienda_id == tienda_id)
    ).one() or 0.0
    
    # 3. Cuentas por Pagar (Pasivo/Deuda)
    cxp_total = session.exec(
        select(func.sum(CuentaPorPagar.monto_pendiente))
        .where(CuentaPorPagar.tienda_id == tienda_id)
    ).one() or 0.0
    
    # 4. Ventas Totales (Histórico)
    ventas_totales = session.exec(
        select(func.sum(Venta.total_usd))
        .where(Venta.tienda_id == tienda_id)
    ).one() or 0.0
    
    # 5. Patrimonio (Activos - Pasivos)
    activos_totales = valor_inventario + cxc_total
    patrimonio_neto = activos_totales - cxp_total

    # 6. Tasa BCV
    tasa = session.exec(select(ExchangeRate).order_by(ExchangeRate.id.desc())).first()
    rate = tasa.rate if tasa else 457.07

    return {
        "valor_inventario": round(valor_inventario, 2),
        "cuentas_por_cobrar": round(cxc_total, 2),
        "cuentas_por_pagar": round(cxp_total, 2),
        "ventas_totales": round(ventas_totales, 2),
        "activos_totales": round(activos_totales, 2),
        "patrimonio_neto": round(patrimonio_neto, 2),
        "tasa_bcv": rate,
        "moneda": "USD"
    }

@router.get("/reporte-pdf")
async def generar_reporte_patrimonial(
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    stats = obtener_estadisticas_generales(session, usuario)
    
    tasa = session.exec(select(ExchangeRate).order_by(ExchangeRate.id.desc())).first()
    rate = tasa.rate if tasa else 457.07
    
    filename = f"reporte_patrimonial_tienda_{usuario.get('tienda_id')}.pdf"
    path = os.path.join("temp_pdfs", filename)
    os.makedirs("temp_pdfs", exist_ok=True)
    
    c = canvas.Canvas(path, pagesize=letter)
    
    # Encabezado
    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, 750, "DON BENI - REPORTE FINANCIERO SEDE")
    c.setFont("Helvetica", 10)
    c.drawString(50, 735, f"Fecha de Emisión: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    c.drawString(50, 720, f"Moneda de Referencia: USD ($)")
    c.drawString(50, 705, f"Tasa de Cambio BCV: {rate:.2f} Bs/$")
    c.line(50, 695, 550, 695)
    
    # Cuerpo del Reporte
    y = 660
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "1. ACTIVOS (BIENES Y DERECHOS)")
    y -= 25
    c.setFont("Helvetica", 12)
    c.drawString(70, y, f"Valor de Inventario Sede: ${stats['valor_inventario']:.2f}")
    y -= 15
    c.drawString(70, y, f"Cuentas por Cobrar (Clientes): ${stats['cuentas_por_cobrar']:.2f}")
    y -= 20
    c.setFont("Helvetica-Bold", 12)
    c.drawString(70, y, f"TOTAL ACTIVOS: ${stats['activos_totales']:.2f}")
    
    y -= 40
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "2. PASIVOS (DEUDAS Y OBLIGACIONES)")
    y -= 25
    c.setFont("Helvetica", 12)
    c.drawString(70, y, f"Cuentas por Pagar (Proveedores): ${stats['cuentas_por_pagar']:.2f}")
    y -= 20
    c.setFont("Helvetica-Bold", 12)
    c.drawString(70, y, f"TOTAL PASIVOS: ${stats['cuentas_por_pagar']:.2f}")
    
    y -= 50
    c.line(50, y, 550, y)
    y -= 25
    c.setFont("Helvetica-Bold", 16)
    c.setFillColorRGB(0, 0.5, 0) # Verde para el patrimonio
    c.drawString(50, y, f"PATRIMONIO NETO ESTIMADO: ${stats['patrimonio_neto']:.2f}")
    
    y -= 25
    c.setFillColorRGB(0, 0, 0) # Negro
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(50, y, f"Equivalente en Bolívares (BCV): {(stats['patrimonio_neto'] * rate):,.2f} Bs")
    
    y -= 60
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Resumen de Ventas Históricas:")
    y -= 20
    c.setFont("Helvetica", 12)
    c.drawString(70, y, f"Monto Total de Ventas Procesadas en Sede: ${stats['ventas_totales']:.2f}")
    
    c.save()
    
    headers = {
        "Content-Disposition": f"attachment; filename={filename}"
    }
    return FileResponse(path, filename=filename, media_type="application/pdf", headers=headers)

@router.get("/declaracion-ingresos-mensual")
async def generar_declaracion_mensual(
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    tienda_id = usuario.get("tienda_id")
    now = datetime.now()
    inicio_mes = datetime(now.year, now.month, 1)
    
    # Ventas del mes filtradas por tienda
    ventas = session.exec(
        select(Venta)
        .where(Venta.fecha >= inicio_mes, Venta.tienda_id == tienda_id)
    ).all()
    total_usd = sum(v.total_usd for v in ventas)
    
    tasa = session.exec(select(ExchangeRate).order_by(ExchangeRate.id.desc())).first()
    rate = tasa.rate if tasa else 457.07
    total_ves = total_usd * rate
    
    filename = f"declaracion_ingresos_tienda_{tienda_id}_{now.month}_{now.year}.pdf"
    path = os.path.join("temp_pdfs", filename)
    os.makedirs("temp_pdfs", exist_ok=True)
    
    c = canvas.Canvas(path, pagesize=letter)
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, "DECLARACIÓN DE INGRESOS BRUTOS MENSUAL")
    c.setFont("Helvetica", 12)
    c.drawString(50, 730, f"Periodo: {now.strftime('%m/%Y')}")
    c.drawString(50, 715, f"Empresa: DON BENI - BODEGÓN DE CALIDAD")
    c.line(50, 705, 550, 705)
    
    y = 670
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "RESUMEN DE OPERACIONES EXENTAS/GRAVADAS")
    y -= 30
    
    c.setFont("Helvetica", 10)
    c.drawString(70, y, f"Total Facturado en Divisas (USD): ${total_usd:,.2f}")
    y -= 20
    c.drawString(70, y, f"Tasa de Referencia Oficial (BCV): {rate:.2f} Bs/$")
    y -= 40
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, f"TOTAL INGRESOS BRUTOS (VES): {total_ves:,.2f} Bs")
    y -= 20
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(50, y, "* Este monto es la base imponible sugerida para la declaración de impuestos municipales.")
    
    y -= 60
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Detalle de Transacciones del Mes:")
    y -= 20
    
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "ID")
    c.drawString(100, y, "Fecha")
    c.drawString(250, y, "Monto (USD)")
    c.drawString(400, y, "Monto (VES)")
    y -= 5
    c.line(50, y, 550, y)
    y -= 15
    
    c.setFont("Helvetica", 9)
    for v in ventas[:25]: # Limitar a 25 para el ejemplo
        if y < 50:
            c.showPage()
            y = 750
        c.drawString(50, y, str(v.id))
        c.drawString(100, y, v.fecha.strftime("%d/%m/%Y %H:%M"))
        c.drawString(250, y, f"${v.total_usd:,.2f}")
        c.drawString(400, y, f"{v.total_usd * rate:,.2f} Bs")
        y -= 15
        
    c.save()
    
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return FileResponse(path, filename=filename, media_type="application/pdf", headers=headers)