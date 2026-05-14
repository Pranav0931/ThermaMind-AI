import { getPrismaClient } from "../config/database";
import { logger } from "../utils/logger";
import {
  AIRecommendation,
  Alert,
  EnergyLog,
  Schedule,
  ScheduleInput,
  SensorReading,
  SensorReadingInput,
  SystemStatus,
  Zone,
} from "../types/domain";

const DEFAULT_ZONES: Zone[] = [
  { id: 1, name: "Storage Zone A", type: "storage", capacity: 36, targetTemp: 22, targetHum: 45, fanSpeed: 65 },
  { id: 2, name: "Packaging Section", type: "packaging", capacity: 54, targetTemp: 21.8, targetHum: 42, fanSpeed: 72 },
  { id: 3, name: "Cold Storage Unit", type: "cold_storage", capacity: 18, targetTemp: 20, targetHum: 40, fanSpeed: 58 },
];

const DEFAULT_SCHEDULES: ScheduleInput[] = [
  {
    zoneId: 1,
    name: "Active Operational Shift",
    startTime: "06:00",
    duration: 8,
    targetTemp: 22,
    targetHum: 45,
    mode: "full_load",
    isActive: true,
  },
  {
    zoneId: 1,
    name: "Standby Mode",
    startTime: "14:00",
    duration: 10,
    targetTemp: 23.5,
    targetHum: 48,
    mode: "standby",
    isActive: true,
  },
  {
    zoneId: 2,
    name: "Packaging Ramp-Up",
    startTime: "05:30",
    duration: 9,
    targetTemp: 21.8,
    targetHum: 42,
    mode: "full_load",
    isActive: true,
  },
  {
    zoneId: 3,
    name: "Cold Storage Eco Overnight",
    startTime: "22:00",
    duration: 8,
    targetTemp: 20.5,
    targetHum: 40,
    mode: "eco",
    isActive: true,
  },
];

interface MemoryState {
  nextSensorId: number;
  nextStatusId: number;
  nextAlertId: number;
  nextScheduleId: number;
  nextRecommendationId: number;
  nextEnergyLogId: number;
  zones: Zone[];
  sensorReadings: SensorReading[];
  systemStatuses: SystemStatus[];
  alerts: Alert[];
  schedules: Schedule[];
  recommendations: AIRecommendation[];
  energyLogs: EnergyLog[];
}

function createMemoryState(): MemoryState {
  const now = new Date();
  const zones = DEFAULT_ZONES.map((zone) => ({ ...zone }));

  return {
    nextSensorId: 4,
    nextStatusId: 2,
    nextAlertId: 1,
    nextScheduleId: DEFAULT_SCHEDULES.length + 1,
    nextRecommendationId: 1,
    nextEnergyLogId: 2,
    zones,
    sensorReadings: [
      {
        id: 1,
        zoneId: 1,
        zoneName: "Storage Zone A",
        temperature: 22.4,
        humidity: 48,
        co2: 410,
        occupancy: 12,
        airflow: 65,
        timestamp: now,
      },
      {
        id: 2,
        zoneId: 2,
        zoneName: "Packaging Section",
        temperature: 21.8,
        humidity: 43,
        co2: 395,
        occupancy: 18,
        airflow: 72,
        timestamp: now,
      },
      {
        id: 3,
        zoneId: 3,
        zoneName: "Cold Storage Unit",
        temperature: 20.5,
        humidity: 39,
        co2: 380,
        occupancy: 4,
        airflow: 58,
        timestamp: now,
      },
    ],
    systemStatuses: [
      {
        id: 1,
        efficiency: 98,
        load: 14.2,
        coolingScore: 98.2,
        carbonSaved: 2.4,
        fanSpeed: 65,
        compressorEff: 94,
        timestamp: now,
      },
    ],
    alerts: [],
    schedules: DEFAULT_SCHEDULES.map((schedule, index) => ({
      ...schedule,
      id: index + 1,
      zoneName: zones.find((zone) => zone.id === schedule.zoneId)?.name ?? "Unknown Zone",
      isActive: schedule.isActive ?? true,
      createdAt: now,
    })),
    recommendations: [],
    energyLogs: [
      {
        id: 1,
        hvacLoad: 14.2,
        optimizedLoad: 10.8,
        savingsPercent: 24,
        carbonReduced: 4.6,
        timestamp: now,
      },
    ],
  };
}

