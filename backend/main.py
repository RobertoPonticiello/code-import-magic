import os
import random
from datetime import datetime, timedelta
from typing import Any, Dict, List

import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from utils.csv_loader import get_all_data, update_row

# Create FastAPI app instance FIRST
app = FastAPI()

# CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


class ApplySuggestionRequest(BaseModel):
    booking_id: str


fallback_actions = [
    {
        "title": "Usa i mezzi pubblici",
        "description": "Lascia l'auto a casa per gli spostamenti di oggi",
        "co2_grams": 380,
        "difficulty": "facile",
    },
    {
        "title": "Riduci il riscaldamento",
        "description": "Abbassa di 1°C il termostato: -7% di consumi energetici",
        "co2_grams": 150,
        "difficulty": "facile",
    },
    {
        "title": "Mangia vegetariano oggi",
        "description": "Un pasto senza carne riduce l'impronta idrica e carbonica",
        "co2_grams": 900,
        "difficulty": "medio",
    },
    {
        "title": "Fai la spesa a piedi",
        "description": "Raggiungi il supermercato piu vicino senza veicoli",
        "co2_grams": 200,
        "difficulty": "facile",
    },
]


user_state = {
    "co2_saved_kg": 0.0,
    "streak_days": 1,
    "actions_today": 0,
    "actions_done": [],  # lista di action id gia fatti oggi
}


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _classify_pm25(pm25: float) -> Dict[str, str]:
    if pm25 < 12:
        return {"level": "Ottima", "color": "green"}
    if pm25 < 35:
        return {"level": "Buona", "color": "yellow"}
    if pm25 < 55:
        return {"level": "Moderata", "color": "orange"}
    return {"level": "Scarsa", "color": "red"}


def _mock_env_payload() -> Dict[str, Any]:
    pm25 = round(random.uniform(10, 40), 1)
    aqi = _classify_pm25(pm25)
    return {
        "temperature": round(random.uniform(15.0, 26.0), 1),
        "humidity": random.randint(40, 75),
        "wind_speed": round(random.uniform(4.0, 22.0), 1),
        "precipitation": round(random.uniform(0.0, 3.0), 1),
        "aqi_pm25": pm25,
        "aqi_level": aqi["level"],
        "aqi_color": aqi["color"],
        "co2_saved_today_kg": round(user_state["co2_saved_kg"], 2),
        "source": "Open-Meteo + OpenAQ",
    }


def _extract_pm25_from_open_meteo(data: Dict[str, Any]) -> float:
    hourly = data.get("hourly", {})
    pm25_values = hourly.get("pm2_5", []) or []
    time_values = hourly.get("time", []) or []
    current_time = data.get("current", {}).get("time")

    if current_time and current_time in time_values:
        idx = time_values.index(current_time)
        if idx < len(pm25_values):
            return _safe_float(pm25_values[idx], 0.0)

    return _safe_float(pm25_values[0], 0.0) if pm25_values else 0.0


def _extract_pm25_from_openaq(data: Dict[str, Any]) -> float:
    results = data.get("results", []) or []
    for item in results:
        measurements = item.get("measurements", []) or []
        for measurement in measurements:
            parameter = str(measurement.get("parameter", "")).lower()
            if parameter in {"pm25", "pm2_5"}:
                return _safe_float(measurement.get("value"), 0.0)
    return 0.0


def get_env_live_data() -> Dict[str, Any]:
    env_data = _mock_env_payload()

    open_meteo_url = (
        "https://api.open-meteo.com/v1/forecast"
        "?latitude=41.9028"
        "&longitude=12.4964"
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation"
        "&hourly=pm10,pm2_5"
        "&timezone=Europe/Rome"
    )
    openaq_url = "https://api.openaq.org/v2/latest?city=Roma&limit=5&parameter=pm25"

    meteo_ok = False
    openaq_ok = False

    try:
        meteo_res = requests.get(open_meteo_url, timeout=12)
        if meteo_res.status_code == 200:
            meteo = meteo_res.json()
            current = meteo.get("current", {})
            env_data["temperature"] = _safe_float(current.get("temperature_2m"), env_data["temperature"])
            env_data["humidity"] = int(_safe_float(current.get("relative_humidity_2m"), env_data["humidity"]))
            env_data["wind_speed"] = _safe_float(current.get("wind_speed_10m"), env_data["wind_speed"])
            env_data["precipitation"] = _safe_float(current.get("precipitation"), env_data["precipitation"])
            meteo_pm25 = _extract_pm25_from_open_meteo(meteo)
            if meteo_pm25 > 0:
                env_data["aqi_pm25"] = round(meteo_pm25, 1)
            meteo_ok = True
    except Exception:
        pass

    try:
        openaq_res = requests.get(openaq_url, timeout=12)
        if openaq_res.status_code == 200:
            openaq = openaq_res.json()
            openaq_pm25 = _extract_pm25_from_openaq(openaq)
            if openaq_pm25 > 0:
                env_data["aqi_pm25"] = round(openaq_pm25, 1)
            openaq_ok = True
    except Exception:
        pass

    aqi = _classify_pm25(_safe_float(env_data["aqi_pm25"], 0.0))
    env_data["aqi_level"] = aqi["level"]
    env_data["aqi_color"] = aqi["color"]
    env_data["co2_saved_today_kg"] = round(user_state["co2_saved_kg"], 2)

    if meteo_ok and openaq_ok:
        env_data["source"] = "Open-Meteo + OpenAQ"
    else:
        env_data["source"] = "Open-Meteo + OpenAQ (fallback mock)"

    return env_data


