import { Router } from "express";
import { z } from "zod";
import { aiService } from "../services/ai.service";
import { dataStore } from "../services/dataStore";
import { energyService } from "../services/energy.service";
import { sensorService } from "../services/sensor.service";
import { validateBody } from "../middleware/validate";

export const aiRoutes = Router();

const zoneRequestSchema = z
  .object({
    zoneId: z.coerce.number().int().positive().optional(),
    zone_id: z.coerce.number().int().positive().optional(),
  })
  .passthrough();

const predictSchema = zoneRequestSchema.extend({
  horizonMinutes: z.coerce.number().int().positive().max(240).optional(),
  horizon_minutes: z.coerce.number().int().positive().max(240).optional(),
});

const simulateSchema = zoneRequestSchema.extend({
  targetTemp: z.coerce.number().min(10).max(35).optional(),
  targetHum: z.coerce.number().min(20).max(75).optional(),
  horizonHours: z.coerce.number().int().positive().max(72).optional(),
});

const currentStateSchema = z.object({
  temperature: z.coerce.number().min(10).max(40).optional(),
  humidity: z.coerce.number().min(15).max(85).optional(),
  co2: z.coerce.number().min(250).max(2000).optional(),
  occupancy: z.coerce.number().min(0).max(500).optional(),
  airflow: z.coerce.number().min(20).max(120).optional(),
});

const optimizeSchema = zoneRequestSchema.extend({
  currentState: currentStateSchema.optional(),
  current_state: currentStateSchema.optional(),
  target: z
    .object({
      temperature: z.coerce.number().min(10).max(35).optional(),
      humidity: z.coerce.number().min(20).max(75).optional(),
    })
    .optional(),
  targetTemp: z.coerce.number().min(10).max(35).optional(),
  targetHum: z.coerce.number().min(20).max(75).optional(),
});

const evaluateSchema = zoneRequestSchema.extend({
  temperature: z.coerce.number().min(10).max(40),
  humidity: z.coerce.number().min(15).max(85),
  co2: z.coerce.number().min(250).max(2000),
  occupancy: z.coerce.number().min(0).max(500),
  airflow: z.coerce.number().min(20).max(120).optional(),
  targetTemp: z.coerce.number().min(10).max(35).optional(),
  targetHum: z.coerce.number().min(20).max(75).optional(),
  horizonMinutes: z.coerce.number().int().positive().max(240).optional(),
});

const scheduleOptimizeSchema = zoneRequestSchema.extend({
  name: z.string().min(1).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration: z.coerce.number().int().min(1).max(24).optional(),
  targetTemp: z.coerce.number().min(10).max(35),
  targetHum: z.coerce.number().min(20).max(75),
  mode: z.enum(["full_load", "standby", "eco"]).optional(),
});

function resolveZoneId(body: { zoneId?: number; zone_id?: number }) {
  return body.zoneId ?? body.zone_id ?? 1;
}

aiRoutes.post("/predict", validateBody(predictSchema), async (req, res) => {
  const zoneId = resolveZoneId(req.body);
  const horizon = req.body.horizonMinutes ?? req.body.horizon_minutes ?? 60;
  const prediction = await aiService.predictOccupancy(zoneId, horizon);
  res.json({ data: prediction });
});

aiRoutes.post("/predict/occupancy", validateBody(predictSchema), async (req, res) => {
  const zoneId = resolveZoneId(req.body);
  const horizon = req.body.horizonMinutes ?? req.body.horizon_minutes ?? 60;
  res.json({ data: await aiService.predictOccupancy(zoneId, horizon) });
});

aiRoutes.post("/predict/demand", validateBody(zoneRequestSchema), async (req, res) => {
  const zoneId = resolveZoneId(req.body);
  const latest = (await dataStore.getLatestReadings()).find((reading) => reading.zoneId === zoneId);
  res.json({ data: await aiService.predictDemand(zoneId, latest) });
});

aiRoutes.post("/recommend", validateBody(zoneRequestSchema), async (req, res) => {
  const zoneId = resolveZoneId(req.body);
  const recommendation = await aiService.recommend(zoneId);
  const saved = await dataStore.createRecommendation(recommendation);
  res.json({ data: saved });
});

aiRoutes.post("/simulate", validateBody(simulateSchema), async (req, res) => {
  res.json({ data: await aiService.simulate(req.body) });
});

aiRoutes.post("/evaluate", validateBody(evaluateSchema), async (req, res) => {
  const evaluation = await aiService.evaluateInput({ ...req.body, zoneId: resolveZoneId(req.body) });
  sensorService.applyManualReading(evaluation.reading);
  const energy = await energyService.createSnapshot([evaluation.reading]);
  res.json({ data: { ...evaluation, energy: energy.status } });
});

aiRoutes.post("/schedule/optimize", validateBody(scheduleOptimizeSchema), async (req, res) => {
  const zoneId = resolveZoneId(req.body);
  const result = await aiService.adaptSchedulePolicy({
    zoneId,
    name: req.body.name ?? "Custom Schedule",
    startTime: req.body.startTime ?? "06:00",
    duration: req.body.duration ?? 8,
    targetTemp: req.body.targetTemp,
    targetHum: req.body.targetHum,
    mode: req.body.mode ?? "full_load",
    isActive: true,
  });
  await dataStore.updateZoneControls(zoneId, {
    targetTemp: req.body.targetTemp,
    targetHum: req.body.targetHum,
    fanSpeed: result.optimization.fanSpeed,
  });
  res.json({ data: result });
});

aiRoutes.post("/optimize", validateBody(optimizeSchema), async (req, res) => {
  const zoneId = resolveZoneId(req.body);
  const latest =
    req.body.currentState ??
    req.body.current_state ??
    (await dataStore.getLatestReadings()).find((reading) => reading.zoneId === zoneId);
  if (!latest) {
    return res.status(404).json({ error: "No reading available for zone" });
  }
  const target = req.body.target ?? {
    temperature: req.body.targetTemp,
    humidity: req.body.targetHum,
  };
  return res.json({ data: await aiService.optimizeHvac(zoneId, latest, target) });
});

aiRoutes.post("/recommendations/:id/apply", async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id must be a number" });
  }
  const recommendation = await dataStore.applyRecommendation(id);
  return recommendation ? res.json({ data: recommendation }) : res.status(404).json({ error: "Recommendation not found" });
});
