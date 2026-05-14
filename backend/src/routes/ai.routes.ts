import { Router } from "express";
import { z } from "zod";
import { aiService } from "../services/ai.service";
import { dataStore } from "../services/dataStore";
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

aiRoutes.post("/optimize", validateBody(zoneRequestSchema), async (req, res) => {
  const zoneId = resolveZoneId(req.body);
  const latest = (await dataStore.getLatestReadings()).find((reading) => reading.zoneId === zoneId);
  if (!latest) {
    return res.status(404).json({ error: "No reading available for zone" });
  }
  return res.json({ data: await aiService.optimizeHvac(zoneId, latest) });
});

aiRoutes.post("/recommendations/:id/apply", async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id must be a number" });
  }
  const recommendation = await dataStore.applyRecommendation(id);
  return recommendation ? res.json({ data: recommendation }) : res.status(404).json({ error: "Recommendation not found" });
});
