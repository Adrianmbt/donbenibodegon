import os
import sys
from sqlmodel import Session, create_engine, select, text
from dotenv import load_dotenv

# Añadir el directorio raíz al path para importar app
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.models import SQLModel, Tienda, Producto, ProductoTienda, Usuario, Venta, CuentaPorCobrar, CuentaPorPagar, AuditLog

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def migrate():
    with Session(engine) as session:
        print("--- Iniciando migración a Multi-tenant ---")
        
        # 1. Crear nuevas tablas (Tienda y ProductoTienda)
        print("Creando nuevas tablas...")
        SQLModel.metadata.create_all(engine)
        
        # 2. Verificar si ya existe una tienda
        tienda_defecto = session.exec(select(Tienda).where(Tienda.nombre == "Bodegón Don Beni")).first()
        if not tienda_defecto:
            print("Creando tienda por defecto: Bodegón Don Beni")
            tienda_defecto = Tienda(nombre="Bodegón Don Beni", tipo="bodegon")
            session.add(tienda_defecto)
            session.commit()
            session.refresh(tienda_defecto)
        
        tienda_id = tienda_defecto.id
        print(f"ID de tienda por defecto: {tienda_id}")

        # 3. Agregar columnas tienda_id a tablas existentes
        tablas_con_tienda = ["venta", "cuentaporcobrar", "cuentaporpagar", "usuario", "auditlog"]
        print("Agregando columnas tienda_id...")
        for tabla in tablas_con_tienda:
            try:
                session.execute(text(f"ALTER TABLE {tabla} ADD COLUMN IF NOT EXISTS tienda_id INTEGER REFERENCES tienda(id)"))
                session.commit()
            except Exception as e:
                session.rollback()
                print(f"Aviso al agregar columna a {tabla}: {e}")

        # 4. Migrar productos a ProductoTienda
        print("Migrando stock y precios de productos a ProductoTienda...")
        try:
            # Primero verificamos si las columnas aún existen
            result = session.execute(text("SELECT id, precio_usd, stock, stock_minimo, precio_caja_usd FROM producto"))
            for row in result:
                existente = session.exec(select(ProductoTienda).where(
                    ProductoTienda.producto_id == row.id, 
                    ProductoTienda.tienda_id == tienda_id
                )).first()
                
                if not existente:
                    nuevo_pt = ProductoTienda(
                        producto_id=row.id,
                        tienda_id=tienda_id,
                        stock=row.stock,
                        stock_minimo=row.stock_minimo,
                        precio_usd=row.precio_usd,
                        precio_caja_usd=row.precio_caja_usd or 0.0,
                        activo=True
                    )
                    session.add(nuevo_pt)
            session.commit()
        except Exception as e:
            session.rollback()
            print(f"Aviso: No se pudo migrar ProductoTienda: {e}")

        # 5. Actualizar tienda_id en tablas operativas
        print("Actualizando tienda_id en tablas operativas...")
        for tabla in tablas_con_tienda:
            try:
                session.execute(text(f"UPDATE {tabla} SET tienda_id = {tienda_id} WHERE tienda_id IS NULL"))
                session.commit()
            except Exception as e:
                session.rollback()
                print(f"Error actualizando data en {tabla}: {e}")

        # 6. Eliminar columnas obsoletas de la tabla producto
        print("Eliminando columnas obsoletas de la tabla producto...")
        columnas_a_borrar = ["precio_usd", "stock", "stock_minimo", "precio_caja_usd"]
        for col in columnas_a_borrar:
            try:
                session.execute(text(f"ALTER TABLE producto DROP COLUMN IF EXISTS {col}"))
                session.commit()
            except Exception as e:
                session.rollback()
                print(f"No se pudo eliminar la columna {col}: {e}")

        print("--- Migración completada exitosamente ---")

if __name__ == "__main__":
    migrate()
