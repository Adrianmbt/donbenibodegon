from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

# --- CONFIGURACIÓN Y TASAS ---
class ExchangeRate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    rate: float = Field(gt=0)
    last_updated: datetime = Field(default_factory=datetime.utcnow)

# --- INVENTARIO ---
class Categoria(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(unique=True, index=True)
    
    productos: List["Producto"] = Relationship(back_populates="categoria")

# --- PERSONAS ---
class Cliente(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cedula_rif: str = Field(unique=True, index=True)
    nombre: str
    limite_credito: float = Field(default=0.0)
    
    ventas: List["Venta"] = Relationship(back_populates="cliente")
    cuentas_por_cobrar: List["CuentaPorCobrar"] = Relationship(back_populates="cliente")

class Proveedor(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    rif: str = Field(unique=True)
    nombre: str
    contacto: Optional[str] = None
    
    productos: List["Producto"] = Relationship(back_populates="proveedor")
    cuentas_por_pagar: List["CuentaPorPagar"] = Relationship(back_populates="proveedor")

class Producto(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(index=True)
    barcode: str = Field(unique=True, index=True)
    precio_usd: float = Field(gt=0)
    costo_usd: float = Field(gt=0)
    stock: int = Field(default=0, ge=0)
    stock_minimo: int = Field(default=5)
    categoria_id: int = Field(foreign_key="categoria.id")
    proveedor_id: Optional[int] = Field(default=None, foreign_key="proveedor.id")
    
    # Mayorista / Licores
    es_licor: bool = Field(default=False)
    unidades_por_caja: int = Field(default=1)
    precio_caja_usd: float = Field(default=0.0)
    
    categoria: Optional[Categoria] = Relationship(back_populates="productos")
    proveedor: Optional[Proveedor] = Relationship(back_populates="productos")
    detalles_venta: List["VentaDetalle"] = Relationship(back_populates="producto")

# --- FINANZAS (CxC y CxP) ---
class CuentaPorCobrar(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cliente_id: int = Field(foreign_key="cliente.id")
    monto_total: float
    monto_pendiente: float
    fecha_emision: datetime = Field(default_factory=datetime.utcnow)
    estado: str = Field(default="pendiente") # pendiente, parcial, pagado
    
    cliente: Optional[Cliente] = Relationship(back_populates="cuentas_por_cobrar")

class CuentaPorPagar(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    proveedor_id: int = Field(foreign_key="proveedor.id")
    monto_total: float
    monto_pendiente: float
    fecha_emision: datetime = Field(default_factory=datetime.utcnow)
    estado: str = Field(default="pendiente")
    
    proveedor: Optional[Proveedor] = Relationship(back_populates="cuentas_por_pagar")

# --- SEGURIDAD Y USUARIOS ---
class Usuario(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    nombre: str = Field(default="")  # Nombre real del empleado
    password_hash: str
    rol: str = Field(default="vendedor") # vendedor, admin, dev
    
    ventas: List["Venta"] = Relationship(back_populates="usuario")

# --- VENTAS ---
class Venta(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    fecha: datetime = Field(default_factory=datetime.utcnow)
    total_usd: float
    tasa_bcv: float # Guardamos la tasa del momento
    cliente_id: Optional[int] = Field(default=None, foreign_key="cliente.id")
    usuario_id: int = Field(foreign_key="usuario.id")
    metodo_pago: str # Efectivo, Punto, Divisa, Crédito
    referencia: Optional[str] = None
    
    cliente: Optional[Cliente] = Relationship(back_populates="ventas")
    usuario: Optional[Usuario] = Relationship(back_populates="ventas")
    detalles: List["VentaDetalle"] = Relationship(back_populates="venta", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class VentaDetalle(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    venta_id: int = Field(foreign_key="venta.id")
    producto_id: int = Field(foreign_key="producto.id")
    cantidad: int
    precio_unitario_usd: float
    
    venta: Optional[Venta] = Relationship(back_populates="detalles")
    producto: Optional[Producto] = Relationship(back_populates="detalles_venta")


# --- AUDIT LOG (para el panel de desarrollador) ---
class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    fecha: datetime = Field(default_factory=datetime.utcnow)
    usuario: str  # username del operador
    accion: str   # "DELETE", "EDIT", "CREATE"
    entidad: str  # "Venta", "Producto", "Usuario", etc.
    detalle: str  # descripción human-readable
    autorizado_por: Optional[str] = None  # admin que autorizo (si aplica)

# --- LICENCIA DEL SISTEMA ---
class Licencia(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    clave: str = Field(unique=True, index=True)
    activa: bool = Field(default=True)
    fecha_emision: datetime = Field(default_factory=datetime.utcnow)
    fecha_vencimiento: datetime
    creada_por: str = Field(default="dev")  # quien genero la clave


# ============================================================
# --- SCHEMAS (Pydantic) para validación de la API  ---
# ============================================================
from pydantic import BaseModel

# --- Usuarios ---
class UsuarioCreate(BaseModel):
    username: str
    nombre: str = ""       # Nombre real del empleado
    password: str          # contraseña en texto plano (se hashea en el endpoint)
    rol: str = "vendedor"  # vendedor | admin | dev

class UsuarioRead(BaseModel):
    id: int
    username: str
    nombre: str = ""
    rol: str

class UsuarioUpdate(BaseModel):
    username: Optional[str] = None
    nombre: Optional[str] = None
    password: Optional[str] = None
    rol: Optional[str] = None

# --- Productos ---
class ProductoRead(BaseModel):
    id: int
    nombre: str
    barcode: str
    precio_usd: float
    stock: int
    proveedor_id: Optional[int] = None
    es_licor: bool = False
    unidades_por_caja: int = 1
    precio_caja_usd: float = 0.0

# --- Ventas ---
class VentaDetalleRead(BaseModel):
    id: int
    producto_id: int
    producto: Optional[ProductoRead] = None
    cantidad: int
    precio_unitario_usd: float

class VentaRead(BaseModel):
    id: int
    fecha: datetime
    total_usd: float
    tasa_bcv: float
    cliente_id: Optional[int]
    usuario_id: int
    metodo_pago: str
    referencia: Optional[str] = None
    detalles: List[VentaDetalleRead] = []