function mapZone(record: any): Zone {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    capacity: record.capacity,
    targetTemp: record.targetTemp,
    targetHum: record.targetHum,
    fanSpeed: record.fanSpeed,
  };
}

function mapSensor(record: any): SensorReading {
  return {
    id: record.id,
    zoneId: record.zoneId,
    zoneName: record.zone?.name ?? record.zoneName ?? `Zone ${record.zoneId}`,
    temperature: record.temperature,
    humidity: record.humidity,
    co2: record.co2,
    occupancy: record.occupancy,
    airflow: record.airflow,
    timestamp: record.timestamp,
  };
}

function mapAlert(record: any): Alert {
  return {
    id: record.id,
    zoneId: record.zoneId,
    zoneName: record.zone?.name ?? record.zoneName ?? `Zone ${record.zoneId}`,
    type: record.type,
    severity: record.severity,
    message: record.message,
    isAcked: record.isAcked,
    createdAt: record.createdAt,
    acknowledgedAt: record.acknowledgedAt,
  };
}

function mapSchedule(record: any): Schedule {
  return {
    id: record.id,
    zoneId: record.zoneId,
    zoneName: record.zone?.name ?? record.zoneName ?? `Zone ${record.zoneId}`,
    name: record.name,
    startTime: record.startTime,
    duration: record.duration,
    targetTemp: record.targetTemp,
    targetHum: record.targetHum,
    mode: record.mode,
    isActive: record.isActive,
    createdAt: record.createdAt,
  };
}

export class DataStore {
  private readonly prisma = getPrismaClient() as any;
  private databaseReady = false;
  private readonly memory = createMemoryState();

  async initialize() {
    if (!this.prisma) {
      logger.info("DATABASE_URL not configured; using in-memory demo datastore");
      return;
    }

    try {
      await this.prisma.$connect();
      this.databaseReady = true;
      await this.seedDatabase();
      logger.info("Connected to PostgreSQL through Prisma");
    } catch (error) {
      this.databaseReady = false;
      logger.warn({ error }, "Database unavailable; using in-memory demo datastore");
    }
  }

  isDatabaseReady() {
    return this.databaseReady;
  }

  private async run<T>(label: string, databaseOperation: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
    if (this.databaseReady) {
      try {
        return await databaseOperation();
      } catch (error) {
        this.databaseReady = false;
        logger.warn({ error, label }, "Database operation failed; falling back to in-memory datastore");
      }
    }

    return fallback();
  }

  private async seedDatabase() {
    for (const zone of DEFAULT_ZONES) {
      await this.prisma.zone.upsert({
        where: { name: zone.name },
        update: {
          type: zone.type,
          capacity: zone.capacity,
          targetTemp: zone.targetTemp,
          targetHum: zone.targetHum,
          fanSpeed: zone.fanSpeed,
        },
        create: zone,
      });
    }

    const scheduleCount = await this.prisma.schedule.count();
    if (scheduleCount === 0) {
      await this.prisma.schedule.createMany({ data: DEFAULT_SCHEDULES });
    }
  }

  async listZones(): Promise<Zone[]> {
    return this.run(
      "listZones",
      async () => (await this.prisma.zone.findMany({ orderBy: { id: "asc" } })).map(mapZone),
      () => this.memory.zones.map((zone) => ({ ...zone })),
    );
  }

  async getZone(zoneId: number): Promise<Zone | null> {
    return this.run(
      "getZone",
      async () => {
        const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
        return zone ? mapZone(zone) : null;
      },
      () => this.memory.zones.find((zone) => zone.id === zoneId) ?? null,
    );
  }

