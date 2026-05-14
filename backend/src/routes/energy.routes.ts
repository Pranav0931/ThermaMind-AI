import { Router } from "express";
import { energyService } from "../services/energy.service";
import { parseDateQuery, parseLimitQuery } from "../middleware/validate";

export const energyRoutes = Router();

energyRoutes.get("/stats", async (_req, res) => {
  res.json({ data: await energyService.getStats() });
});

energyRoutes.get("/history", async (req, res) => {
  const history = await energyService.getHistory({
    from: parseDateQuery(req.query.from),
    to: parseDateQuery(req.query.to),
    limit: parseLimitQuery(req.query.limit),
  });
  res.json({ data: history });
});
