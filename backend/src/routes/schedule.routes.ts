import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate";
import { scheduleService } from "../services/schedule.service";

export const scheduleRoutes = Router();

const scheduleSchema = z.object({
  zoneId: z.coerce.number().int().positive(),
  name: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.coerce.number().int().min(1).max(24),
  targetTemp: z.coerce.number().min(10).max(35),
  targetHum: z.coerce.number().min(20).max(75),
  mode: z.enum(["full_load", "standby", "eco"]),
  isActive: z.boolean().optional(),
});

const scheduleUpdateSchema = scheduleSchema.partial();

scheduleRoutes.get("/", async (_req, res) => {
  res.json({ data: await scheduleService.list() });
});

scheduleRoutes.post("/", validateBody(scheduleSchema), async (req, res) => {
  res.status(201).json({ data: await scheduleService.create(req.body) });
});

scheduleRoutes.put("/:id", validateBody(scheduleUpdateSchema), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id must be a number" });
  }

  const schedule = await scheduleService.update(id, req.body);
  return schedule ? res.json({ data: schedule }) : res.status(404).json({ error: "Schedule not found" });
});

scheduleRoutes.delete("/:id", async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id must be a number" });
  }

  const deleted = await scheduleService.delete(id);
  return deleted ? res.status(204).send() : res.status(404).json({ error: "Schedule not found" });
});
