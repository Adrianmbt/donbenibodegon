import os
from sqlmodel import create_engine, Session, SQLModel
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