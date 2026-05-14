import { Router } from "express";
import { alertsRoutes } from "./alerts.routes";
import { aiRoutes } from "./ai.routes";
import { energyRoutes } from "./energy.routes";
import { scheduleRoutes } from "./schedule.routes";
import { sensorRoutes } from "./sensor.routes";
import { systemRoutes } from "./system.routes";

export const apiRoutes = Router();

apiRoutes.use("/sensors", sensorRoutes);
apiRoutes.use("/energy", energyRoutes);
apiRoutes.use("/schedules", scheduleRoutes);
apiRoutes.use("/alerts", alertsRoutes);
apiRoutes.use("/ai", aiRoutes);
apiRoutes.use("/system", systemRoutes);
