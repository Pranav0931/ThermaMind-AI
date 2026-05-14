from __future__ import annotations

import threading

import numpy as np
import torch
from torch import nn

from config import MODEL_DIR, RANDOM_SEED
from data.preprocessor import safe_float, zone_capacity, zone_targets
from data.synthetic_generator import generate_sensor_rows


ARTIFACT = MODEL_DIR / "hvac_q_network.pt"
ACTIONS = ["increase_cooling", "decrease_cooling", "increase_fan", "decrease_fan", "maintain", "eco_mode", "boost_mode"]
_lock = threading.Lock()
_model: "QNetwork | None" = None
_normalizer: tuple[np.ndarray, np.ndarray] | None = None


class QNetwork(nn.Module):
    def __init__(self, input_size: int, action_count: int):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(input_size, 48),
            nn.ReLU(),
            nn.Linear(48, 48),
            nn.ReLU(),
            nn.Linear(48, action_count),
        )

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        return self.layers(features)


def _state_features(row: dict, zone_id: int) -> np.ndarray:
    default_temp, default_humidity = zone_targets(zone_id)
    target_temp = safe_float(row.get("target_temp"), default_temp)
    target_humidity = safe_float(row.get("target_humidity"), default_humidity)
    capacity = zone_capacity(zone_id)
    return np.array(
        [
            safe_float(row.get("temperature"), target_temp) - target_temp,
            (safe_float(row.get("humidity"), target_humidity) - target_humidity) / 20,
            (safe_float(row.get("co2"), 420) - 420) / 500,
            safe_float(row.get("occupancy"), capacity * 0.3) / max(capacity, 1),
            safe_float(row.get("airflow"), 65) / 100,
            safe_float(row.get("external_temp"), 25) / 40,
            target_temp / 30,
            target_humidity / 80,
            safe_float(row.get("energy_price"), 0.14),
        ],
        dtype=np.float32,
    )


def _apply_action(row: dict, zone_id: int, action: str) -> tuple[float, float]:
    default_temp, _default_humidity = zone_targets(zone_id)
    target_temp = safe_float(row.get("target_temp"), default_temp)
    current_temp = safe_float(row.get("temperature"), target_temp)
    fan = safe_float(row.get("airflow"), 65)

    if action == "increase_cooling":
        return max(17.5, target_temp - 0.8), fan + 2
    if action == "decrease_cooling":
        return min(25.5, target_temp + 0.8), fan - 2
    if action == "increase_fan":
        return target_temp, fan + 12
    if action == "decrease_fan":
        return target_temp, fan - 10
    if action == "eco_mode":
        return min(25.5, target_temp + 1.2), fan - 8
    if action == "boost_mode":
        return max(17.5, min(target_temp, current_temp - 1.2)), fan + 16
    return target_temp, fan


def _reward(row: dict, zone_id: int, action: str) -> float:
    setpoint, fan = _apply_action(row, zone_id, action)
    target_temp, target_humidity = zone_targets(zone_id)
    temperature = safe_float(row.get("temperature"), target_temp)
    humidity = safe_float(row.get("humidity"), target_humidity)
    occupancy = safe_float(row.get("occupancy"), zone_capacity(zone_id) * 0.3)
    load = safe_float(row.get("hvac_load"), 10)

    next_temp = temperature + (setpoint - temperature) * 0.22 - (fan - 65) * 0.01
    next_humidity = humidity + (target_humidity - humidity) * 0.12 - (fan - 65) * 0.02
    comfort_penalty = abs(next_temp - target_temp) * 0.3 + abs(next_humidity - target_humidity) * 0.2
    energy_penalty = (load + max(0, fan - 65) * 0.04 + max(0, target_temp - setpoint) * 0.55) * 0.4
    occupancy_bonus = 0.4 if occupancy > zone_capacity(zone_id) * 0.65 and action in {"boost_mode", "increase_fan"} else 0
    eco_bonus = 0.5 if occupancy < zone_capacity(zone_id) * 0.2 and action in {"eco_mode", "decrease_cooling"} else 0
    return occupancy_bonus + eco_bonus - energy_penalty - comfort_penalty


