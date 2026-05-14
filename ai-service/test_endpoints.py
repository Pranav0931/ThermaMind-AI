"""Comprehensive test suite for ThermaMind AI Service endpoints."""
from __future__ import annotations

import json
import os
import sys

os.environ.setdefault("PYTHONIOENCODING", "utf-8")
import httpx

BASE = "http://127.0.0.1:8000"
PASS = 0
FAIL = 0


def test(name: str, method: str, path: str, body: dict | None = None) -> dict | None:
    global PASS, FAIL
    url = f"{BASE}{path}"
    try:
        if method == "GET":
            r = httpx.get(url, timeout=30)
        else:
            r = httpx.post(url, json=body or {}, timeout=30)

        status_ok = 200 <= r.status_code < 300
        data = r.json()
        if status_ok:
            PASS += 1
            print(f"  [PASS] {name}: {r.status_code}")
            # Print a compact summary of the response
            summary = json.dumps(data, default=str)
            if len(summary) > 200:
                summary = summary[:200] + "..."
            print(f"     Response: {summary}")
            return data
        else:
            FAIL += 1
            print(f"  [FAIL] {name}: {r.status_code} -- {data}")
            return None
    except Exception as e:
        FAIL += 1
        print(f"  [FAIL] {name}: {type(e).__name__}: {e}")
        return None


print("=" * 60)
print("ThermaMind AI Service — Endpoint Tests")
print("=" * 60)

# 1. Health check
print("\n--- Health Check ---")
test("GET /health", "GET", "/health")

# 2. Predict occupancy
print("\n--- Occupancy Forecaster (LSTM) ---")
test("POST /predict/occupancy (zone 1, 60min)", "POST", "/predict/occupancy", {"zone_id": 1, "horizon_minutes": 60})
test("POST /predict/occupancy (zone 2, 30min)", "POST", "/predict/occupancy", {"zone_id": 2, "horizon_minutes": 30})
test("POST /predict/occupancy (zone 3, 120min)", "POST", "/predict/occupancy", {"zone_id": 3, "horizon_minutes": 120})

# 3. Predict demand
print("\n--- Demand Predictor (XGBoost) ---")
test("POST /predict/demand (zone 1, no conditions)", "POST", "/predict/demand", {"zone_id": 1})
test("POST /predict/demand (zone 2, with conditions)", "POST", "/predict/demand", {
    "zone_id": 2,
    "current_conditions": {"temperature": 23.5, "humidity": 52, "co2": 580, "occupancy": 28, "airflow": 72}
})

# 4. Anomaly detection
print("\n--- Anomaly Detector (Isolation Forest) ---")
test("POST /detect/anomaly (normal readings)", "POST", "/detect/anomaly", {
    "zone_id": 1,
    "readings": [
        {"temperature": 22.1, "humidity": 44, "co2": 410, "occupancy": 12, "airflow": 65},
        {"temperature": 22.3, "humidity": 45, "co2": 415, "occupancy": 13, "airflow": 66},
    ]
})
test("POST /detect/anomaly (anomalous readings)", "POST", "/detect/anomaly", {
    "zone_id": 1,
    "readings": [
        {"temperature": 29.5, "humidity": 68, "co2": 1050, "occupancy": 40, "airflow": 30},
    ]
})
test("POST /detect/anomaly (empty readings)", "POST", "/detect/anomaly", {
    "zone_id": 1,
    "readings": []
})

# 5. HVAC optimization
print("\n--- RL HVAC Optimizer (DQN) ---")
test("POST /optimize/hvac (zone 1)", "POST", "/optimize/hvac", {
    "zone_id": 1,
    "current_state": {"temperature": 23.5, "humidity": 48, "co2": 450, "occupancy": 15, "airflow": 65},
    "target": {"temperature": 22, "humidity": 45}
})
test("POST /optimize/hvac (zone 3, cold storage)", "POST", "/optimize/hvac", {
    "zone_id": 3,
    "current_state": {"temperature": 21.5, "humidity": 42, "co2": 380, "occupancy": 4, "airflow": 58},
    "target": {"temperature": 20, "humidity": 40}
})

# 6. Recommendation engine
print("\n--- Recommendation Engine ---")
test("POST /recommend (zone 1)", "POST", "/recommend", {"zone_id": 1})
test("POST /recommend (zone 2)", "POST", "/recommend", {"zone_id": 2})

# 7. Combined predict
print("\n--- Combined Predict ---")
test("POST /predict (zone 1, 60min)", "POST", "/predict", {"zone_id": 1, "horizon_minutes": 60})

# Summary
print("\n" + "=" * 60)
print(f"RESULTS: {PASS} passed, {FAIL} failed, {PASS + FAIL} total")
print("=" * 60)

sys.exit(1 if FAIL > 0 else 0)
