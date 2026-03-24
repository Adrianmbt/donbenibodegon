from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import Producto, Venta, VentaDetalle, CuentaPorCobrar
from datetime import datetime, timedelta

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

from sqlalchemy import Date, cast

@router.get("/resumen-ejecutivo")
def get_resumen(session: Session = Depends(get_session)):
    hoy = datetime.utcnow().date()
    inicio_mes = hoy.replace(day=1)

    # 1. Total ventas del día
    ventas_hoy = session.exec(
        select(func.sum(Venta.total_usd)).where(cast(Venta.fecha, Date) == hoy)
    ).one() or 0

    # 2. Productos con Stock Crítico
    stock_critico = session.exec(
        select(Producto).where(Producto.stock <= Producto.stock_minimo)
    ).all()

    # 3. Cuentas por Cobrar Pendientes
    deuda_clientes = session.exec(
        select(func.sum(CuentaPorCobrar.monto_pendiente)).where(CuentaPorCobrar.estado != "pagado")
    ).one() or 0

    # 4. Top 5 Productos más vendidos del mes
    top_productos = session.exec(
        select(
            Producto.nombre,
            func.sum(VentaDetalle.cantidad).label("vendidos")
        )
        .join(VentaDetalle)
        .join(Venta)
        .where(Venta.fecha >= inicio_mes)
        .group_by(Producto.nombre)
        .order_by(func.sum(VentaDetalle.cantidad).desc())
        .limit(5)
    ).all()
    # Mapear a formato dict
    top_productos_list = [{"nombre": row[0], "cantidad": row[1]} for row in top_productos]

    # 5. Balance por Método de Pago (Hoy)
    balance_metodos = session.exec(
        select(
            Venta.metodo_pago,
            func.sum(Venta.total_usd)
        )
        .where(cast(Venta.fecha, Date) == hoy)
        .group_by(Venta.metodo_pago)
    ).all()
    balance_dict = {row[0]: round(row[1], 2) for row in balance_metodos}

    return {
        "ventas_del_dia": round(ventas_hoy, 2),
        "capital_en_cxc": round(deuda_clientes, 2),
        "productos_stock_bajo": len(stock_critico),
        "detalle_alerta": stock_critico,
        "top_productos": top_productos_list,
        "balance_pagos": balance_dict
    }