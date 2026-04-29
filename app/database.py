import os
from sqlmodel import create_engine, Session, SQLModel, select
from dotenv import load_dotenv

load_dotenv()

# La URL se lee desde el archivo .env en la raíz del proyecto
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, echo=True)

def get_session():
    with Session(engine) as session:
        yield session

def init_db():
    # Esto creará las tablas en Postgres automáticamente
    SQLModel.metadata.create_all(engine)
    
    # Seed Tiendas
    from app.models import Tienda
    with Session(engine) as session:
        # Asegurar Bodegón
        if not session.get(Tienda, 1):
            session.add(Tienda(id=1, nombre="Bodegón Don Beni", tipo="bodegon"))
        
        # Asegurar Minimarket
        if not session.get(Tienda, 2):
            session.add(Tienda(id=2, nombre="Minimarket Don Beni", tipo="minimarket"))
            
        session.commit()
            
        # Seed Usuario Dev
        from app.models import Usuario
        from app.services.auth import obtener_password_hash
        if not session.exec(select(Usuario).where(Usuario.username == "dev")).first():
            dev_user = Usuario(
                username="dev",
                nombre="Desarrollador",
                password_hash=obtener_password_hash("dev123"),
                rol="dev",
                tienda_id=1
            )
            session.add(dev_user)
            session.commit()