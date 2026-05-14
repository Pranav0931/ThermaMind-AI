import { dataStore } from "./dataStore";
import { SensorReading } from "../types/domain";
import { clamp, round } from "../utils/numbers";

class EnergyService {
  async createSnapshot(readings?: SensorReading[]) {
    const latest = readings && readings.length > 0 ? readings : await dataStore.getLatestReadings();
    const zones = await dataStore.listZones();

    const totalLoad = latest.reduce((sum, reading) => {
      const zone = zones.find((candidate) => candidate.id === reading.zoneId);
      const tempDeviation = Math.abs(reading.temperature - (zone?.targetTemp ?? 22));
      const humidityLoad = Math.max(0, reading.humidity - (zone?.targetHum ?? 45)) * 0.08;
      const occupancyLoad = reading.occupancy * 0.12;
      const airflowLoad = reading.airflow * 0.035;
      return sum + 2.4 + tempDeviation * 0.9 + humidityLoad + occupancyLoad + airflowLoad;
    }, 0);

    const avgFanSpeed = latest.length ? latest.reduce((sum, reading) => sum + reading.airflow, 0) / latest.length : 65;
    const avgTempDeviation =
      latest.length === 0
        ? 0
        : latest.reduce((sum, reading) => {
            const zone = zones.find((candidate) => candidate.id === reading.zoneId);
            return sum + Math.abs(reading.temperature - (zone?.targetTemp ?? 22));
          }, 0) / latest.length;
    const avgHumidityDeviation =
      latest.length === 0
        ? 0
        : latest.reduce((sum, reading) => {
            const zone = zones.find((candidate) => candidate.id === reading.zoneId);
            return sum + Math.abs(reading.humidity - (zone?.targetHum ?? 45));
          }, 0) / latest.length;

    const optimizedLoad = totalLoad * clamp(0.74 + avgTempDeviation * 0.018 + avgHumidityDeviation * 0.004, 0.72, 0.91);
    const savingsPercent = ((totalLoad - optimizedLoad) / Math.max(totalLoad, 1)) * 100;
    const efficiency = clamp(100 - avgTempDeviation * 4.2 - avgHumidityDeviation * 0.34, 72, 99.2);
    const compressorEff = clamp(96 - avgTempDeviation * 1.8 - Math.max(0, avgFanSpeed - 75) * 0.08, 78, 97);
    const carbonReduced = (totalLoad - optimizedLoad) * 0.72;

    const status = await dataStore.createSystemStatus({
      efficiency: round(efficiency, 1),
      load: round(optimizedLoad, 1),
      coolingScore: round(efficiency, 1),
      carbonSaved: round(carbonReduced, 2),
      fanSpeed: round(avgFanSpeed, 1),
      compressorEff: round(compressorEff, 1),
      timestamp: new Date(),
    });

    const energyLog = await dataStore.createEnergyLog({
      hvacLoad: round(totalLoad, 1),
      optimizedLoad: round(optimizedLoad, 1),
      savingsPercent: round(savingsPercent, 1),
      carbonReduced: round(carbonReduced, 2),
      timestamp: new Date(),
    });

    return { status, energyLog };
  }

  async getStats() {
    const status = await dataStore.getLatestSystemStatus();
    const history = await dataStore.getEnergyHistory(undefined, undefined, 288);
    const carbonReduced = history.reduce((sum, log) => sum + log.carbonReduced, 0);
    const avgSavings =
      history.length === 0 ? 0 : history.reduce((sum, log) => sum + log.savingsPercent, 0) / history.length;

    return {
      currentLoad: status.load,
      efficiency: status.efficiency,
      coolingScore: status.coolingScore,
      carbonSaved: round(carbonReduced, 2),
      fanSpeed: status.fanSpeed,
      compressorEff: status.compressorEff,
      averageSavingsPercent: round(avgSavings, 1),
      optimizationStatus: "active",
      timestamp: status.timestamp,
    };
  }

  async getHistory(options: { from?: Date; to?: Date; limit?: number }) {
    return dataStore.getEnergyHistory(options.from, options.to, options.limit ?? 250);
  }
}

export const energyService = new EnergyService();
