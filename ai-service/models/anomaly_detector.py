from __future__ import annotations


def detect_anomaly(zone_id: int, readings: list[dict]) -> dict:
    if not readings:
        return {"is_anomaly": False, "score": 0, "type": "none", "message": "No readings available."}

    latest = readings[-1]
    temperature = float(latest.get("temperature", 22))
    humidity = float(latest.get("humidity", 45))
    co2 = float(latest.get("co2", 420))
    airflow = float(latest.get("airflow", 65))

    score = max(
        abs(temperature - 22) / 8,
        max(0, humidity - 58) / 18,
        max(0, co2 - 760) / 420,
        0.8 if airflow < 38 else 0,
    )
    score = max(0, min(1, score))

    if co2 > 800:
        anomaly_type = "co2_high"
    elif humidity > 60:
        anomaly_type = "humidity_rise"
    elif temperature > 25:
        anomaly_type = "temp_spike"
    else:
        anomaly_type = "airflow_drop"

    return {
        "is_anomaly": score > 0.7,
        "score": round(score, 2),
        "type": anomaly_type,
        "message": f"{anomaly_type.replace('_', ' ')} detected in zone {zone_id}.",
    }
