from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.database import get_session
from app.models import ExchangeRate
from app.services.scraper import get_bcv_rate

router = APIRouter(prefix="/bcv", tags=["BCV"])

@router.post("/update")
async def update_tasa(session: Session = Depends(get_session)):
    valor = await get_bcv_rate()
    nueva_tasa = ExchangeRate(rate=valor)
    session.add(nueva_tasa)
    session.commit()
    return {"status": "Tasa actualizada", "valor": valor}

@router.get("/tasa")
async def obtener_tasa(session: Session = Depends(get_session)):
    tasa = session.exec(select(ExchangeRate).order_by(ExchangeRate.id.desc())).first()
    if not tasa:
        try:
            # Si no hay tasa, intentamos obtenerla del scraper
            valor = await get_bcv_rate()
            nueva_tasa = ExchangeRate(rate=valor)
            session.add(nueva_tasa)
            session.commit()
            return {"rate": valor}
        except Exception:
            return {"rate": 457.07} # Fallback final
    return {"rate": tasa.rate}