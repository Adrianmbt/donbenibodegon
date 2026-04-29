import os
import secrets
import subprocess
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, select, func, text
from pydantic import BaseModel
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

from app.database import get_session, engine
from app.models import AuditLog, Licencia, Usuario
from app.routes.usuarios import obtener_usuario_actual
from app.services.auth import verificar_password

router = APIRouter(prefix="/dev", tags=["Dev Panel"])


# ── Helpers ─────────────────────────────────────────────────

def solo_dev(usuario: dict = Depends(obtener_usuario_actual)) -> dict:
    if usuario["rol"] != "dev":
        raise HTTPException(status_code=403, detail="Acceso restringido al rol 'dev'")
    return usuario


# ── Verificación de licencia (cualquier usuario autenticado) ─────────────────

@router.get("/licencia/verificar")
def verificar_licencia_activa(
    session: Session = Depends(get_session),
    _: dict = Depends(obtener_usuario_actual),  # solo requiere estar logueado
):
    """Verifica si existe una licencia válida y activa. Usado por el frontend para bloquear acceso."""
    lic = session.exec(
        select(Licencia)
        .where(Licencia.activa == True)
        .order_by(Licencia.fecha_vencimiento.desc())
    ).first()

    if not lic:
        return {"valida": False, "motivo": "sin_licencia"}

    now = datetime.utcnow()
    if lic.fecha_vencimiento < now:
        return {"valida": False, "motivo": "vencida", "expires": str(lic.fecha_vencimiento.date())}

    return {
        "valida": True,
        "expires": str(lic.fecha_vencimiento.date()),
        "dias_restantes": (lic.fecha_vencimiento - now).days,
    }


def registrar_log(
    session: Session,
    usuario: str,
    accion: str,
    entidad: str,
    detalle: str,
    autorizado_por: Optional[str] = None,
):
    """Utilidad reutilizable para grabar un AuditLog desde cualquier ruta."""
    log = AuditLog(
        usuario=usuario,
        accion=accion,
        entidad=entidad,
        detalle=detalle,
        autorizado_por=autorizado_por,
    )
    session.add(log)
    session.commit()


# ── DB STATUS ────────────────────────────────────────────────

@router.get("/db-status")
def db_status(
    session: Session = Depends(get_session),
    _: dict = Depends(solo_dev),
):
    """Retorna el tamaño de la base de datos y estadísticas básicas."""
    try:
        db_name = engine.url.database
        row = session.exec(
            text(f"SELECT pg_size_pretty(pg_database_size('{db_name}'))")
        ).first()
        db_size = row[0] if row else "N/A"

        # Conteo de tablas relevantes
        tablas = {}
        for tabla in ["venta", "producto", "usuario", "proveedor", "auditlog"]:
            try:
                count = session.exec(text(f"SELECT COUNT(*) FROM {tabla}")).first()
                tablas[tabla] = count[0] if count else 0
            except Exception:
                tablas[tabla] = 0

        return {"status": "online", "db_size": db_size, "tablas": tablas}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


# ── AUDIT LOGS ───────────────────────────────────────────────

@router.get("/logs")
def obtener_logs(
    session: Session = Depends(get_session),
    _: dict = Depends(solo_dev),
):
    logs = session.exec(
        select(AuditLog).order_by(AuditLog.fecha.desc())
    ).all()
    return logs


@router.get("/logs/pdf")
def descargar_logs_pdf(
    session: Session = Depends(get_session),
    _: dict = Depends(solo_dev),
):
    """Genera un reporte PDF de los logs de auditoría."""
    logs = session.exec(select(AuditLog).order_by(AuditLog.fecha.desc())).all()
    
    filename = "reporte_auditoria.pdf"
    path = os.path.join("temp_pdfs", filename)
    os.makedirs("temp_pdfs", exist_ok=True)
    
    c = canvas.Canvas(path, pagesize=letter)
    width, height = letter
    
    # Encabezado
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "DON BENI - REPORTE DE AUDITORÍA")
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 65, f"Fecha de Emisión: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    c.line(50, height - 75, width - 50, height - 75)
    
    y = height - 100
    
    # Cabecera de tabla
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "FECHA")
    c.drawString(140, y, "USUARIO")
    c.drawString(220, y, "ACCIÓN")
    c.drawString(280, y, "ENTIDAD")
    c.drawString(360, y, "DETALLE / AUTH")
    
    y -= 5
    c.line(50, y, width - 50, y)
    y -= 15
    
    c.setFont("Helvetica", 8)
    for log in logs:
        if y < 50:
            c.showPage()
            y = height - 50
            c.setFont("Helvetica-Bold", 10)
            c.drawString(50, y, "FECHA")
            c.drawString(140, y, "USUARIO")
            c.drawString(220, y, "ACCIÓN")
            c.drawString(280, y, "ENTIDAD")
            c.drawString(360, y, "DETALLE / AUTH")
            y -= 15
            c.setFont("Helvetica", 8)

        fecha_str = log.fecha.strftime("%d/%m/%Y %H:%M")
        auth_str = f" [Auth: {log.autorizado_por}]" if log.autorizado_por else ""
        detalle_str = f"{log.detalle}{auth_str}"
        
        c.drawString(50, y, fecha_str)
        c.drawString(140, y, log.usuario if log.usuario else "N/A")
        c.drawString(220, y, log.accion)
        c.drawString(280, y, log.entidad)
        
        # Truncar detalle si es muy largo
        if len(detalle_str) > 55:
            detalle_str = detalle_str[:52] + "..."
        c.drawString(360, y, detalle_str)
        
        y -= 15
        
    c.save()
    
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return FileResponse(path, filename=filename, media_type="application/pdf", headers=headers)


