import { Server, Socket } from "socket.io";
import { z } from "zod";
import { alertService } from "../services/alert.service";
import { aiService } from "../services/ai.service";
import { dataStore } from "../services/dataStore";
import { energyService } from "../services/energy.service";
import { sensorService } from "../services/sensor.service";
import { FanSpeedMode, SensorReading, SystemStatus } from "../types/domain";
import { logger } from "../utils/logger";

const fanSpeedPayloadSchema = z.object({
  zoneId: z.coerce.number().int().positive(),
  speed: z.enum(["low", "balanced", "industrial", "peak"]),
});

const targetPayloadSchema = z.object({
  zoneId: z.coerce.number().int().positive(),
  temperature: z.coerce.number().min(10).max(35).optional(),
  humidity: z.coerce.number().min(20).max(75).optional(),
});

const acknowledgePayloadSchema = z.object({
  alertId: z.coerce.number().int().positive(),
});

const recommendationPayloadSchema = z.object({
  recommendationId: z.coerce.number().int().positive(),
});

let sensorInterval: NodeJS.Timeout | undefined;
let statusInterval: NodeJS.Timeout | undefined;
let recommendationInterval: NodeJS.Timeout | undefined;

type Ack = ((response: unknown) => void) | undefined;

export function setupRealtime(io: Server) {
  io.on("connection", (socket) => {
    void handleConnection(io, socket);
  });

  startRealtimeLoops(io);
}

export function stopRealtimeLoops() {
  for (const interval of [sensorInterval, statusInterval, recommendationInterval]) {
    if (interval) {
      clearInterval(interval);
    }
  }
  sensorInterval = undefined;
  statusInterval = undefined;
  recommendationInterval = undefined;
}

function startRealtimeLoops(io: Server) {
  if (!sensorInterval) {
    sensorInterval = setInterval(() => {
      void publishSensorTick(io);
    }, 2000);
  }

  if (!statusInterval) {
    statusInterval = setInterval(() => {
      void publishEnergyTick(io);
    }, 5000);
  }

  if (!recommendationInterval) {
    recommendationInterval = setInterval(() => {
      void publishRecommendation(io);
    }, 5 * 60 * 1000);
  }
}

async function handleConnection(io: Server, socket: Socket) {
  logger.info({ socketId: socket.id }, "Socket connected");
  const [readings, status, alerts] = await Promise.all([
    sensorService.getLatestReadings(),
    dataStore.getLatestSystemStatus(),
    alertService.list(true),
  ]);

  socket.emit("sensor_update", { data: readings });
  if (readings[0]) {
    socket.emit("sensor_data", legacySensorPayload(readings[0], status));
  }
  socket.emit("system_status", status);
  socket.emit("energy_update", await energyService.getStats());
  socket.emit("alerts", { data: alerts });

  socket.on("set_fan_speed", (payload, ack?: Ack) => {
    void handleFanSpeed(io, payload, ack);
  });

  socket.on("update_target", (payload, ack?: Ack) => {
    void handleTargetUpdate(io, payload, ack);
  });

  socket.on("acknowledge_alert", (payload, ack?: Ack) => {
    void handleAlertAcknowledgement(io, payload, ack);
  });

  socket.on("apply_recommendation", (payload, ack?: Ack) => {
    void handleRecommendationApply(io, payload, ack);
  });

  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "Socket disconnected");
  });
}

async function publishSensorTick(io: Server) {
  try {
    const readings = await sensorService.ingestTick();
    const status = await dataStore.getLatestSystemStatus();
    io.emit("sensor_update", { data: readings });
    if (readings[0]) {
      io.emit("sensor_data", legacySensorPayload(readings[0], status));
    }

    const alerts = await alertService.evaluateReadings(readings);
    for (const alert of alerts) {
      io.emit("alert_triggered", alert);
    }
  } catch (error) {
    logger.error({ error }, "Failed to publish sensor tick");
  }
}

async function publishEnergyTick(io: Server) {
  try {
    const readings = await dataStore.getLatestReadings();
    const { status, energyLog } = await energyService.createSnapshot(readings);
    io.emit("system_status", status);
    io.emit("energy_update", energyLog);
  } catch (error) {
    logger.error({ error }, "Failed to publish energy tick");
  }
}

async function publishRecommendation(io: Server) {
  try {
    const zones = await dataStore.listZones();
    const zone = zones[0];
    if (!zone) {
      return;
    }
    const recommendation = await dataStore.createRecommendation(await aiService.recommend(zone.id));
    io.emit("ai_recommendation", recommendation);
  } catch (error) {
    logger.error({ error }, "Failed to publish AI recommendation");
  }
}

async function handleFanSpeed(io: Server, payload: unknown, ack?: Ack) {
  const parsed = fanSpeedPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return ack?.({ ok: false, error: parsed.error.issues });
  }

  const zone = await sensorService.setFanSpeed(parsed.data.zoneId, parsed.data.speed as FanSpeedMode);
  io.emit("zone_controls_updated", zone);
  return ack?.({ ok: true, data: zone });
}

async function handleTargetUpdate(io: Server, payload: unknown, ack?: Ack) {
  const parsed = targetPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return ack?.({ ok: false, error: parsed.error.issues });
  }

  const zone = await sensorService.updateTarget(parsed.data.zoneId, parsed.data.temperature, parsed.data.humidity);
  io.emit("zone_controls_updated", zone);
  return ack?.({ ok: true, data: zone });
}

async function handleAlertAcknowledgement(io: Server, payload: unknown, ack?: Ack) {
  const parsed = acknowledgePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return ack?.({ ok: false, error: parsed.error.issues });
  }

  const alert = await alertService.acknowledge(parsed.data.alertId);
  io.emit("alert_acknowledged", alert);
  return ack?.({ ok: Boolean(alert), data: alert });
}

async function handleRecommendationApply(io: Server, payload: unknown, ack?: Ack) {
  const parsed = recommendationPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return ack?.({ ok: false, error: parsed.error.issues });
  }

  const recommendation = await dataStore.applyRecommendation(parsed.data.recommendationId);
  io.emit("recommendation_applied", recommendation);
  return ack?.({ ok: Boolean(recommendation), data: recommendation });
}

function legacySensorPayload(reading: SensorReading, status: SystemStatus) {
  return {
    zoneId: reading.zoneId,
    zone: reading.zoneName,
    temperature: reading.temperature,
    humidity: reading.humidity,
    co2: reading.co2,
    occupancy: reading.occupancy,
    airflow: reading.airflow,
    efficiency: Math.round(status.efficiency),
    load: status.load,
    timestamp: reading.timestamp.toISOString(),
  };
}
