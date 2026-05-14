from __future__ import annotations

import threading

import numpy as np
from sklearn.ensemble import IsolationForest

from config import RANDOM_SEED
from data.preprocessor import anomaly_features, dump_artifact, load_artifact, safe_float
from data.synthetic_generator import generate_sensor_rows


ARTIFACT = "anomaly_isolation_forest.joblib"
_lock = threading.Lock()
_model: IsolationForest | None = None


def train_and_save(force: bool = False) -> IsolationForest:
    global _model
    if not force:
        existing = load_artifact(ARTIFACT)
        if isinstance(existing, IsolationForest):
            _model = existing
            return existing

    rows = generate_sensor_rows(1_500, seed=RANDOM_SEED + 7)
    features = np.stack([anomaly_features(row) for row in rows])
    model = IsolationForest(n_estimators=140, contamination=0.045, random_state=RANDOM_SEED)
    model.fit(features)
    dump_artifact(model, ARTIFACT)
    _model = model
    return model


def _get_model() -> IsolationForest:
    global _model
    if _model is not None:
        return _model
    with _lock:
        if _model is not None:
            return _model
        loaded = load_artifact(ARTIFACT)
        if isinstance(loaded, IsolationForest):
            _model = loaded
            return loaded
        return train_and_save(force=True)


def _threshold_score(reading: dict) -> tuple[float, str]:
    temperature = safe_float(reading.get("temperature"), 22)
    humidity = safe_float(reading.get("humidity"), 45)
    co2 = safe_float(reading.get("co2"), 420)
    airflow = safe_float(reading.get("airflow"), 65)

    candidates = [
        (abs(temperature - 22) / 8, "temp_spike" if temperature >= 22 else "temp_drop"),
        (max(0, humidity - 58) / 18, "humidity_rise"),
        (max(0, 30 - humidity) / 10, "humidity_drop"),
        (max(0, co2 - 760) / 420, "co2_high"),
        (0.8 if airflow < 38 else 0, "airflow_drop"),
    ]
    return max(candidates, key=lambda item: item[0])


def detect_anomaly(zone_id: int, readings: list[dict]) -> dict:
    if not readings:
        return {"is_anomaly": False, "score": 0, "type": "none", "message": "No readings available."}

    model = _get_model()
    latest = readings[-1]
    feature = anomaly_features({**latest, "zone_id": zone_id}).reshape(1, -1)
    isolation_score = float(-model.decision_function(feature)[0])
    normalized_isolation = max(0.0, min(1.0, (isolation_score + 0.1) / 0.28))
    threshold_score, anomaly_type = _threshold_score(latest)
    score = max(normalized_isolation, threshold_score)
    severity = "critical" if score > 0.9 else "warning"

    return {
        "is_anomaly": score > 0.7,
        "score": round(score, 2),
        "type": anomaly_type,
        "severity": severity,
        "message": f"{anomaly_type.replace('_', ' ')} pattern detected in zone {zone_id}.",
    }
