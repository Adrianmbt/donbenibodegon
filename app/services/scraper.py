import httpx
from bs4 import BeautifulSoup

async def get_bcv_rate():
    """Obtiene la tasa oficial del dólar del BCV de forma asíncrona."""
    url = "https://www.bcv.org.ve/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    async with httpx.AsyncClient(verify=False) as client:
        try:
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Buscamos el div específico del dólar en la web del BCV
            rate_element = soup.find("div", {"id": "dolar"}).find("strong")
            if not rate_element:
                raise ValueError("No se pudo encontrar el elemento de la tasa en la página.")
                
            rate_text = rate_element.text.strip().replace(",", ".")
            return float(rate_text)
        except Exception as e:
            print(f"Error al obtener tasa BCV: {e}")
            raise