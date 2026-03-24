# Don Beni POS — Guía de Instalación y Mantenimiento

---

## Instalación en la PC Servidor

### Requisitos previos

1. **PostgreSQL 15+**
   - Descargar desde https://www.postgresql.org/download/windows/
   - Durante la instalación, configurar:
     - Usuario: `postgres`
     - Contraseña: `123456` (o la que tengas en tu `.env`)
     - Puerto: `5432`
   - Al finalizar, abrir **pgAdmin** y crear la base de datos:
     ```sql
     CREATE DATABASE bodegon_db;
     ```

2. **No se necesita instalar Python ni Node.js** — el `venv` ya va incluido en el build.

---

### Pasos de instalación

1. Copiar la carpeta completa `dist-electron\win-unpacked` a la PC servidor.
   - Puedes renombrarla a `DonBeni` o dejarla como está.

2. Dentro de la carpeta, buscar el archivo:
   ```
   resources\app\.env
   ```
   Editarlo con el Bloc de notas y ajustar la conexión a la base de datos:
   ```
   DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA@localhost:5432/bodegon_db
   SECRET_KEY=TU_LLAVE_SECRETA_SUPER_FANTASMA_CAMBIAME
   ```

3. Ejecutar `Don Beni POS.exe` — la primera vez creará las tablas automáticamente.

4. (Opcional) Crear un acceso directo de `Don Beni POS.exe` en el escritorio.

---

### Si la app no abre o hay error de conexión

Revisar el log en:
```
C:\Users\<usuario>\AppData\Roaming\donbeni\backend.log
```
Ese archivo muestra exactamente qué falló al iniciar el backend.

---

## Hacer cambios y reempaquetar

### Requisitos en la PC de desarrollo

- Node.js instalado
- Python con el `venv` configurado
- PostgreSQL corriendo localmente

### Pasos

```bash
# 1. Hacer los cambios en el código (frontend o backend)

# 2. Si cambiaste el frontend, el build lo hace automáticamente.
#    Si solo cambiaste archivos Python (app/, main.py), no necesitas tocar el frontend.

# 3. Cerrar cualquier instancia de la app que esté corriendo

# 4. Empaquetar
npm run package

# 5. El resultado queda en:
#    dist-electron\win-unpacked\
```

### Si el empaquetado falla con "Acceso denegado"

Significa que la app sigue corriendo. Ejecutar en PowerShell:
```powershell
Get-Process | Where-Object { $_.Name -match "Don Beni" } | Stop-Process -Force
Get-Process | Where-Object { $_.Name -match "python" } | Stop-Process -Force
```
Luego volver a correr `npm run package`.

---

## Estructura del proyecto

```
donbeni/
├── electron-main.cjs       # Proceso principal de Electron
├── main.py                 # Entrada del backend FastAPI
├── app/
│   ├── routes/             # Endpoints de la API
│   ├── services/           # Lógica de autenticación y scraping
│   ├── models.py           # Modelos de base de datos
│   └── database.py         # Conexión a PostgreSQL
├── frontend/
│   └── src/
│       └── views/          # Pantallas de la app (React)
├── venv/                   # Entorno Python (no tocar)
└── .env                    # Variables de entorno (DB, SECRET_KEY)
```
