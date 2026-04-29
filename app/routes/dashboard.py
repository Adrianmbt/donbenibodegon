from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import Producto, Venta, VentaDetalle, CuentaPorCobrar, ProductoTienda
from app.routes.usuarios import obtener_usuario_actual
from datetime import datetime, timedelta
from sqlalchemy import Date, cast

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/resumen-ejecutivo")
def get_resumen(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    tienda_id = usuario_actual.get("tienda_id")
    hoy = datetime.utcnow().date()
    inicio_mes = hoy.replace(day=1)

    # 1. Total ventas del día (filtrado por tienda)
    ventas_hoy = session.exec(
        select(func.sum(Venta.total_usd))
        .where(cast(Venta.fecha, Date) == hoy)
        .where(Venta.tienda_id == tienda_id)
    ).one() or 0

    # 2. Productos con Stock Crítico (usando ProductoTienda)
    stock_critico = session.exec(
        select(ProductoTienda)
        .where(ProductoTienda.tienda_id == tienda_id)
        .where(ProductoTienda.stock <= ProductoTienda.stock_minimo)
    ).all()

    # 3. Cuentas por Cobrar Pendientes (filtrado por tienda)
    deuda_clientes = session.exec(
        select(func.sum(CuentaPorCobrar.monto_pendiente))
        .where(CuentaPorCobrar.estado != "pagado")
        .where(CuentaPorCobrar.tienda_id == tienda_id)
    ).one() or 0

    # 4. Top 5 Productos más vendidos del mes (filtrado por tienda)
    top_productos = session.exec(
        select(
            Producto.nombre,
            func.sum(VentaDetalle.cantidad).label("vendidos")
        )
        .join(VentaDetalle, Producto.id == VentaDetalle.producto_id)
        .join(Venta, Venta.id == VentaDetalle.venta_id)
        .where(Venta.fecha >= inicio_mes)
        .where(Venta.tienda_id == tienda_id)
        .group_by(Producto.nombre)
        .order_by(func.sum(VentaDetalle.cantidad).desc())
        .limit(5)
    ).all()
    
    top_productos_list = [{"nombre": row[0], "cantidad": row[1]} for row in top_productos]

    # 5. Balance por Método de Pago (Hoy, filtrado por tienda)
    balance_metodos = session.exec(
        select(
            Venta.metodo_pago,
            func.sum(Venta.total_usd)
        )
        .where(cast(Venta.fecha, Date) == hoy)
        .where(Venta.tienda_id == tienda_id)
        .group_by(Venta.metodo_pago)
    ).all()
    balance_dict = {row[0]: round(float(row[1]), 2) for row in balance_metodos}

    return {
        "ventas_del_dia": round(float(ventas_hoy), 2),
        "capital_en_cxc": round(float(deuda_clientes), 2),
        "productos_stock_bajo": len(stock_critico),
        "detalle_alerta": stock_critico,
        "top_productos": top_productos_list,
        "balance_pagos": balance_dict
    }