def train_and_save(force: bool = False) -> QNetwork:
    global _model, _normalizer
    if ARTIFACT.exists() and not force:
        loaded = _load()
        if loaded is not None:
            return loaded

    torch.manual_seed(RANDOM_SEED)
    rows = generate_sensor_rows(1_200, seed=RANDOM_SEED + 29)
    features = np.stack([_state_features(row, int(row["zone_id"])) for row in rows])
    rewards = np.stack([[_reward(row, int(row["zone_id"]), action) for action in ACTIONS] for row in rows]).astype(np.float32)
    mean = features.mean(axis=0, keepdims=True)
    std = features.std(axis=0, keepdims=True) + 1e-6
    features = (features - mean) / std

    model = QNetwork(input_size=features.shape[-1], action_count=len(ACTIONS))
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    loss_fn = nn.MSELoss()
    x_train = torch.tensor(features, dtype=torch.float32)
    y_train = torch.tensor(rewards, dtype=torch.float32)

    for _epoch in range(10):
        permutation = torch.randperm(x_train.shape[0])
        for start in range(0, x_train.shape[0], 128):
            batch_idx = permutation[start : start + 128]
            prediction = model(x_train[batch_idx])
            loss = loss_fn(prediction, y_train[batch_idx])
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

    torch.save({"state_dict": model.state_dict(), "mean": mean, "std": std, "input_size": features.shape[-1]}, ARTIFACT)
    _model = model.eval()
    _normalizer = (mean, std)
    return _model


def _load() -> QNetwork | None:
    global _model, _normalizer
    if not ARTIFACT.exists():
        return None
    payload = torch.load(ARTIFACT, map_location="cpu")
    model = QNetwork(input_size=int(payload["input_size"]), action_count=len(ACTIONS))
    model.load_state_dict(payload["state_dict"])
    _model = model.eval()
    _normalizer = (payload["mean"], payload["std"])
    return _model


def _get_model() -> QNetwork:
    global _model
    if _model is not None:
        return _model
    with _lock:
        if _model is not None:
            return _model
        loaded = _load()
        return loaded if loaded is not None else train_and_save(force=True)


def optimize_hvac(zone_id: int, current_state: dict, target: dict | None) -> dict:
    model = _get_model()
    target = target or {}
    target_temp, target_humidity = zone_targets(zone_id)
    merged_state = {
        **current_state,
        "temperature": safe_float(current_state.get("temperature"), target_temp),
        "humidity": safe_float(current_state.get("humidity"), target_humidity),
    }
    if "temperature" in target:
        target_temp = safe_float(target.get("temperature"), target_temp)
    if "humidity" in target:
        target_humidity = safe_float(target.get("humidity"), target_humidity)

    feature = _state_features({"target_temp": target_temp, "target_humidity": target_humidity, **merged_state}, zone_id).reshape(1, -1)
    assert _normalizer is not None
    mean, std = _normalizer
    with torch.no_grad():
        q_values = model(torch.tensor((feature - mean) / std, dtype=torch.float32)).numpy()[0]
    action = ACTIONS[int(np.argmax(q_values))]
    new_setpoint, fan_speed = _apply_action(
        {
            "temperature": merged_state["temperature"],
            "airflow": current_state.get("airflow", 65),
            "target_temp": target_temp,
        },
        zone_id,
        action,
    )
    fan_speed = max(35, min(98, fan_speed))
    temp_delta = abs(safe_float(merged_state.get("temperature"), target_temp) - target_temp)
    humidity_delta = max(0, safe_float(merged_state.get("humidity"), target_humidity) - target_humidity)
    efficiency = max(70, min(99.4, 99 - temp_delta * 4 - humidity_delta * 0.45 + max(q_values) * 0.04))
    predicted_savings = max(4, min(31, 16 + (65 - fan_speed) * 0.08 - temp_delta * 2.4 + max(q_values) * 0.03))

    return {
        "action": action,
        "new_setpoint": round(new_setpoint, 1),
        "fan_speed": round(fan_speed, 1),
        "predicted_savings": round(predicted_savings, 1),
        "efficiency_score": round(efficiency, 1),
    }
