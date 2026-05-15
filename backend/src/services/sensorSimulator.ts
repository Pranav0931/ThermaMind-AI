import { dataStore } from "./dataStore";
import { FanSpeedMode, SensorReading, SensorReadingInput, Zone } from "../types/domain";
import { clamp, randomBetween, round } from "../utils/numbers";

interface ZoneSimulationState {
  temperature: number;
  humidity: number;
  co2: number;
  occupancy: number;
  airflow: number;
  eventHeat: number;
  eventHumidity: number;
}

const FAN_SPEEDS: Record<FanSpeedMode, number> = {
  low: 42,
  balanced: 65,
  industrial: 82,
  peak: 96,
};

export class SensorSimulator {
  private readonly state = new Map<number, ZoneSimulationState>();

  async initialize() {
    const zones = await dataStore.listZones();
    for (const zone of zones) {
      this.ensureState(zone);
    }
  }

  async tick(): Promise<SensorReading[]> {
    const zones = await dataStore.listZones();
    const now = new Date();
    const readings = zones.map((zone) => this.nextReading(zone, now));
    return dataStore.createSensorReadings(readings);
  }

  applyManualReading(reading: SensorReading) {
    this.state.set(reading.zoneId, {
      temperature: reading.temperature,
      humidity: reading.humidity,
      co2: reading.co2,
      occupancy: reading.occupancy,
      airflow: reading.airflow,
      eventHeat: 0,
      eventHumidity: 0,
    });
  }

  async setFanSpeed(zoneId: number, mode: FanSpeedMode) {
    const fanSpeed = FAN_SPEEDS[mode];
    const zone = await dataStore.updateZoneControls(zoneId, { fanSpeed });
    const state = this.ensureState(zone);
    state.airflow = fanSpeed;
    return zone;
  }

  async updateTarget(zoneId: number, targetTemp?: number, targetHum?: number) {
    return dataStore.updateZoneControls(zoneId, {
      ...(targetTemp === undefined ? {} : { targetTemp }),
      ...(targetHum === undefined ? {} : { targetHum }),
    });
  }

  private nextReading(zone: Zone, timestamp: Date): SensorReadingInput {
    const state = this.ensureState(zone);
    const shiftLoad = this.shiftLoad(timestamp, zone);
    const targetOccupancy = Math.round(zone.capacity * shiftLoad);
    const occupancyNoise = randomBetween(-2, 2);

    state.occupancy = clamp(Math.round(state.occupancy + (targetOccupancy - state.occupancy) * 0.16 + occupancyNoise), 0, zone.capacity);

    if (Math.random() < 0.025) {
      state.eventHeat += randomBetween(0.7, 1.9);
      state.eventHumidity += randomBetween(1.5, 4.5);
    }

    state.eventHeat *= 0.82;
    state.eventHumidity *= 0.78;

    const externalTemp = this.externalTemperature(timestamp);
    const occupancyHeat = (state.occupancy / Math.max(zone.capacity, 1)) * 1.4;
    const airflowCooling = (state.airflow - 55) * 0.018;
    const seasonalPull = (externalTemp - 22) * 0.018;
    const targetPull = (zone.targetTemp - state.temperature) * 0.12;

    state.temperature += targetPull + seasonalPull + occupancyHeat * 0.05 - airflowCooling + state.eventHeat * 0.08 + randomBetween(-0.08, 0.08);
    state.humidity +=
      (zone.targetHum - state.humidity) * 0.08 +
      state.occupancy * 0.018 -
      (state.airflow - 55) * 0.035 +
      state.eventHumidity * 0.12 +
      randomBetween(-0.35, 0.35);
    state.co2 += (365 + state.occupancy * 9.5 - state.co2) * 0.18 - (state.airflow - 55) * 0.22 + randomBetween(-5, 5);
    state.airflow += (zone.fanSpeed - state.airflow) * 0.22 + randomBetween(-1.2, 1.2);

    state.temperature = clamp(state.temperature, 14, 31);
    state.humidity = clamp(state.humidity, 25, 68);
    state.co2 = clamp(state.co2, 340, 1150);
    state.airflow = clamp(state.airflow, 30, 100);

    return {
      zoneId: zone.id,
      temperature: round(state.temperature, 1),
      humidity: Math.round(state.humidity),
      co2: Math.round(state.co2),
      occupancy: state.occupancy,
      airflow: round(state.airflow, 1),
      timestamp,
    };
  }

  private ensureState(zone: Zone): ZoneSimulationState {
    const existing = this.state.get(zone.id);
    if (existing) {
      return existing;
    }

    const baseline = {
      temperature: zone.targetTemp + randomBetween(-0.4, 0.7),
      humidity: zone.targetHum + randomBetween(-3, 4),
      co2: randomBetween(380, 430),
      occupancy: Math.round(zone.capacity * 0.25),
      airflow: zone.fanSpeed,
      eventHeat: 0,
      eventHumidity: 0,
    };
    this.state.set(zone.id, baseline);
    return baseline;
  }

  private shiftLoad(date: Date, zone: Zone) {
    const hour = date.getHours() + date.getMinutes() / 60;
    const base =
      hour >= 6 && hour < 14
        ? 0.78
        : hour >= 14 && hour < 22
          ? 0.45
          : 0.14;
    const zoneModifier = zone.type === "packaging" ? 1.16 : zone.type === "cold_storage" ? 0.55 : 1;
    const wave = Math.sin((hour / 24) * Math.PI * 2) * 0.08;
    return clamp(base * zoneModifier + wave + randomBetween(-0.04, 0.04), 0.05, 0.96);
  }

  private externalTemperature(date: Date) {
    const hour = date.getHours() + date.getMinutes() / 60;
    return 25 + Math.sin(((hour - 7) / 24) * Math.PI * 2) * 6;
  }
}

export const sensorSimulator = new SensorSimulator();