async def call_openai_api(prompt: str, max_tokens: int = 250) -> str:
    """Call OpenAI API with safe fallback."""
    if not OPENAI_API_KEY:
        raise Exception("OPENAI_API_KEY missing")

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [
            {"role": "system", "content": "Sei un assistente ambientale utile e preciso."},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.4,
    }

    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if response.status_code != 200:
        raise Exception(f"OpenAI API error: {response.status_code}")

    return response.json()["choices"][0]["message"]["content"]


def generate_monthly_energy_data() -> List[Dict[str, Any]]:
    """Legacy chart data retained for backward compatibility in /data."""
    base = datetime(2026, 3, 1, 0, 0)
    data: List[Dict[str, Any]] = []
    for day in range(30):
        for hour in range(8, 18):
            dt = base + timedelta(days=day, hours=hour)
            consumption = random.randint(70, 120)
            optimized = max(35, consumption - random.randint(10, 30))
            savings = consumption - optimized
            data.append(
                {
                    "datetime": dt.strftime("%Y-%m-%d %H:%M"),
                    "consumption": consumption,
                    "optimized": optimized,
                    "savings": savings,
                }
            )
    return data


def get_kpi_from_energy(data: List[Dict[str, Any]]) -> Dict[str, str]:
    total_savings = sum(d["savings"] for d in data)
    co2_avoided = round(total_savings * 0.0005, 2)
    return {
        "energy_saving": f"€{total_savings}",
        "energy_saving_trend": "18%",
        "co2_avoided": f"{co2_avoided}",
        "co2_avoided_trend": "12%",
        "comfort": f"{random.randint(85, 95)}",
        "comfort_trend": "5%",
    }


def _build_action_prompt(env: Dict[str, Any]) -> str:
    return f"""Sei un assistente ambientale per cittadini italiani.
Dati ambientali attuali a Roma:

Temperatura: {env['temperature']}°C
Umidita: {env['humidity']}%
Qualita dell'aria (PM2.5): {env['aqi_pm25']} µg/m³ — livello: {env['aqi_level']}
Vento: {env['wind_speed']} km/h
Precipitazioni: {env['precipitation']} mm

Genera esattamente 4 azioni concrete che un cittadino puo fare OGGI per ridurre il proprio impatto ambientale, tenendo conto delle condizioni meteo e della qualita dell'aria.
Per ogni azione rispondi SOLO in questo formato, una per riga:
ACTION|<titolo breve max 6 parole>|<descrizione pratica max 20 parole>|<impatto_co2_grammi_risparmiati>|<difficolta: facile/medio/difficile>
Esempio:
ACTION|Vai al lavoro in bici|Evita l'auto per il tragitto casa-ufficio oggi|420|facile
Genera esattamente 4 righe ACTION, niente altro."""


def _fallback_actions_with_ids() -> List[Dict[str, Any]]:
    actions = []
    for idx, action in enumerate(fallback_actions):
        actions.append({"id": f"action-{idx + 1}", **action})
    return actions


def parse_action_lines(response: str) -> List[Dict[str, Any]]:
    actions: List[Dict[str, Any]] = []

    for line in response.splitlines():
        raw = line.strip()
        if not raw:
            continue

        parts = [p.strip() for p in raw.split("|")]
        if len(parts) != 5 or parts[0] != "ACTION":
            continue

        title = parts[1][:80]
        description = parts[2][:220]
        co2_grams = int(_safe_float(parts[3], 0))
        difficulty = parts[4].lower()

        if co2_grams <= 0:
            continue
        if difficulty not in {"facile", "medio", "difficile"}:
            difficulty = "medio"

        actions.append(
            {
                "id": f"action-{len(actions) + 1}",
                "title": title,
                "description": description,
                "co2_grams": co2_grams,
                "difficulty": difficulty,
            }
        )

    return actions[:4]


