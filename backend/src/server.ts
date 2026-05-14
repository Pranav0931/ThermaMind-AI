import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { env } from "./config/env";
import { disconnectPrisma } from "./config/database";
import { startRetentionJob } from "./jobs/retention";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { apiRoutes } from "./routes";
import { dataStore } from "./services/dataStore";
import { energyService } from "./services/energy.service";
import { sensorService } from "./services/sensor.service";
import { setupRealtime, stopRealtimeLoops } from "./socket/realtime";
import { logger } from "./utils/logger";

const app = express();
const server = http.createServer(app);

const corsOrigin = env.CLIENT_ORIGIN === "*" ? "*" : env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim());

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "thermamind-backend",
    datastore: dataStore.isDatabaseReady() ? "postgresql" : "memory",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", apiRoutes);
app.use(notFound);
app.use(errorHandler);

async function bootstrap() {
  await dataStore.initialize();
  await sensorService.initialize();

  const initialReadings = await sensorService.getLatestReadings();
  await energyService.createSnapshot(initialReadings);

  setupRealtime(io);
  const retentionJob = startRetentionJob();

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, datastore: dataStore.isDatabaseReady() ? "postgresql" : "memory" }, "ThermaMind backend running");
  });

  async function shutdown(signal: string) {
    logger.info({ signal }, "Shutting down backend");
    retentionJob.stop();
    stopRealtimeLoops();
    io.close();
    server.close(async () => {
      await disconnectPrisma();
      process.exit(0);
    });
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void bootstrap().catch((error) => {
  logger.fatal({ error }, "Backend failed to start");
  process.exit(1);
});
