import bcrypt
from sqlmodel import Session, select
from app.database import engine
from app.models import Usuario

def get_hash(password: str):
    # Usar bcrypt directamente para evitar errores de passlib
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def seed_users():
    with Session(engine) as session:
        users_to_create = [
            {"username": "vendedor", "password": "vendedor123", "rol": "vendedor"},
            {"username": "admin", "password": "admin123", "rol": "admin"},
            {"username": "dev", "password": "dev777", "rol": "dev"},
        ]
        
        for u in users_to_create:
            existing = session.exec(select(Usuario).where(Usuario.username == u["username"])).first()
            if not existing:
                print(f"Creando usuario: {u['username']} ({u['rol']})")
                nuevo = Usuario(
                    username=u["username"],
                    password_hash=get_hash(u["password"]),
                    rol=u["rol"]
                )
                session.add(nuevo)
            else:
                print(f"Usuario {u['username']} ya existe.")
        
        session.commit()
        print("Finalizado.")

if __name__ == "__main__":
    seed_users()
