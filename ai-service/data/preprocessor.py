from __future__ import annotations

import math
from datetime import datetime
from pathlib import Path
from typing import Iterable

import joblib
import numpy as np

from config import MODEL_DIR
from data.synthetic_generator import ZONE_PROFILES, external_temperature


def safe_float(value: object, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def parse_timestamp(value: object | None = None) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            return datetime.now()
    return datetime.now()


def cyclical_time_features(timestamp: datetime) -> list[float]:
    hour = timestamp.hour + timestamp.minute / 60
    day = timestamp.weekday()
    return [
        math.sin(hour / 24 * math.tau),
        math.cos(hour / 24 * math.tau),
        math.sin(day / 7 * math.tau),
        math.cos(day / 7 * math.tau),
    ]


def zone_capacity(zone_id: int) -> int:
    return int(ZONE_PROFILES.get(zone_id, ZONE_PROFILES[1])["capacity"])


def zone_targets(zone_id: int) -> tuple[float, float]:
    profile = ZONE_PROFILES.get(zone_id, ZONE_PROFILES[1])
    return float(profile["target_temp"]), float(profile["target_humidity"])


def demand_features(zone_id: int, conditions: dict | None) -> np.ndarray:
    conditions = conditions or {}
    timestamp = parse_timestamp(conditions.get("timestamp"))
    target_temp, target_humidity = zone_targets(zone_id)
    capacity = zone_capacity(zone_id)

    values = [
        safe_float(conditions.get("temperature"), target_temp),
        safe_float(conditions.get("humidity"), target_humidity),
        safe_float(conditions.get("co2"), 420),
        safe_float(conditions.get("occupancy"), capacity * 0.35) / max(capacity, 1),
        safe_float(conditions.get("airflow"), 65),
        safe_float(conditions.get("external_temp"), external_temperature(timestamp)),
        target_temp,
        target_humidity,
        float(zone_id),
        *cyclical_time_features(timestamp),
    ]
    return np.array(values, dtype=np.float32)


def anomaly_features(reading: dict) -> np.ndarray:
    zone_id = int(safe_float(reading.get("zoneId", reading.get("zone_id", 1)), 1))
    capacity = zone_capacity(zone_id)
    return np.array(
        [
            safe_float(reading.get("temperature"), 22),
            safe_float(reading.get("humidity"), 45),
            safe_float(reading.get("co2"), 420),
            safe_float(reading.get("occupancy"), 0) / max(capacity, 1),
            safe_float(reading.get("airflow"), 65),
        ],
        dtype=np.float32,
    )


def occupancy_step_features(row: dict) -> np.ndarray:
    timestamp = parse_timestamp(row.get("timestamp"))
    zone_id = int(row.get("zone_id", row.get("zoneId", 1)))
    capacity = zone_capacity(zone_id)
    target_temp, target_humidity = zone_targets(zone_id)
    return np.array(
        [
            safe_float(row.get("occupancy"), capacity * 0.3) / max(capacity, 1),
            safe_float(row.get("temperature"), target_temp) - target_temp,
            (safe_float(row.get("humidity"), target_humidity) - target_humidity) / 20,
            (safe_float(row.get("co2"), 420) - 400) / 500,
            safe_float(row.get("airflow"), 65) / 100,
            float(zone_id) / 3,
            *cyclical_time_features(timestamp),
        ],
        dtype=np.float32,
    )


def build_occupancy_sequences(rows: Iterable[dict], history_steps: int, horizon_steps: int) -> tuple[np.ndarray, np.ndarray]:
    by_zone: dict[int, list[dict]] = {}
    for row in rows:
        by_zone.setdefault(int(row["zone_id"]), []).append(row)

    sequences: list[np.ndarray] = []
    targets: list[np.ndarray] = []
    for zone_id, zone_rows in by_zone.items():
        zone_rows.sort(key=lambda item: item["timestamp"])
        capacity = zone_capacity(zone_id)
        for idx in range(history_steps, len(zone_rows) - horizon_steps):
            sequences.append(np.stack([occupancy_step_features(row) for row in zone_rows[idx - history_steps : idx]]))
            targets.append(
                np.array(
                    [zone_rows[idx + step]["occupancy"] / max(capacity, 1) for step in range(horizon_steps)],
                    dtype=np.float32,
                )
            )

    return np.stack(sequences), np.stack(targets)


def model_path(filename: str) -> Path:
    return MODEL_DIR / filename


def dump_artifact(value: object, filename: str) -> Path:
    path = model_path(filename)
    joblib.dump(value, path)
    return path


def load_artifact(filename: str) -> object | None:
    path = model_path(filename)
    return joblib.load(path) if path.exists() else None
