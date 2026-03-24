from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.models import Producto, Categoria
from typing import List

router = APIRouter(prefix="/inventario", tags=["Inventario"])

# Listar categorías
@router.get("/categorias", response_model=List[Categoria])
def listar_categorias(session: Session = Depends(get_session)):
    return session.exec(select(Categoria)).all()

# Crear categoría
@router.post("/categorias", response_model=Categoria)
def crear_categoria(categoria: Categoria, session: Session = Depends(get_session)):
    session.add(categoria)
    session.commit()
    session.refresh(categoria)
    return categoria

# Eliminar categoría
@router.delete("/categorias/{categoria_id}")
def eliminar_categoria(categoria_id: int, session: Session = Depends(get_session)):
    db_cat = session.get(Categoria, categoria_id)
    if not db_cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    # Opcional: Impedir borrar si hay productos (para evitar errores de FK)
    # Por ahora simplemente lo borramos
    session.delete(db_cat)
    session.commit()
    return {"message": "Categoría eliminada"}

# Crear un nuevo producto (útil para el registro inicial con el lector)
@router.post("/productos", response_model=Producto)
def crear_producto(producto: Producto, session: Session = Depends(get_session)):
    # Verificar si el código de barras ya existe
    existente = session.exec(select(Producto).where(Producto.barcode == producto.barcode)).first()
    if existente:
        raise HTTPException(status_code=400, detail="El código de barras ya está registrado")
    
    session.add(producto)
    session.commit()
    session.refresh(producto)
    return producto

# Obtener producto por código de barras (clave para el flujo del lector)
@router.get("/productos/barcode/{barcode}", response_model=Producto)
def obtener_por_barcode(barcode: str, session: Session = Depends(get_session)):
    producto = session.exec(select(Producto).where(Producto.barcode == barcode)).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

# Listar todo el inventario
@router.get("/productos", response_model=List[Producto])
def listar_productos(session: Session = Depends(get_session)):
    return session.exec(select(Producto)).all()

# Actualizar todo el producto (Edición completa)
@router.put("/productos/{producto_id}", response_model=Producto)
def actualizar_producto(producto_id: int, producto_data: Producto, session: Session = Depends(get_session)):
    db_producto = session.get(Producto, producto_id)
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Actualizar campos
    for key, value in producto_data.dict(exclude={"id"}).items():
        setattr(db_producto, key, value)
        
    session.add(db_producto)
    session.commit()
    session.refresh(db_producto)
    return db_producto

# Eliminar producto
@router.delete("/productos/{producto_id}")
def eliminar_producto(producto_id: int, session: Session = Depends(get_session)):
    db_producto = session.get(Producto, producto_id)
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    session.delete(db_producto)
    session.commit()
    return {"message": "Producto eliminado exitosamente"}

# Actualizar stock (para ingresos manuales o ventas)
@router.patch("/productos/{producto_id}/stock")
def actualizar_stock(producto_id: int, cantidad: int, session: Session = Depends(get_session)):
    db_producto = session.get(Producto, producto_id)
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    db_producto.stock += cantidad
    session.add(db_producto)
    session.commit()
    return {"message": "Stock actualizado", "nuevo_stock": db_producto.stock}