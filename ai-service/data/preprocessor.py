from __future__ import annotations


def sensor_features(reading: dict) -> list[float]:
    return [
        float(reading.get("temperature", 22)),
        float(reading.get("humidity", 45)),
        float(reading.get("co2", 420)),
        float(reading.get("occupancy", 0)),
        float(reading.get("airflow", 65)),
    ]
