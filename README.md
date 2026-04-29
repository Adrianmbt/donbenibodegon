# Don Beni POS — Sistema de Gestión de Bodegón

Sistema de punto de venta construido con **React + FastAPI + PostgreSQL**, empaquetado como aplicación de escritorio con **Electron**.

---

## Requisitos para desarrollo

- [Node.js 18+](https://nodejs.org/)
- [Python 3.12+](https://www.python.org/)
- [PostgreSQL 15+](https://www.postgresql.org/download/windows/)
- Git

---

## Instalación desde cero (PC de desarrollo)

### 1. Clonar el repositorio

```bash
git clone https://github.com/Adrianmbt/donbenibodegon
cd donbenibodegon
```

### 2. Crear el entorno virtual Python e instalar dependencias

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Instalar dependencias de Node

```bash
npm install
cd frontend
npm install
cd ..
```

### 4. Configurar la base de datos

Crear la base de datos en PostgreSQL:
```sql
CREATE DATABASE bodegon_db;
```

Crear el archivo `.env` en la raíz del proyecto:
```
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA@localhost:5432/bodegon_db
SECRET_KEY=UNA_CLAVE_SECRETA_LARGA_Y_ALEATORIA
```

### 5. Correr en modo desarrollo

```bash
npm run dev
```

---

## Empaquetar la aplicación (generar el ejecutable)

```bash
# Cerrar la app si está corriendo, luego:
npm run package
```

El ejecutable queda en `dist-electron\win-unpacked\Don Beni POS.exe`.

---

## Instalar en la PC servidor (sin desarrollo)

1. Instalar PostgreSQL y crear la base de datos `bodegon_db`
2. Importar el dump de la base de datos (si tienes uno):
   ```powershell
   $env:PGPASSWORD = "TU_CONTRASEÑA"
   & "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -U postgres -d bodegon_db -F c "bodegon_db.dump"
   ```
3. Copiar la carpeta `dist-electron\win-unpacked` a la PC servidor
4. Editar `resources\app\.env` con la contraseña de PostgreSQL de esa máquina
5. Ejecutar `Don Beni POS.exe`

---

## Si algo falla

Revisar el log en:
```
C:\Users\<usuario>\AppData\Roaming\donbeni\backend.log
```