async def generate_citizen_actions(env: Dict[str, Any]) -> List[Dict[str, Any]]:
    prompt = _build_action_prompt(env)
    try:
        ai_response = await call_openai_api(prompt, max_tokens=260)
        actions = parse_action_lines(ai_response)
        if len(actions) == 4:
            return actions
    except Exception:
        pass

    return _fallback_actions_with_ids()


@app.get("/env/live")
async def get_env_live() -> Dict[str, Any]:
    return get_env_live_data()


@app.get("/data")
async def get_dashboard_data() -> Dict[str, Any]:
    """Get dashboard data and attach new env + user payload."""
    try:
        energy_data = generate_monthly_energy_data()
        kpis = get_kpi_from_energy(energy_data)
        env = get_env_live_data()

        return {
            "meetings": [],
            "energyData": energy_data[-72:],
            "kpi": kpis,
            "env": env,
            "user_co2_saved_kg": round(user_state["co2_saved_kg"], 2),
            "user_streak_days": user_state["streak_days"],
            "user_actions_today": user_state["actions_today"],
        }
    except Exception:
        env = _mock_env_payload()
        return {
            "meetings": [],
            "energyData": [],
            "kpi": {},
            "env": env,
            "user_co2_saved_kg": round(user_state["co2_saved_kg"], 2),
            "user_streak_days": user_state["streak_days"],
            "user_actions_today": user_state["actions_today"],
        }


@app.get("/suggestions/all")
async def get_all_suggestions() -> Dict[str, Any]:
    """Return 4 daily citizen actions generated from current env data."""
    env = get_env_live_data()

    # Keep CSV read as soft dependency for compatibility with existing project data flow.
    try:
        _ = get_all_data()
    except Exception:
        pass

    actions = await generate_citizen_actions(env)
    return {"actions": actions, "env": env}


@app.post("/suggestions/problem/apply")
async def apply_optimal_settings(request: ApplySuggestionRequest) -> Dict[str, Any]:
    """Apply a daily action and update user eco-impact counters."""
    action_id = request.booking_id

    if action_id in user_state["actions_done"]:
        return {
            "status": "already_applied",
            "co2_saved_grams": 0,
            "total_co2_saved_kg": round(user_state["co2_saved_kg"], 2),
            "message": "Azione gia registrata oggi.",
        }

    env = get_env_live_data()
    actions = await generate_citizen_actions(env)
    selected = next((action for action in actions if action["id"] == action_id), None)

    if not selected and action_id.startswith("action-"):
        try:
            idx = int(action_id.split("-")[1]) - 1
            fallback = _fallback_actions_with_ids()
            if 0 <= idx < len(fallback):
                selected = fallback[idx]
        except Exception:
            selected = None

    if not selected:
        return {"status": "error", "message": "Action not found"}

    co2_saved_grams = int(_safe_float(selected.get("co2_grams"), 0))
    user_state["co2_saved_kg"] += co2_saved_grams / 1000
    user_state["actions_done"].append(action_id)
    user_state["actions_today"] = len(user_state["actions_done"])

    return {
        "status": "applied",
        "co2_saved_grams": co2_saved_grams,
        "total_co2_saved_kg": round(user_state["co2_saved_kg"], 2),
        "message": f"Ottimo! Hai risparmiato {co2_saved_grams}g di CO2 con questa scelta.",
    }


@app.get("/suggestions/problem")
async def get_worst_room_suggestion() -> Dict[str, Any]:
    """Legacy endpoint kept for compatibility, now returns first available action."""
    env = get_env_live_data()
    actions = await generate_citizen_actions(env)
    first = actions[0] if actions else None
    return {
        "action": first,
        "can_apply": bool(first),
        "env": env,
    }


@app.get("/applied-settings/{booking_id}")
async def get_applied_settings(booking_id: str) -> Dict[str, Any]:
    if booking_id in user_state["actions_done"]:
        return {
            "status": "found",
            "settings": {
                "action_id": booking_id,
                "total_co2_saved_kg": round(user_state["co2_saved_kg"], 2),
            },
        }
    return {"status": "not_found", "message": "Nessuna azione registrata per questo id"}


@app.get("/test-openai")
async def test_openai_connection() -> Dict[str, Any]:
    env = get_env_live_data()
    prompt = _build_action_prompt(env)
    try:
        response = await call_openai_api(prompt, max_tokens=120)
        return {
            "success": True,
            "response": response,
            "model": "gpt-3.5-turbo",
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "model": "gpt-3.5-turbo",
        }


@app.get("/")
def read_root() -> Dict[str, Any]:
    return {
        "message": "EcoSignal Backend - Dati ambientali e azioni cittadino",
        "version": "3.0",
        "features": ["Env Live", "AI Daily Actions", "Citizen CO2 Tracking"],
    }
