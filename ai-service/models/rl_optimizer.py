from __future__ import annotations


def optimize_hvac(zone_id: int, current_state: dict, target: dict | None) -> dict:
    target = target or {}
    target_temp = float(target.get("temperature", 22))
    target_humidity = float(target.get("humidity", 45))
    temperature = float(current_state.get("temperature", 22))
    humidity = float(current_state.get("humidity", 45))
    fan_speed = float(current_state.get("airflow", 65))

    temp_delta = temperature - target_temp
    humidity_delta = humidity - target_humidity
    new_fan = max(40, min(95, fan_speed + humidity_delta * 0.8 + temp_delta * 2.5))
    action = "increase_cooling" if temp_delta > 0.8 else "decrease_cooling" if temp_delta < -0.8 else "maintain"
    efficiency = max(70, min(99, 99 - abs(temp_delta) * 4 - max(0, humidity_delta) * 0.5))

    return {
        "action": action,
        "new_setpoint": round(max(18, min(25, target_temp - max(0, temp_delta) * 0.25)), 1),
        "fan_speed": round(new_fan, 1),
        "predicted_savings": round(max(4, min(26, 18 - abs(temp_delta) * 3)), 1),
        "efficiency_score": round(efficiency, 1),
    }
