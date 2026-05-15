from __future__ import annotations

import math
import threading
from datetime import datetime

import numpy as np
import torch
from torch import nn

from config import MODEL_DIR, RANDOM_SEED
from data.preprocessor import build_occupancy_sequences, occupancy_step_features, zone_capacity
from data.synthetic_generator import generate_recent_zone_rows, generate_sensor_rows, occupancy_ratio


ARTIFACT = MODEL_DIR / "occupancy_lstm.pt"
HISTORY_STEPS = 8
HORIZON_STEPS = 4
_lock = threading.Lock()
_model: "OccupancyNetwork | None" = None
_normalizer: tuple[np.ndarray, np.ndarray] | None = None


class OccupancyNetwork(nn.Module):
    def __init__(self, input_size: int, hidden_size: int = 24, horizon_steps: int = HORIZON_STEPS):
        super().__init__()
        self.lstm = nn.LSTM(input_size=input_size, hidden_size=hidden_size, batch_first=True)
        self.head = nn.Sequential(nn.Linear(hidden_size, 32), nn.ReLU(), nn.Linear(32, horizon_steps), nn.Sigmoid())

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        output, _ = self.lstm(features)
        return self.head(output[:, -1, :])


def train_and_save(force: bool = False) -> OccupancyNetwork:
    global _model, _normalizer
    if ARTIFACT.exists() and not force:
        loaded = _load()
        if loaded is not None:
            return loaded

    torch.manual_seed(RANDOM_SEED)
    rows = generate_sensor_rows(1_400, seed=RANDOM_SEED + 13)
    x_train, y_train = build_occupancy_sequences(rows, HISTORY_STEPS, HORIZON_STEPS)
    mean = x_train.mean(axis=(0, 1), keepdims=True)
    std = x_train.std(axis=(0, 1), keepdims=True) + 1e-6
    x_train = (x_train - mean) / std

    model = OccupancyNetwork(input_size=x_train.shape[-1])
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    loss_fn = nn.MSELoss()
    features = torch.tensor(x_train, dtype=torch.float32)
    targets = torch.tensor(y_train, dtype=torch.float32)

    for _epoch in range(9):
        permutation = torch.randperm(features.shape[0])
        for start in range(0, features.shape[0], 128):
            batch_idx = permutation[start : start + 128]
            prediction = model(features[batch_idx])
            loss = loss_fn(prediction, targets[batch_idx])
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

    torch.save({"state_dict": model.state_dict(), "mean": mean, "std": std, "input_size": x_train.shape[-1]}, ARTIFACT)
    _model = model.eval()
    _normalizer = (mean, std)
    return _model


def _load() -> OccupancyNetwork | None:
    global _model, _normalizer
    if not ARTIFACT.exists():
        return None
    payload = torch.load(ARTIFACT, map_location="cpu", weights_only=False)
    model = OccupancyNetwork(input_size=int(payload["input_size"]))
    model.load_state_dict(payload["state_dict"])
    _model = model.eval()
    _normalizer = (payload["mean"], payload["std"])
    return _model


def _get_model() -> OccupancyNetwork:
    global _model
    if _model is not None:
        return _model
    with _lock:
        if _model is not None:
            return _model
        loaded = _load()
        return loaded if loaded is not None else train_and_save(force=True)


def _extrapolate(values: list[int], intervals: int, capacity: int) -> list[int]:
    if len(values) >= intervals:
        return values[:intervals]
    slope = values[-1] - values[-2] if len(values) > 1 else 0
    while len(values) < intervals:
        values.append(max(0, min(capacity, round(values[-1] + slope * 0.45))))
    return values


def predict_occupancy(zone_id: int, horizon_minutes: int) -> dict:
    model = _get_model()
    capacity = zone_capacity(zone_id)
    intervals = max(1, math.ceil(horizon_minutes / 15))
    rows = generate_recent_zone_rows(zone_id, HISTORY_STEPS)
    sequence = np.stack([occupancy_step_features(row) for row in rows]).reshape(1, HISTORY_STEPS, -1)
    assert _normalizer is not None
    mean, std = _normalizer
    normalized = (sequence - mean) / std

    with torch.no_grad():
        ratios = model(torch.tensor(normalized, dtype=torch.float32)).numpy()[0]

    now = datetime.now()
    heuristic = [
        occupancy_ratio(now.replace(minute=(now.minute // 15) * 15), zone_id)
        for _ in range(HORIZON_STEPS)
    ]
    blended = ratios * 0.78 + np.array(heuristic, dtype=np.float32) * 0.22
    predictions = [max(0, min(capacity, round(float(value) * capacity))) for value in blended]
    predictions = _extrapolate(predictions, intervals, capacity)
    confidence = max(0.72, min(0.96, 0.94 - float(np.std(blended)) * 0.22))
    return {"predictions": predictions, "confidence": round(confidence, 2)}