  async updateZoneControls(zoneId: number, updates: Partial<Pick<Zone, "targetTemp" | "targetHum" | "fanSpeed">>) {
    return this.run(
      "updateZoneControls",
      async () => mapZone(await this.prisma.zone.update({ where: { id: zoneId }, data: updates })),
      () => {
        const zone = this.memory.zones.find((candidate) => candidate.id === zoneId);
        if (!zone) {
          throw new Error(`Zone ${zoneId} not found`);
        }
        Object.assign(zone, updates);
        return { ...zone };
      },
    );
  }

  async createSensorReadings(inputs: SensorReadingInput[]): Promise<SensorReading[]> {
    return this.run(
      "createSensorReadings",
      async () => {
        const created = [];
        for (const input of inputs) {
          created.push(
            await this.prisma.sensorData.create({
              data: input,
              include: { zone: true },
            }),
          );
        }
        return created.map(mapSensor);
      },
      () => {
        const readings = inputs.map((input) => {
          const zone = this.memory.zones.find((candidate) => candidate.id === input.zoneId);
          const reading: SensorReading = {
            ...input,
            id: this.memory.nextSensorId++,
            zoneName: zone?.name ?? `Zone ${input.zoneId}`,
            timestamp: input.timestamp ?? new Date(),
          };
          this.memory.sensorReadings.push(reading);
          return reading;
        });

        this.memory.sensorReadings = this.memory.sensorReadings.slice(-5000);
        return readings;
      },
    );
  }

  async getLatestReadings(): Promise<SensorReading[]> {
    return this.run(
      "getLatestReadings",
      async () => {
        const zones = await this.prisma.zone.findMany({ orderBy: { id: "asc" } });
        const readings = [];
        for (const zone of zones) {
          const reading = await this.prisma.sensorData.findFirst({
            where: { zoneId: zone.id },
            orderBy: { timestamp: "desc" },
            include: { zone: true },
          });
          if (reading) {
            readings.push(mapSensor(reading));
          }
        }
        return readings;
      },
      () => {
        return this.memory.zones
          .map((zone) =>
            [...this.memory.sensorReadings]
              .reverse()
              .find((reading) => reading.zoneId === zone.id),
          )
          .filter((reading): reading is SensorReading => Boolean(reading))
          .map((reading) => ({ ...reading }));
      },
    );
  }

  async getSensorHistory(zoneId: number, from?: Date, to?: Date, limit = 250): Promise<SensorReading[]> {
    return this.run(
      "getSensorHistory",
      async () =>
        (
          await this.prisma.sensorData.findMany({
            where: {
              zoneId,
              timestamp: {
                gte: from,
                lte: to,
              },
            },
            orderBy: { timestamp: "asc" },
            take: limit,
            include: { zone: true },
          })
        ).map(mapSensor),
      () =>
        this.memory.sensorReadings
          .filter((reading) => reading.zoneId === zoneId)
          .filter((reading) => (from ? reading.timestamp >= from : true))
          .filter((reading) => (to ? reading.timestamp <= to : true))
          .slice(-limit)
          .map((reading) => ({ ...reading })),
    );
  }

  async createSystemStatus(input: Omit<SystemStatus, "id">): Promise<SystemStatus> {
    return this.run(
      "createSystemStatus",
      async () => await this.prisma.systemStatus.create({ data: input }),
      () => {
        const status = { ...input, id: this.memory.nextStatusId++ };
        this.memory.systemStatuses.push(status);
        this.memory.systemStatuses = this.memory.systemStatuses.slice(-1000);
        return status;
      },
    );
  }

  async getLatestSystemStatus(): Promise<SystemStatus> {
    return this.run(
      "getLatestSystemStatus",
      async () =>
        (await this.prisma.systemStatus.findFirst({ orderBy: { timestamp: "desc" } })) ??
        (await this.prisma.systemStatus.create({
          data: {
            efficiency: 98,
            load: 14.2,
            coolingScore: 98.2,
            carbonSaved: 2.4,
            fanSpeed: 65,
            compressorEff: 94,
            timestamp: new Date(),
          },
        })),
      () => ({ ...this.memory.systemStatuses[this.memory.systemStatuses.length - 1] }),
    );
  }

