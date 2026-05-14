from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel, Field

from models.anomaly_detector import detect_anomaly
from models.demand_predictor import predict_demand
from models.occupancy_forecaster import predict_occupancy
from models.recommendation_engine import recommend
from models.rl_optimizer import optimize_hvac


app = FastAPI(title="ThermaMind AI Service", version="1.0.0")


class ZoneRequest(BaseModel):
    zone_id: int = Field(default=1, ge=1)


class OccupancyRequest(ZoneRequest):
    horizon_minutes: int = Field(default=60, ge=15, le=240)


class DemandRequest(ZoneRequest):
    current_conditions: dict = Field(default_factory=dict)


class AnomalyRequest(ZoneRequest):
    readings: list[dict] = Field(default_factory=list)


class OptimizeRequest(ZoneRequest):
    current_state: dict = Field(default_factory=dict)
    target: dict = Field(default_factory=dict)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "thermamind-ai-service"}


@app.post("/predict/occupancy")
def occupancy(request: OccupancyRequest) -> dict:
    return predict_occupancy(request.zone_id, request.horizon_minutes)


@app.post("/predict/demand")
def demand(request: DemandRequest) -> dict:
    return predict_demand(request.zone_id, request.current_conditions)


@app.post("/detect/anomaly")
def anomaly(request: AnomalyRequest) -> dict:
    return detect_anomaly(request.zone_id, request.readings)


@app.post("/optimize/hvac")
def optimize(request: OptimizeRequest) -> dict:
    return optimize_hvac(request.zone_id, request.current_state, request.target)


@app.post("/recommend")
def recommendation(request: ZoneRequest) -> dict:
    return recommend(request.zone_id)
