from __future__ import annotations

import math
import random
from datetime import datetime, timedelta


ZONE_PROFILES: dict[int, dict[str, float | str]] = {
    1: {"name": "Storage Zone A", "capacity": 36, "target_temp": 22.0, "target_humidity": 45.0, "base_airflow": 65.0},
    2: {"name": "Packaging Section", "capacity": 54, "target_temp": 21.8, "target_humidity": 42.0, "base_airflow": 72.0},
    3: {"name": "Cold Storage Unit", "capacity": 18, "target_temp": 20.0, "target_humidity": 40.0, "base_airflow": 58.0},
}


def external_temperature(timestamp: datetime) -> float:
    hour = timestamp.hour + timestamp.minute / 60
    daily_wave = math.sin(((hour - 7) / 24) * math.tau)
    seasonal_wave = math.sin((timestamp.timetuple().tm_yday / 365) * math.tau)
    return 25 + daily_wave * 6 + seasonal_wave * 3


def occupancy_ratio(timestamp: datetime, zone_id: int) -> float:
    hour = timestamp.hour + timestamp.minute / 60
    if 6 <= hour < 14:
        base = 0.78
    elif 14 <= hour < 22:
        base = 0.44
    else:
        base = 0.13

    if zone_id == 2:
        base *= 1.15
    elif zone_id == 3:
        base *= 0.55

    weekday_modifier = 0.82 if timestamp.weekday() >= 5 else 1.0
    wave = math.sin((hour / 24) * math.tau) * 0.08
    return max(0.04, min(0.96, base * weekday_modifier + wave))


def generate_sensor_rows(
    count: int = 2_000,
    *,
    start: datetime | None = None,
    interval_minutes: int = 15,
    seed: int = 42,
) -> list[dict]:
    rng = random.Random(seed)
    start_time = start or (datetime.now() - timedelta(minutes=count * interval_minutes))
    rows: list[dict] = []

    for idx in range(count):
        timestamp = start_time + timedelta(minutes=idx * interval_minutes)
        for zone_id, profile in ZONE_PROFILES.items():
            capacity = int(profile["capacity"])
            target_temp = float(profile["target_temp"])
            target_humidity = float(profile["target_humidity"])
            airflow_base = float(profile["base_airflow"])
            ratio = occupancy_ratio(timestamp, zone_id)
            occupancy = max(0, min(capacity, round(capacity * ratio + rng.gauss(0, capacity * 0.04))))
            outside_temp = external_temperature(timestamp)
            door_event = 1 if rng.random() < 0.025 else 0
            shift_event = 1 if timestamp.hour in (6, 14, 22) and rng.random() < 0.12 else 0

            airflow = max(35, min(98, airflow_base + rng.gauss(0, 4.2) + (6 if shift_event else 0)))
            temperature = (
                target_temp
                + (outside_temp - target_temp) * 0.035
                + occupancy / max(capacity, 1) * 1.35
                - (airflow - 60) * 0.018
                + door_event * rng.uniform(0.8, 2.1)
                + rng.gauss(0, 0.22)
            )
            humidity = (
                target_humidity
                + occupancy * 0.12
                - (airflow - 60) * 0.05
                + door_event * rng.uniform(1.5, 4.5)
                + rng.gauss(0, 1.4)
            )
            co2 = 365 + occupancy * 9.5 - (airflow - 60) * 0.7 + rng.gauss(0, 18)
            hvac_load = (
                6.8
                + abs(temperature - target_temp) * 1.25
                + max(0, humidity - target_humidity) * 0.085
                + occupancy * 0.16
                + airflow * 0.028
                + max(0, outside_temp - 25) * 0.18
            )
            optimal_load = hvac_load * max(0.71, min(0.91, 0.76 + abs(temperature - target_temp) * 0.012))

            rows.append(
                {
                    "zone_id": zone_id,
                    "timestamp": timestamp,
                    "day_of_week": timestamp.weekday(),
                    "hour": timestamp.hour + timestamp.minute / 60,
                    "external_temp": round(outside_temp, 2),
                    "temperature": round(temperature, 2),
                    "humidity": round(max(25, min(70, humidity)), 2),
                    "co2": round(max(340, min(1_150, co2)), 2),
                    "occupancy": occupancy,
                    "airflow": round(airflow, 2),
                    "target_temp": target_temp,
                    "target_humidity": target_humidity,
                    "energy_price": round(0.12 + (0.07 if 15 <= timestamp.hour < 21 else 0) + rng.uniform(-0.01, 0.015), 3),
                    "hvac_load": round(hvac_load, 3),
                    "optimal_load": round(optimal_load, 3),
                    "door_event": door_event,
                    "shift_event": shift_event,
                }
            )

    return rows


def generate_recent_zone_rows(zone_id: int, steps: int, *, interval_minutes: int = 15, end: datetime | None = None) -> list[dict]:
    end_time = end or datetime.now()
    start = end_time - timedelta(minutes=(steps - 1) * interval_minutes)
    rows = generate_sensor_rows(steps, start=start, interval_minutes=interval_minutes, seed=zone_id * 101)
    return [row for row in rows if row["zone_id"] == zone_id][-steps:]