  async createEnergyLog(input: Omit<EnergyLog, "id">): Promise<EnergyLog> {
    return this.run(
      "createEnergyLog",
      async () => await this.prisma.energyLog.create({ data: input }),
      () => {
        const log = { ...input, id: this.memory.nextEnergyLogId++ };
        this.memory.energyLogs.push(log);
        this.memory.energyLogs = this.memory.energyLogs.slice(-3000);
        return log;
      },
    );
  }

  async getEnergyHistory(from?: Date, to?: Date, limit = 250): Promise<EnergyLog[]> {
    return this.run(
      "getEnergyHistory",
      async () =>
        await this.prisma.energyLog.findMany({
          where: {
            timestamp: {
              gte: from,
              lte: to,
            },
          },
          orderBy: { timestamp: "asc" },
          take: limit,
        }),
      () =>
        this.memory.energyLogs
          .filter((log) => (from ? log.timestamp >= from : true))
          .filter((log) => (to ? log.timestamp <= to : true))
          .slice(-limit)
          .map((log) => ({ ...log })),
    );
  }

  async listSchedules(): Promise<Schedule[]> {
    return this.run(
      "listSchedules",
      async () =>
        (
          await this.prisma.schedule.findMany({
            include: { zone: true },
            orderBy: [{ startTime: "asc" }, { id: "asc" }],
          })
        ).map(mapSchedule),
      () => this.memory.schedules.map((schedule) => ({ ...schedule })),
    );
  }

  async createSchedule(input: ScheduleInput): Promise<Schedule> {
    return this.run(
      "createSchedule",
      async () => mapSchedule(await this.prisma.schedule.create({ data: input, include: { zone: true } })),
      () => {
        const zone = this.memory.zones.find((candidate) => candidate.id === input.zoneId);
        if (!zone) {
          throw new Error(`Zone ${input.zoneId} not found`);
        }
        const schedule: Schedule = {
          ...input,
          id: this.memory.nextScheduleId++,
          zoneName: zone.name,
          isActive: input.isActive ?? true,
          createdAt: new Date(),
        };
        this.memory.schedules.push(schedule);
        return { ...schedule };
      },
    );
  }

  async updateSchedule(id: number, input: Partial<ScheduleInput>): Promise<Schedule | null> {
    return this.run(
      "updateSchedule",
      async () => mapSchedule(await this.prisma.schedule.update({ where: { id }, data: input, include: { zone: true } })),
      () => {
        const schedule = this.memory.schedules.find((candidate) => candidate.id === id);
        if (!schedule) {
          return null;
        }
        Object.assign(schedule, input);
        if (input.zoneId) {
          schedule.zoneName = this.memory.zones.find((zone) => zone.id === input.zoneId)?.name ?? schedule.zoneName;
        }
        return { ...schedule };
      },
    );
  }

  async deleteSchedule(id: number): Promise<boolean> {
    return this.run(
      "deleteSchedule",
      async () => {
        await this.prisma.schedule.delete({ where: { id } });
        return true;
      },
      () => {
        const before = this.memory.schedules.length;
        this.memory.schedules = this.memory.schedules.filter((schedule) => schedule.id !== id);
        return this.memory.schedules.length !== before;
      },
    );
  }

  async listAlerts(activeOnly = true): Promise<Alert[]> {
    return this.run(
      "listAlerts",
      async () =>
        (
          await this.prisma.alert.findMany({
            where: activeOnly ? { isAcked: false } : undefined,
            include: { zone: true },
            orderBy: { createdAt: "desc" },
            take: 100,
          })
        ).map(mapAlert),
      () =>
        this.memory.alerts
          .filter((alert) => (activeOnly ? !alert.isAcked : true))
          .slice(-100)
          .reverse()
          .map((alert) => ({ ...alert })),
    );
  }

