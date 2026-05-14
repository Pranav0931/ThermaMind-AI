from __future__ import annotations

from config import GEMINI_API_KEY
from data.synthetic_generator import ZONE_PROFILES, generate_recent_zone_rows
from models.demand_predictor import predict_demand
from models.occupancy_forecaster import predict_occupancy
from models.rl_optimizer import optimize_hvac


def _optional_gemini_summary(context: dict) -> str | None:
    if not GEMINI_API_KEY:
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            "Write one concise warehouse HVAC recommendation using this context: "
            f"{context}. Avoid markdown and keep it under 32 words."
        )
        text = getattr(response, "text", "").strip()
        return text or None
    except Exception:
        return None


def recommend(zone_id: int) -> dict:
    occupancy = predict_occupancy(zone_id, 60)
    latest_rows = generate_recent_zone_rows(zone_id, 1)
    latest = latest_rows[-1] if latest_rows else {}
    demand = predict_demand(zone_id, latest)
    optimization = optimize_hvac(zone_id, latest, {"temperature": latest.get("target_temp"), "humidity": latest.get("target_humidity")})
    peak = max(occupancy["predictions"])
    current = int(latest.get("occupancy", 0))
    zone_name = str(ZONE_PROFILES.get(zone_id, ZONE_PROFILES[1])["name"])

    if peak >= current + 8:
        rec_type = "pre_cool"
        message = (
            f"{zone_name} occupancy is forecast to rise from {current} to {peak}. "
            f"Start pre-cooling and ramp airflow to {optimization['fan_speed']}% before the next shift peak."
        )
    elif demand["savings"] >= 18:
        rec_type = "setback"
        message = (
            f"{zone_name} can reduce HVAC demand by {demand['savings']}%. "
            f"Apply a {optimization['new_setpoint']}C setpoint and keep airflow balanced."
        )
    else:
        rec_type = "airflow_redirect"
        message = (
            f"{zone_name} demand is stable. Maintain balanced airflow and use {optimization['action']} "
            "only if comfort drift appears."
        )

    context = {
        "zone": zone_name,
        "type": rec_type,
        "occupancy_peak": peak,
        "demand": demand,
        "optimization": optimization,
    }
    generated = _optional_gemini_summary(context)

    return {
        "type": rec_type,
        "recommendation": generated or message,
        "confidence": round(min(0.97, max(0.74, occupancy["confidence"])), 2),
        "savings_percent": round(max(float(demand["savings"]), float(optimization["predicted_savings"])), 1),
        "co2_trend": "rising" if float(latest.get("co2", 420)) > 760 else "stable",
    }
