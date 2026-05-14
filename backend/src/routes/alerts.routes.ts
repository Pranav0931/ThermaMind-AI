import { Router } from "express";
import { alertService } from "../services/alert.service";

export const alertsRoutes = Router();

alertsRoutes.get("/", async (req, res) => {
  const activeOnly = req.query.active === "false" ? false : true;
  res.json({ data: await alertService.list(activeOnly) });
});

alertsRoutes.post("/:id/acknowledge", async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id must be a number" });
  }

  const alert = await alertService.acknowledge(id);
  return alert ? res.json({ data: alert }) : res.status(404).json({ error: "Alert not found" });
});
