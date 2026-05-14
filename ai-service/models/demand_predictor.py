from __future__ import annotations


def predict_demand(zone_id: int, current_conditions: dict | None) -> dict:
    conditions = current_conditions or {}
    temperature = float(conditions.get("temperature", 22))
    humidity = float(conditions.get("humidity", 45))
    occupancy = float(conditions.get("occupancy", 10))
    airflow = float(conditions.get("airflow", 65))

    load = 7.8 + abs(temperature - 22) * 1.15 + max(0, humidity - 45) * 0.08 + occupancy * 0.16 + airflow * 0.025
    optimized = load * 0.76
    savings = ((load - optimized) / max(load, 1)) * 100
    return {
        "predicted_load_kw": round(load, 1),
        "optimal_load_kw": round(optimized, 1),
        "savings": round(savings, 1),
    }