@router.delete("/logs")
def limpiar_logs(
    session: Session = Depends(get_session),
    _: dict = Depends(solo_dev),
):
    count = session.exec(select(func.count()).select_from(AuditLog)).one()
    session.exec(text("DELETE FROM auditlog"))
    session.commit()
    return {"message": f"{count} registros de auditoría eliminados."}


# ── BACKUP ───────────────────────────────────────────────────

@router.post("/backup")
def hacer_backup(
    _: dict = Depends(solo_dev),
):
    """Ejecuta pg_dump y retorna el archivo SQL como descarga."""
    from dotenv import load_dotenv
    load_dotenv()

    db_url = os.getenv("DATABASE_URL", "")
    # Parsear la URL: postgresql://user:pass@host:port/dbname
    try:
        parts = db_url.replace("postgresql://", "").split("@")
        user_pass = parts[0].split(":")
        host_db = parts[1].split("/")
        host_port = host_db[0].split(":")
        PG_USER = user_pass[0]
        PG_PASS = user_pass[1] if len(user_pass) > 1 else ""
        PG_HOST = host_port[0]
        PG_PORT = host_port[1] if len(host_port) > 1 else "5432"
        PG_DB = host_db[1]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parseando DATABASE_URL: {e}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join(os.path.dirname(__file__), "..", "..", "backups")
    os.makedirs(backup_dir, exist_ok=True)
    backup_path = os.path.abspath(os.path.join(backup_dir, f"backup_{timestamp}.sql"))

    env = os.environ.copy()
    env["PGPASSWORD"] = PG_PASS

    result = subprocess.run(
        ["pg_dump", "-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER, "-F", "p", "-f", backup_path, PG_DB],
        env=env,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=f"pg_dump falló: {result.stderr}")

    return FileResponse(
        path=backup_path,
        filename=f"DonBeni_backup_{timestamp}.sql",
        media_type="application/octet-stream",
    )


# ── LICENCIAS ────────────────────────────────────────────────

class LicenciaActivarPayload(BaseModel):
    clave: str
    username: str
    password: str


@router.get("/licencia/estado")
def estado_licencia(
    session: Session = Depends(get_session),
    _: dict = Depends(solo_dev),
):
    """Retorna la licencia activa más reciente."""
    lic = session.exec(
        select(Licencia)
        .where(Licencia.activa == True)
        .order_by(Licencia.fecha_vencimiento.desc())
    ).first()
    if not lic:
        return {"status": "sin_licencia", "expires": None, "clave": None}

    now = datetime.utcnow()
    if lic.fecha_vencimiento < now:
        return {"status": "vencida", "expires": str(lic.fecha_vencimiento.date()), "clave": lic.clave}

    dias = (lic.fecha_vencimiento - now).days
    return {
        "status": "activa",
        "expires": str(lic.fecha_vencimiento.date()),
        "dias_restantes": dias,
        "clave": lic.clave,
    }


@router.post("/licencia/generar")
def generar_licencia(
    session: Session = Depends(get_session),
    dev: dict = Depends(solo_dev),
):
    """Genera una nueva clave de licencia con vencimiento de 6 meses."""
    # Formato: DONBENI-XXXX-XXXX-XXXX-XXXX
    clave = "DONBENI-" + "-".join(
        secrets.token_hex(2).upper() for _ in range(4)
    )

    vencimiento = datetime.utcnow() + timedelta(days=183)  # ~6 meses

    nueva = Licencia(
        clave=clave,
        activa=True,
        fecha_vencimiento=vencimiento,
        creada_por=dev["username"],
    )
    session.add(nueva)
    session.commit()
    session.refresh(nueva)

    return {
        "clave": nueva.clave,
        "fecha_emision": str(nueva.fecha_emision.date()),
        "fecha_vencimiento": str(nueva.fecha_vencimiento.date()),
    }


@router.delete("/licencia/revocar")
def revocar_licencia(
    session: Session = Depends(get_session),
    _: dict = Depends(solo_dev),
):
    """Desactiva todas las licencias activas (revocación de emergencia)."""
    licencias = session.exec(
        select(Licencia).where(Licencia.activa == True)
    ).all()

    if not licencias:
        raise HTTPException(status_code=404, detail="No hay licencias activas para revocar")

    for lic in licencias:
        lic.activa = False
        session.add(lic)
    session.commit()

    return {"message": f"{len(licencias)} licencia(s) revocada(s) correctamente."}


@router.post("/licencia/activar")
def activar_licencia(
    payload: LicenciaActivarPayload,
    session: Session = Depends(get_session),
):
    """
    Cualquier usuario (admin o vendedor) puede activar una licencia
    si presenta su clave, username y password válidos.
    """
    usuario = session.exec(
        select(Usuario).where(Usuario.username == payload.username)
    ).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    from app.services.auth import verificar_password
    if not verificar_password(payload.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    lic = session.exec(
        select(Licencia).where(Licencia.clave == payload.clave)
    ).first()
    if not lic:
        raise HTTPException(status_code=404, detail="Clave de licencia no encontrada")

    if not lic.activa:
        raise HTTPException(status_code=400, detail="Esta licencia ya fue desactivada")

    now = datetime.utcnow()
    if lic.fecha_vencimiento < now:
        raise HTTPException(status_code=400, detail="Esta licencia ya está vencida")

    return {
        "ok": True,
        "message": "Licencia válida y activa",
        "expires": str(lic.fecha_vencimiento.date()),
        "dias_restantes": (lic.fecha_vencimiento - now).days,
    }
