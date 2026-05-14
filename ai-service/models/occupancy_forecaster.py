from __future__ import annotations

import math
from datetime import datetime


def predict_occupancy(zone_id: int, horizon_minutes: int) -> dict:
    intervals = max(1, math.ceil(horizon_minutes / 15))
    hour = datetime.now().hour
    base_by_zone = {1: 12, 2: 18, 3: 4}
    capacity_by_zone = {1: 36, 2: 54, 3: 18}
    base = base_by_zone.get(zone_id, 10)
    capacity = capacity_by_zone.get(zone_id, 40)

    if 5 <= hour < 12:
        slope = 3.2
    elif 12 <= hour < 16:
        slope = 1.1
    elif 16 <= hour < 22:
        slope = -1.8
    else:
        slope = -0.7

    predictions = [max(0, min(capacity, round(base + slope * (idx + 1)))) for idx in range(intervals)]
    return {"predictions": predictions, "confidence": 0.91}
