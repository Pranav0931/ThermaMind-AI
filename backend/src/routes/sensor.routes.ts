import { Router } from "express";
import { z } from "zod";
import { sensorService } from "../services/sensor.service";
import { parseDateQuery, parseLimitQuery, validateParams } from "../middleware/validate";

export const sensorRoutes = Router();

const zoneParamsSchema = z.object({
  zoneId: z.coerce.number().int().positive(),
});

sensorRoutes.get("/", async (_req, res) => {
  const readings = await sensorService.getLatestReadings();
  res.json({ data: readings });
});

sensorRoutes.get("/:zoneId/history", validateParams(zoneParamsSchema), async (req, res) => {
  const zoneId = Number(req.params.zoneId);
  const history = await sensorService.getHistory(zoneId, {
    from: parseDateQuery(req.query.from),
    to: parseDateQuery(req.query.to),
    limit: parseLimitQuery(req.query.limit),
  });

  return res.json({ data: history });
});

sensorRoutes.get("/:zoneId", validateParams(zoneParamsSchema), async (req, res) => {
  const reading = await sensorService.getLatestReading(Number(req.params.zoneId));
  return reading ? res.json({ data: reading }) : res.status(404).json({ error: "Sensor reading not found" });
});
