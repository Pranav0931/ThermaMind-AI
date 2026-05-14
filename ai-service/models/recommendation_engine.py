from __future__ import annotations

from .occupancy_forecaster import predict_occupancy


def recommend(zone_id: int) -> dict:
    occupancy = predict_occupancy(zone_id, 60)
    peak = max(occupancy["predictions"])
    if peak > 22:
        return {
            "type": "pre_cool",
            "recommendation": f"Occupancy is forecast to peak at {peak}. Pre-cool the zone and ramp airflow gradually.",
            "confidence": occupancy["confidence"],
            "savings_percent": 12.5,
            "co2_trend": "stable",
        }

    return {
        "type": "airflow_redirect",
        "recommendation": "Demand is stable. Maintain balanced airflow and trim compressor load for energy savings.",
        "confidence": occupancy["confidence"],
        "savings_percent": 9.2,
        "co2_trend": "stable",
    }
