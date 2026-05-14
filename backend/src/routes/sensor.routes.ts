import { Router } from "express";
import { sensorService } from "../services/sensor.service";
import { parseDateQuery, parseLimitQuery } from "../middleware/validate";

export const sensorRoutes = Router();

sensorRoutes.get("/", async (_req, res) => {
  const readings = await sensorService.getLatestReadings();
  res.json({ data: readings });
});

sensorRoutes.get("/:zoneId/history", async (req, res) => {
  const zoneId = Number.parseInt(String(req.params.zoneId), 10);
  if (Number.isNaN(zoneId)) {
    return res.status(400).json({ error: "zoneId must be a number" });
  }

  const history = await sensorService.getHistory(zoneId, {
    from: parseDateQuery(req.query.from),
    to: parseDateQuery(req.query.to),
    limit: parseLimitQuery(req.query.limit),
  });

  return res.json({ data: history });
});
