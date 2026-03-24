from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
from app.database import init_db
import os
from app.routes import bcv, inventario, usuarios, ventas, finanzas, compras, proveedores, dashboard, dev

dist_path = os.path.join(os.path.dirname(__file__), "frontend", "dist")

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Bodegón API v1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de routers con prefijo /api
app.include_router(bcv.router, prefix="/api")
app.include_router(inventario.router, prefix="/api")
app.include_router(usuarios.router, prefix="/api")
app.include_router(ventas.router, prefix="/api")
app.include_router(finanzas.router, prefix="/api")
app.include_router(compras.router, prefix="/api")
app.include_router(proveedores.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(dev.router, prefix="/api")

# ── ARCHIVOS ESTÁTICOS ──────────────────────────────────────
assets_path = os.path.join(dist_path, "assets")
if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

# ── SPA FALLBACK como middleware (no interfiere con métodos HTTP) ──
class SPAMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Si la ruta no es /api y devuelve 404, servir index.html
        path = request.url.path
        if (response.status_code == 404
                and not path.startswith("/api")
                and not path.startswith("/assets")):
            index = os.path.join(dist_path, "index.html")
            if os.path.exists(index):
                return FileResponse(index)
        return response

app.add_middleware(SPAMiddleware)

# Ruta raíz y archivos estáticos del dist
@app.get("/")
async def serve_root():
    index = os.path.join(dist_path, "index.html")
    return FileResponse(index) if os.path.exists(index) else JSONResponse({"message": "DonBeni API"})

@app.get("/logo.jpg")
async def serve_logo():
    for p in [os.path.join(dist_path, "logo.jpg"), os.path.join(os.path.dirname(__file__), "logo.jpg")]:
        if os.path.exists(p):
            return FileResponse(p)

@app.get("/favicon.svg")
async def serve_favicon():
    p = os.path.join(dist_path, "favicon.svg")
    if os.path.exists(p):
        return FileResponse(p)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, log_level="info")
