from __future__ import annotations

import threading

import numpy as np
from xgboost import XGBRegressor

from config import RANDOM_SEED
from data.preprocessor import demand_features, dump_artifact, load_artifact
from data.synthetic_generator import generate_sensor_rows


ARTIFACT = "demand_xgb.joblib"
_lock = threading.Lock()
_model: XGBRegressor | None = None


def _training_matrix() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rows = generate_sensor_rows(1_200, seed=RANDOM_SEED)
    features = np.stack([demand_features(int(row["zone_id"]), row) for row in rows])
    load = np.array([float(row["hvac_load"]) for row in rows], dtype=np.float32)
    optimal = np.array([float(row["optimal_load"]) for row in rows], dtype=np.float32)
    return features, load, optimal


def train_and_save(force: bool = False) -> XGBRegressor:
    global _model
    if not force:
        existing = load_artifact(ARTIFACT)
        if isinstance(existing, XGBRegressor):
            _model = existing
            return existing

    features, load, _optimal = _training_matrix()
    model = XGBRegressor(
        n_estimators=90,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="reg:squarederror",
        random_state=RANDOM_SEED,
    )
    model.fit(features, load)
    dump_artifact(model, ARTIFACT)
    _model = model
    return model


def _get_model() -> XGBRegressor:
    global _model
    if _model is not None:
        return _model
    with _lock:
        if _model is not None:
            return _model
        loaded = load_artifact(ARTIFACT)
        if isinstance(loaded, XGBRegressor):
            _model = loaded
            return loaded
        return train_and_save(force=True)


def predict_demand(zone_id: int, current_conditions: dict | None) -> dict:
    model = _get_model()
    features = demand_features(zone_id, current_conditions).reshape(1, -1)
    predicted = float(model.predict(features)[0])
    optimized = predicted * 0.76
    savings = ((predicted - optimized) / max(predicted, 1)) * 100
    return {
        "predicted_load_kw": round(predicted, 1),
        "optimal_load_kw": round(optimized, 1),
        "savings": round(savings, 1),
    }
