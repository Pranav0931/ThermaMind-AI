import { Router } from "express";
import { systemService } from "../services/system.service";

export const systemRoutes = Router();

systemRoutes.get("/status", async (_req, res) => {
  res.json({ data: await systemService.status() });
});
