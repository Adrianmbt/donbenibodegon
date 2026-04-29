import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Configuración de seguridad desde .env
SECRET_KEY = os.getenv("SECRET_KEY", "TU_LLAVE_SECRETA_POR_DEFECTO_NO_USAR") 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480 # 8 horas de turno

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verificar_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def obtener_password_hash(password):
    return pwd_context.hash(password)

def crear_token_acceso(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)