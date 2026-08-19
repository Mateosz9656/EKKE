import os
import json
from google import genai
from google.genai import types
from anthropic import Anthropic
from app.schemas.schemas import KosiceEvaluation
from sqlalchemy.orm import Session
from app.models.models import PromptLog

def get_genai_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")
    return genai.Client(api_key=api_key)

def get_anthropic_client():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY is not set")
    return Anthropic(api_key=api_key)

def evaluate_prompt_with_gatekeeper(hallgato_promptja: str, tudaster: str) -> tuple[KosiceEvaluation, int]:
    client = get_genai_client()

    sys_prompt = f"""Te egy szigorú és segítőkész oktatási 'Kapuőr' MI vagy. A feladatod a hallgatói promptok kiértékelése a következő dimenziók alapján:
- C: cél egyértelműsége
- I: bemenetek megadása
- O: elvárt kimenet megadása
- S: részfeladat kijelölése
- K: tudástérhez illeszkedés
- E: ellenőrizhetőség

Tudástér (csak ez adható át, ezen kívül eső kérések esetén a K pontszám 0):
{tudaster}

Minden szempontot 0, 1 vagy 2 ponttal értékelj. Térj vissza a megadott JSON sémában! 
Fontos: Az indoklásokat külön-külön add meg minden egyes dimenzióhoz (K_indoklas, O_indoklas, stb.).
Ezután az 'edukativ_visszajelzes' mezőben fogalmazz meg egy segítőkész, oktató jellegű szöveget a hallgató számára (tegezve), amely konkrétan rámutat, miben kell javítania a promptját. Ha a prompt jó, dicsérd meg!"""

    try:
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=[sys_prompt, hallgato_promptja],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=KosiceEvaluation,
                temperature=0.0
            ),
        )

        data = json.loads(response.text)
        token_cost = response.usage_metadata.total_token_count if response.usage_metadata else 0
        return KosiceEvaluation(**data), token_cost
    except Exception as e:
        print(f"Gemini API error: {e}")

        default_eval = KosiceEvaluation(
            K=0, K_indoklas="Hiba",
            O=0, O_indoklas="Hiba",
            S=0, S_indoklas="Hiba",
            I=0, I_indoklas="Hiba",
            C=0, C_indoklas="Hiba",
            E=0, E_indoklas="Hiba",
            edukativ_visszajelzes=f"Hiba történt a prompt értékelése során a Gemini API-nál: {str(e)}. Kérlek ellenőrizd az API kulcsot és a kvótát!"
        )
        return default_eval, 0

def worker_chat_stream(hallgato_promptja: str, tudaster: str, db: Session, prompt_log_id: int, eval_data: dict = None):
    if eval_data:
        import json
        yield json.dumps(eval_data) + "\n--EVAL-END--\n"

    client = get_anthropic_client()

    sys_prompt = f"""Te egy oktatási Munkavégző MI vagy. A tanár az alábbi kontextust (Tudásteret) határozta meg:
{tudaster}

Kritikus szabály: CSAK a fenti tudástérből adhatsz át ismeretet. Nem térhetsz el tőle, és nem oldhatod meg a teljes feladatot a hallgató helyett. Segítsd őt rávezetni a megoldásra a kérése szerint."""

    with client.messages.stream(
        max_tokens=2048,
        system=sys_prompt,
        messages=[
            {"role": "user", "content": hallgato_promptja}
        ],
        model="claude-haiku-4-5-20251001",
    ) as stream:
        full_response = ""
        for text in stream.text_stream:
            full_response += text
            yield text

        prompt_log = db.query(PromptLog).filter(PromptLog.id == prompt_log_id).first()
        if prompt_log:
            prompt_log.mi_valasz = full_response
            db.commit()
