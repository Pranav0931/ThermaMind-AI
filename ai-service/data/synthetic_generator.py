from __future__ import annotations

import random


def generate_sensor_rows(count: int = 500) -> list[dict]:
    rows = []
    for idx in range(count):
        hour = idx % 24
        occupancy = 22 if 6 <= hour < 14 else 12 if 14 <= hour < 22 else 4
        rows.append(
            {
                "temperature": round(22 + random.uniform(-1.2, 1.8), 1),
                "humidity": round(45 + random.uniform(-6, 8), 1),
                "co2": round(380 + occupancy * 8 + random.uniform(-20, 35), 1),
                "occupancy": max(0, occupancy + random.randint(-3, 3)),
                "airflow": round(65 + random.uniform(-8, 12), 1),
            }
        )
    return rows
