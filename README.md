# EKKE Projekt

Ez a projekt egy Python (FastAPI) alapú backendből és egy statikus HTML/CSS/JS frontendből áll.

## Projekt felépítése
- `backend/`: A FastAPI szerver kódja, adatbázis modellek, LLM integráció és API végpontok.
- `frontend/`: A felhasználói felület (HTML, CSS, JS fájlok).

## Hogyan indítsd el a projektet?

### 1. Backend indítása
Nyiss egy terminált, majd lépj be a `backend` mappába, aktiváld a virtuális környezetet és indítsd el a szervert:
```bash
cd backend

# Ha még nem telepítetted a függőségeket:
pip install -r requirements.txt

# Ha van venv, aktiváld (Windows):
.\venv\Scripts\activate

# Indítsd el a szervert
uvicorn app.main:app --reload --port 8000
```
A backend elérhető lesz a [http://localhost:8000](http://localhost:8000) címen.

### 2. Frontend indítása
Nyiss egy új terminált, lépj be a `frontend` mappába és indíts el egy egyszerű helyi webszervert:
```bash
cd frontend

# Indítsd el a webszervert a 8080-as porton
python -m http.server 8080
```
A frontend elérhető lesz a [http://localhost:8080](http://localhost:8080) címen.

## Környezeti változók
A backend futtatásához szükséges egy `.env` fájl a `backend` mappában a megfelelő API kulcsokkal (pl. `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`).
