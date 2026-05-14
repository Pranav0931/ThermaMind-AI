import { dataStore } from "./dataStore";
import { aiService } from "./ai.service";
import { Alert, AlertSeverity, SensorReading, Zone } from "../types/domain";

const ALERT_COOLDOWN_MS = 8 * 60 * 1000;

class AlertService {
  private readonly recentAlerts = new Map<string, number>();

  async evaluateReadings(readings: SensorReading[]): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const zones = await dataStore.listZones();

    for (const reading of readings) {
      const zone = zones.find((candidate) => candidate.id === reading.zoneId);
      if (!zone) {
        continue;
      }

      const thresholdAlert = await this.evaluateThresholds(reading, zone);
      if (thresholdAlert) {
        alerts.push(thresholdAlert);
      }

      const history = await dataStore.getSensorHistory(reading.zoneId, undefined, undefined, 15);
      const anomaly = await aiService.detectAnomaly(reading.zoneId, history);
      if (anomaly.isAnomaly) {
        const alert = await this.createOnce(reading.zoneId, anomaly.type, anomaly.severity, anomaly.message);
        if (alert) {
          alerts.push(alert);
        }
      }

      const occupancyAlert = await this.evaluateOccupancyForecast(reading, zone);
      if (occupancyAlert) {
        alerts.push(occupancyAlert);
      }
    }

    return alerts;
  }

  async list(activeOnly = true) {
    return dataStore.listAlerts(activeOnly);
  }

  async acknowledge(id: number) {
    return dataStore.acknowledgeAlert(id);
  }

  private async evaluateThresholds(reading: SensorReading, zone: Zone): Promise<Alert | null> {
    if (reading.temperature > 28 || reading.temperature < 15) {
      return this.createOnce(
        reading.zoneId,
        "temp_critical",
        "critical",
        `${reading.zoneName} temperature is ${reading.temperature}C, outside the critical operating band.`,
      );
    }

    if (reading.temperature > 25 || reading.temperature < 18) {
      return this.createOnce(
        reading.zoneId,
        "temp_spike",
        "warning",
        `${reading.zoneName} temperature drift detected at ${reading.temperature}C.`,
      );
    }

    if (reading.humidity > 60 || reading.humidity < 30) {
      return this.createOnce(
        reading.zoneId,
        "humidity_rise",
        "warning",
        `${reading.zoneName} humidity is ${reading.humidity}%. Adjusting airflow is recommended.`,
      );
    }

    if (reading.co2 > 1000) {
      return this.createOnce(reading.zoneId, "co2_critical", "critical", `${reading.zoneName} CO2 is critically high at ${reading.co2} ppm.`);
    }

    if (reading.co2 > 800) {
      return this.createOnce(reading.zoneId, "co2_high", "warning", `${reading.zoneName} CO2 rose to ${reading.co2} ppm.`);
    }

    if (reading.occupancy > zone.capacity * 0.9) {
      return this.createOnce(
        reading.zoneId,
        "occupancy_surge",
        "warning",
        `${reading.zoneName} occupancy is near capacity (${reading.occupancy}/${zone.capacity}).`,
      );
    }

    return null;
  }

  private async evaluateOccupancyForecast(reading: SensorReading, zone: Zone): Promise<Alert | null> {
    const forecast = await aiService.predictOccupancy(reading.zoneId, 60);
    const peak = Math.max(...forecast.predictions);
    const surgeThreshold = Math.max(reading.occupancy + Math.ceil(zone.capacity * 0.2), Math.ceil(zone.capacity * 0.85));

    if (peak < surgeThreshold) {
      return null;
    }

    return this.createOnce(
      reading.zoneId,
      "occupancy_forecast_surge",
      "info",
      `${reading.zoneName} occupancy is forecast to reach ${peak}/${zone.capacity} within the next hour. Pre-cooling can reduce peak demand.`,
    );
  }

  private async createOnce(zoneId: number, type: string, severity: AlertSeverity, message: string) {
    const key = `${zoneId}:${type}`;
    const now = Date.now();
    const lastCreated = this.recentAlerts.get(key) ?? 0;
    if (now - lastCreated < ALERT_COOLDOWN_MS) {
      return null;
    }

    const activeAlerts = await dataStore.listAlerts(true);
    const duplicate = activeAlerts.some((alert) => alert.zoneId === zoneId && alert.type === type);
    if (duplicate) {
      this.recentAlerts.set(key, now);
      return null;
    }

    const alert = await dataStore.createAlert({ zoneId, type, severity, message });
    this.recentAlerts.set(key, now);
    return alert;
  }
}

export const alertService = new AlertService();
