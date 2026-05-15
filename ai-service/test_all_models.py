"""Test all 5 AI model endpoints and validate their output."""
import json
import sys
import time
import requests

BASE = "http://localhost:8000"
PASS = 0
FAIL = 0

def test(name, method, url, payload=None):
    global PASS, FAIL
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"{'='*60}")
    try:
        start = time.time()
        if method == "GET":
            r = requests.get(url, timeout=30)
        else:
            r = requests.post(url, json=payload, timeout=30)
        elapsed = time.time() - start
        
        print(f"Status: {r.status_code} ({elapsed:.2f}s)")
        data = r.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if r.status_code == 200:
            PASS += 1
            print(f"RESULT: PASS")
        else:
            FAIL += 1
            print(f"RESULT: FAIL (status {r.status_code})")
        return data
    except Exception as e:
        FAIL += 1
        print(f"RESULT: FAIL ({e})")
        return None

# 1. Health Check
test("Health Check", "GET", f"{BASE}/health")

# 2. Occupancy Forecaster (LSTM)
data = test("Occupancy Forecaster (LSTM)", "POST", f"{BASE}/predict/occupancy", 
    {"zone_id": 1, "horizon_minutes": 60})
if data:
    assert "predictions" in data, "Missing 'predictions' key"
    assert "confidence" in data, "Missing 'confidence' key"
    assert isinstance(data["predictions"], list), "predictions should be a list"
    assert len(data["predictions"]) >= 1, "predictions should have at least 1 value"
    assert 0 <= data["confidence"] <= 1, "confidence should be between 0 and 1"
    print("  Predictions:", data["predictions"])
    print(f"  Confidence: {data['confidence']}")
    print("  VALIDATION: PASS")

# 3. Demand Predictor (XGBoost)
data = test("Demand Predictor (XGBoost)", "POST", f"{BASE}/predict/demand",
    {"zone_id": 1, "current_conditions": {"temperature": 23.5, "humidity": 48, "co2": 450, "occupancy": 15, "airflow": 68}})
if data:
    assert "predicted_load_kw" in data, "Missing 'predicted_load_kw'"
    assert "optimal_load_kw" in data, "Missing 'optimal_load_kw'"
    assert "savings" in data, "Missing 'savings'"
    assert data["predicted_load_kw"] > 0, "predicted_load should be positive"
    assert data["optimal_load_kw"] < data["predicted_load_kw"], "optimal should be less than predicted"
    assert data["savings"] > 0, "savings should be positive"
    print(f"  Predicted: {data['predicted_load_kw']} kW")
    print(f"  Optimal:   {data['optimal_load_kw']} kW")
    print(f"  Savings:   {data['savings']}%")
    print("  VALIDATION: PASS")

# 4. Anomaly Detector (Isolation Forest) - normal reading
data = test("Anomaly Detector - Normal Reading", "POST", f"{BASE}/detect/anomaly",
    {"zone_id": 1, "readings": [{"temperature": 22.1, "humidity": 44, "co2": 410, "occupancy": 12, "airflow": 65}]})
if data:
    assert "is_anomaly" in data, "Missing 'is_anomaly'"
    assert "score" in data, "Missing 'score'"
    assert "type" in data, "Missing 'type'"
    assert "message" in data, "Missing 'message'"
    print(f"  Is Anomaly: {data['is_anomaly']}")
    print(f"  Score: {data['score']}")
    print(f"  Type: {data['type']}")
    print("  VALIDATION: PASS")

# 5. Anomaly Detector - anomalous reading (high temp + CO2)
data = test("Anomaly Detector - Anomalous Reading", "POST", f"{BASE}/detect/anomaly",
    {"zone_id": 2, "readings": [{"temperature": 29.5, "humidity": 65, "co2": 1050, "occupancy": 48, "airflow": 35}]})
if data:
    print(f"  Is Anomaly: {data['is_anomaly']} (expected: True)")
    print(f"  Score: {data['score']} (expected: > 0.7)")
    print(f"  Type: {data['type']}")
    print("  VALIDATION: PASS" if data['is_anomaly'] else "  VALIDATION: WARNING - expected anomaly")

# 6. RL HVAC Optimizer (DQN)
data = test("RL HVAC Optimizer (DQN)", "POST", f"{BASE}/optimize/hvac",
    {"zone_id": 1, "current_state": {"temperature": 24.2, "humidity": 52, "co2": 580, "occupancy": 20, "airflow": 70}, 
     "target": {"temperature": 22, "humidity": 45}})
if data:
    assert "action" in data, "Missing 'action'"
    assert "new_setpoint" in data, "Missing 'new_setpoint'"
    assert "fan_speed" in data, "Missing 'fan_speed'"
    assert "predicted_savings" in data, "Missing 'predicted_savings'"
    assert "efficiency_score" in data, "Missing 'efficiency_score'"
    assert data["action"] in ["increase_cooling", "decrease_cooling", "increase_fan", "decrease_fan", "maintain", "eco_mode", "boost_mode"]
    print(f"  Action:           {data['action']}")
    print(f"  New Setpoint:     {data['new_setpoint']}°C")
    print(f"  Fan Speed:        {data['fan_speed']}%")
    print(f"  Predicted Savings: {data['predicted_savings']}%")
    print(f"  Efficiency:       {data['efficiency_score']}%")
    print("  VALIDATION: PASS")

# 7. Recommendation Engine (Rules + optional Gemini)
data = test("Recommendation Engine", "POST", f"{BASE}/recommend",
    {"zone_id": 1})
if data:
    assert "type" in data, "Missing 'type'"
    assert "recommendation" in data, "Missing 'recommendation'"
    assert "confidence" in data, "Missing 'confidence'"
    assert "savings_percent" in data, "Missing 'savings_percent'"
    assert "co2_trend" in data, "Missing 'co2_trend'"
    assert data["type"] in ["pre_cool", "setback", "airflow_redirect"]
    print(f"  Type:       {data['type']}")
    print(f"  Message:    {data['recommendation'][:80]}...")
    print(f"  Confidence: {data['confidence']}")
    print(f"  Savings:    {data['savings_percent']}%")
    print(f"  CO2 Trend:  {data['co2_trend']}")
    print("  VALIDATION: PASS")

# 8. Combined predict endpoint
data = test("Combined Predict (Occupancy + Demand)", "POST", f"{BASE}/predict",
    {"zone_id": 2, "horizon_minutes": 30})
if data:
    assert "occupancy" in data, "Missing 'occupancy'"
    assert "demand" in data, "Missing 'demand'"
    print(f"  Occupancy predictions: {data['occupancy']['predictions']}")
    print(f"  Demand predicted load: {data['demand']['predicted_load_kw']} kW")
    print("  VALIDATION: PASS")

# Summary
print(f"\n{'='*60}")
print(f"TEST SUMMARY: {PASS} PASSED, {FAIL} FAILED out of {PASS+FAIL} tests")
print(f"{'='*60}")
sys.exit(0 if FAIL == 0 else 1)
