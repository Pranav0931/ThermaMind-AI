import { dataStore } from "./dataStore";
import { sensorSimulator } from "./sensorSimulator";
import { FanSpeedMode } from "../types/domain";

class SensorService {
  async initialize() {
    await sensorSimulator.initialize();
  }

  async ingestTick() {
    return sensorSimulator.tick();
  }

  async getLatestReadings() {
    const readings = await dataStore.getLatestReadings();
    if (readings.length > 0) {
      return readings;
    }
    return sensorSimulator.tick();
  }

  async getHistory(zoneId: number, options: { from?: Date; to?: Date; limit?: number }) {
    return dataStore.getSensorHistory(zoneId, options.from, options.to, options.limit ?? 250);
  }

  async setFanSpeed(zoneId: number, speed: FanSpeedMode) {
    return sensorSimulator.setFanSpeed(zoneId, speed);
  }

  async updateTarget(zoneId: number, temperature?: number, humidity?: number) {
    return sensorSimulator.updateTarget(zoneId, temperature, humidity);
  }
}

export const sensorService = new SensorService();