  async createAlert(input: Omit<Alert, "id" | "zoneName" | "isAcked" | "createdAt" | "acknowledgedAt">): Promise<Alert> {
    return this.run(
      "createAlert",
      async () => mapAlert(await this.prisma.alert.create({ data: input, include: { zone: true } })),
      () => {
        const zone = this.memory.zones.find((candidate) => candidate.id === input.zoneId);
        const alert: Alert = {
          ...input,
          id: this.memory.nextAlertId++,
          zoneName: zone?.name ?? `Zone ${input.zoneId}`,
          isAcked: false,
          createdAt: new Date(),
          acknowledgedAt: null,
        };
        this.memory.alerts.push(alert);
        this.memory.alerts = this.memory.alerts.slice(-500);
        return { ...alert };
      },
    );
  }

  async acknowledgeAlert(id: number): Promise<Alert | null> {
    return this.run(
      "acknowledgeAlert",
      async () =>
        mapAlert(
          await this.prisma.alert.update({
            where: { id },
            data: { isAcked: true, acknowledgedAt: new Date() },
            include: { zone: true },
          }),
        ),
      () => {
        const alert = this.memory.alerts.find((candidate) => candidate.id === id);
        if (!alert) {
          return null;
        }
        alert.isAcked = true;
        alert.acknowledgedAt = new Date();
        return { ...alert };
      },
    );
  }

  async createRecommendation(input: Omit<AIRecommendation, "id" | "createdAt" | "applied">): Promise<AIRecommendation> {
    return this.run(
      "createRecommendation",
      async () => await this.prisma.aIRecommendation.create({ data: input }),
      () => {
        const recommendation: AIRecommendation = {
          ...input,
          id: this.memory.nextRecommendationId++,
          applied: false,
          createdAt: new Date(),
        };
        this.memory.recommendations.push(recommendation);
        this.memory.recommendations = this.memory.recommendations.slice(-500);
        return { ...recommendation };
      },
    );
  }

  async listRecommendations(limit = 25): Promise<AIRecommendation[]> {
    return this.run(
      "listRecommendations",
      async () => await this.prisma.aIRecommendation.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
      () => this.memory.recommendations.slice(-limit).reverse().map((recommendation) => ({ ...recommendation })),
    );
  }

  async applyRecommendation(id: number): Promise<AIRecommendation | null> {
    return this.run(
      "applyRecommendation",
      async () => await this.prisma.aIRecommendation.update({ where: { id }, data: { applied: true } }),
      () => {
        const recommendation = this.memory.recommendations.find((candidate) => candidate.id === id);
        if (!recommendation) {
          return null;
        }
        recommendation.applied = true;
        return { ...recommendation };
      },
    );
  }

  async pruneOlderThan(cutoffs: { sensor: Date; energy: Date; alerts: Date; recommendations: Date }) {
    await this.run(
      "pruneOlderThan",
      async () => {
        await Promise.all([
          this.prisma.sensorData.deleteMany({ where: { timestamp: { lt: cutoffs.sensor } } }),
          this.prisma.energyLog.deleteMany({ where: { timestamp: { lt: cutoffs.energy } } }),
          this.prisma.alert.deleteMany({ where: { createdAt: { lt: cutoffs.alerts }, isAcked: true } }),
          this.prisma.aIRecommendation.deleteMany({ where: { createdAt: { lt: cutoffs.recommendations } } }),
        ]);
      },
      () => {
        this.memory.sensorReadings = this.memory.sensorReadings.filter((reading) => reading.timestamp >= cutoffs.sensor);
        this.memory.energyLogs = this.memory.energyLogs.filter((log) => log.timestamp >= cutoffs.energy);
        this.memory.alerts = this.memory.alerts.filter((alert) => !alert.isAcked || alert.createdAt >= cutoffs.alerts);
        this.memory.recommendations = this.memory.recommendations.filter(
          (recommendation) => recommendation.createdAt >= cutoffs.recommendations,
        );
      },
    );
  }
}

export const dataStore = new DataStore();
