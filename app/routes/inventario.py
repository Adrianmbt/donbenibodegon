from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.models import Producto, Categoria, ProductoTienda, ProductoTiendaRead, ProductoRead
from app.routes.usuarios import obtener_usuario_actual
from typing import List, Optional

router = APIRouter(prefix="/inventario", tags=["Inventario"])

# Helper para obtener el producto con info de la tienda
def get_producto_tienda_info(session: Session, producto_id: int, tienda_id: int):
    pt = session.exec(
        select(ProductoTienda).where(
            ProductoTienda.producto_id == producto_id,
            ProductoTienda.tienda_id == tienda_id
        )
    ).first()
    return pt

# Listar categorías
@router.get("/categorias", response_model=List[Categoria])
def listar_categorias(session: Session = Depends(get_session)):
    return session.exec(select(Categoria)).all()

# Crear un nuevo producto (Catálogo Global + Info de Tienda)
@router.post("/productos", response_model=ProductoTiendaRead)
def crear_producto(
    producto_data: Producto, 
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    tienda_id = usuario["tienda_id"]
    if not tienda_id:
        raise HTTPException(status_code=403, detail="Debes estar asignado a una tienda para crear productos")

    # 1. Verificar si el producto existe globalmente por barcode
    producto = session.exec(select(Producto).where(Producto.barcode == producto_data.barcode)).first()
    
    if not producto:
        # Crear en catálogo global
        producto = Producto(
            nombre=producto_data.nombre,
            barcode=producto_data.barcode,
            costo_usd=producto_data.costo_usd,
            categoria_id=producto_data.categoria_id,
            proveedor_id=producto_data.proveedor_id,
            es_licor=producto_data.es_licor,
            unidades_por_caja=producto_data.unidades_por_caja
        )
        session.add(producto)
        session.commit()
        session.refresh(producto)
    
    # 2. Verificar si ya existe para esta tienda
    pt = get_producto_tienda_info(session, producto.id, tienda_id)
    if pt:
        raise HTTPException(status_code=400, detail="El producto ya está registrado en esta tienda")
    
    # 3. Crear relación con la tienda
    # Intentamos obtener precio de la data enviada (si el cliente envió stock/precio en el body)
    # Como el modelo Producto original tenía estos campos, el frontend podría seguirlos enviando
    # Usamos getattr por seguridad si los campos fueron removidos del modelo pero no del JSON
    nuevo_pt = ProductoTienda(
        producto_id=producto.id,
        tienda_id=tienda_id,
        stock=getattr(producto_data, "stock", 0),
        precio_usd=getattr(producto_data, "precio_usd", 0.0),
        precio_caja_usd=getattr(producto_data, "precio_caja_usd", 0.0),
        stock_minimo=getattr(producto_data, "stock_minimo", 5),
        activo=True
    )
    session.add(nuevo_pt)
    session.commit()
    session.refresh(nuevo_pt)
    return nuevo_pt

# Obtener producto por código de barras
@router.get("/productos/barcode/{barcode}", response_model=ProductoTiendaRead)
def obtener_por_barcode(
    barcode: str, 
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    tienda_id = usuario["tienda_id"]
    producto = session.exec(select(Producto).where(Producto.barcode == barcode)).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado en el catálogo global")
    
    pt = get_producto_tienda_info(session, producto.id, tienda_id)
    if not pt:
        # Si existe global pero no en la tienda, lo retornamos pero indicando que no está activo/registrado
        # O podríamos crearlo automáticamente con stock 0. Vamos a retornarlo como 404 para que el frontend pida "activarlo"
        raise HTTPException(status_code=404, detail="Producto no registrado en esta tienda")
    
    return pt

# Listar inventario de LA TIENDA
@router.get("/productos", response_model=List[ProductoTiendaRead])
def listar_productos(
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    tienda_id = usuario["tienda_id"]
    if not tienda_id:
        # Para dev/propietario que no tienen tienda_id fija, podrían querer ver todo o elegir una
        # Por ahora, si no hay tienda_id, retornamos vacío o error
        return []
    
    return session.exec(select(ProductoTienda).where(ProductoTienda.tienda_id == tienda_id)).all()

# Actualizar producto (Info Global + Info Tienda)
@router.put("/productos/{producto_id}", response_model=ProductoTiendaRead)
def actualizar_producto(
    producto_id: int, 
    data: dict, # Recibimos dict para manejar ambos modelos
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    tienda_id = usuario["tienda_id"]
    db_producto = session.get(Producto, producto_id)
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    pt = get_producto_tienda_info(session, producto_id, tienda_id)
    if not pt:
        raise HTTPException(status_code=404, detail="Producto no encontrado en esta tienda")

    # Campos globales
    for key in ["nombre", "costo_usd", "categoria_id", "proveedor_id", "es_licor", "unidades_por_caja"]:
        if key in data:
            setattr(db_producto, key, data[key])
    
    # Campos de tienda
    for key in ["stock", "precio_usd", "precio_caja_usd", "stock_minimo", "activo"]:
        if key in data:
            setattr(pt, key, data[key])
        
    session.add(db_producto)
    session.add(pt)
    session.commit()
    session.refresh(pt)
    return pt

# Actualizar stock
@router.patch("/productos/{producto_id}/stock")
def actualizar_stock(
    producto_id: int, 
    cantidad: int, 
    session: Session = Depends(get_session),
    usuario: dict = Depends(obtener_usuario_actual)
):
    tienda_id = usuario["tienda_id"]
    pt = get_producto_tienda_info(session, producto_id, tienda_id)
    if not pt:
        raise HTTPException(status_code=404, detail="Producto no encontrado en esta tienda")
    
    pt.stock += cantidad
    session.add(pt)
    session.commit()
    return {"message": "Stock actualizado", "nuevo_stock": pt.stock}