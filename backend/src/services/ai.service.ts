import axios, { AxiosInstance } from "axios";
import { env } from "../config/env";
import { dataStore } from "./dataStore";
import {
  AnomalyResult,
  DemandPrediction,
  HvacOptimization,
  OccupancyPrediction,
  ScheduleInput,
  SensorReading,
} from "../types/domain";
import { clamp, round } from "../utils/numbers";
import { logger } from "../utils/logger";

class AIService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.AI_SERVICE_URL,
      timeout: 30000,
    });
  }

  async predictOccupancy(zoneId: number, horizonMinutes = 60): Promise<OccupancyPrediction> {
    try {
      const response = await this.client.post("/predict/occupancy", { zone_id: zoneId, horizon_minutes: horizonMinutes });
      return {
        predictions: response.data.predictions,
        confidence: response.data.confidence,
      };
    } catch (error) {
      logger.debug({ error }, "Using local occupancy forecast fallback");
      const history = await dataStore.getSensorHistory(zoneId, undefined, undefined, 24);
      const last = history[history.length - 1];
      const base = last?.occupancy ?? 12;
      const intervals = Math.max(1, Math.ceil(horizonMinutes / 15));
      const hour = new Date().getHours();
      const direction = hour >= 5 && hour < 12 ? 1 : hour >= 12 && hour < 17 ? 0.25 : -0.4;
      return {
        predictions: Array.from({ length: intervals }, (_, index) => Math.max(0, Math.round(base + direction * (index + 1) * 3))),
        confidence: 0.88,
      };
    }
  }

  async predictDemand(zoneId: number, current?: Partial<SensorReading>): Promise<DemandPrediction> {
    const reading = current ?? (await dataStore.getSensorHistory(zoneId, undefined, undefined, 1))[0];
    try {
      const response = await this.client.post("/predict/demand", {
        zone_id: zoneId,
        current_conditions: reading,
      });
      return {
        predictedLoadKw: response.data.predicted_load_kw,
        optimalLoadKw: response.data.optimal_load_kw,
        savings: response.data.savings,
      };
    } catch (error) {
      logger.debug({ error }, "Using local demand forecast fallback");
      const occupancyFactor = reading?.occupancy !== undefined ? reading.occupancy * 0.16 : 2;
      const tempFactor = reading?.temperature !== undefined ? Math.abs(reading.temperature - 22) * 1.1 : 1;
      const humidityFactor = reading?.humidity !== undefined ? Math.max(0, reading.humidity - 45) * 0.08 : 0;
      const predictedLoadKw = round(8.5 + occupancyFactor + tempFactor + humidityFactor, 1);
      const optimalLoadKw = round(predictedLoadKw * 0.76, 1);
      return {
        predictedLoadKw,
        optimalLoadKw,
        savings: round(((predictedLoadKw - optimalLoadKw) / predictedLoadKw) * 100, 1),
      };
    }
  }

  async detectAnomaly(zoneId: number, readings: SensorReading[]): Promise<AnomalyResult> {
    try {
      const response = await this.client.post("/detect/anomaly", {
        zone_id: zoneId,
        readings,
      });
      return {
        isAnomaly: response.data.is_anomaly,
        score: response.data.score,
        type: response.data.type,
        severity: response.data.score > 0.9 ? "critical" : "warning",
        message: response.data.message,
      };
    } catch (error) {
      logger.debug({ error }, "Using local anomaly fallback");
      const latest = readings[readings.length - 1];
      if (!latest) {
        return { isAnomaly: false, score: 0, type: "none", severity: "info", message: "No readings available." };
      }

      const score = clamp(
        Math.max(
          Math.abs(latest.temperature - 22) / 8,
          Math.max(0, latest.humidity - 58) / 18,
          Math.max(0, latest.co2 - 760) / 420,
          Math.max(0, latest.airflow < 38 ? 0.8 : 0),
        ),
        0,
        1,
      );

      const type =
        latest.co2 > 800
          ? "co2_high"
          : latest.humidity > 60
            ? "humidity_rise"
            : latest.temperature > 25
              ? "temp_spike"
              : "airflow_drop";

      return {
        isAnomaly: score > 0.7,
        score: round(score, 2),
        type,
        severity: score > 0.9 ? "critical" : "warning",
        message: `${type.replace("_", " ")} pattern detected in zone ${zoneId}.`,
      };
    }
  }

  async optimizeHvac(
    zoneId: number,
    reading: Partial<SensorReading>,
    target?: { temperature?: number; humidity?: number },
  ): Promise<HvacOptimization> {
    const zone = await dataStore.getZone(zoneId);
    const targetTemp = target?.temperature ?? zone?.targetTemp ?? 22;
    const targetHum = target?.humidity ?? zone?.targetHum ?? 45;
    try {
      const response = await this.client.post("/optimize/hvac", {
        zone_id: zoneId,
        current_state: reading,
        target: {
          temperature: targetTemp,
          humidity: targetHum,
        },
      });
      return {
        action: response.data.action,
        newSetpoint: response.data.new_setpoint,
        fanSpeed: response.data.fan_speed,
        predictedSavings: response.data.predicted_savings,
        efficiencyScore: response.data.efficiency_score,
      };
    } catch (error) {
      logger.debug({ error }, "Using local HVAC optimization fallback");
      const temperature = reading.temperature ?? targetTemp;
      const humidity = reading.humidity ?? targetHum;
      const tooWarm = temperature - targetTemp;
      const tooHumid = humidity - targetHum;
      const fanSpeed = clamp((zone?.fanSpeed ?? 65) + tooHumid * 0.8 + tooWarm * 2.5, 40, 95);
      const action = tooWarm > 0.8 ? "increase_cooling" : tooWarm < -0.8 ? "decrease_cooling" : "maintain";

      return {
        action,
        newSetpoint: round(clamp(targetTemp - Math.max(0, tooWarm) * 0.25, 18, 25), 1),
        fanSpeed: round(fanSpeed, 1),
        predictedSavings: round(clamp(18 - Math.abs(tooWarm) * 3 + (65 - fanSpeed) * 0.08, 4, 26), 1),
        efficiencyScore: round(clamp(99 - Math.abs(tooWarm) * 4 - Math.max(0, tooHumid) * 0.5, 70, 99), 1),
      };
    }
  }

  async adaptSchedulePolicy(input: ScheduleInput) {
    const latest = await dataStore.getLatestReading(input.zoneId);
    const target = { temperature: input.targetTemp, humidity: input.targetHum };
    try {
      const response = await this.client.post("/train/rl", {
        zone_id: input.zoneId,
        schedule: {
          name: input.name,
          start_time: input.startTime,
          duration: input.duration,
          mode: input.mode,
          target_temp: input.targetTemp,
          target_humidity: input.targetHum,
        },
        current_state: latest ?? {},
      });
      const optimization = response.data.optimization;
      return {
        policyUpdated: Boolean(response.data.policy_updated),
        trainingSamples: Number(response.data.training_samples ?? 0),
        optimization: {
          action: optimization.action,
          newSetpoint: optimization.new_setpoint,
          fanSpeed: optimization.fan_speed,
          predictedSavings: optimization.predicted_savings,
          efficiencyScore: optimization.efficiency_score,
        } satisfies HvacOptimization,
      };
    } catch (error) {
      logger.debug({ error }, "Using local schedule policy fallback");
      return {
        policyUpdated: false,
        trainingSamples: 0,
        optimization: await this.optimizeHvac(input.zoneId, latest ?? {}, target),
      };
    }
  }

  async evaluateInput(input: {
    zoneId?: number;
    temperature: number;
    humidity: number;
    co2: number;
    occupancy: number;
    airflow?: number;
    targetTemp?: number;
    targetHum?: number;
    horizonMinutes?: number;
  }) {
    const zoneId = input.zoneId ?? 1;
    const zone = await dataStore.getZone(zoneId);
    const targetTemp = input.targetTemp ?? zone?.targetTemp ?? 22;
    const targetHum = input.targetHum ?? zone?.targetHum ?? 45;
    const airflow = input.airflow ?? zone?.fanSpeed ?? 65;
    await dataStore.updateZoneControls(zoneId, { targetTemp, targetHum });

    const [reading] = await dataStore.createSensorReadings([
      {
        zoneId,
        temperature: round(input.temperature, 1),
        humidity: Math.round(input.humidity),
        co2: Math.round(input.co2),
        occupancy: Math.round(input.occupancy),
        airflow: round(airflow, 1),
        timestamp: new Date(),
      },
    ]);

    const [occupancy, demand, anomaly, optimization] = await Promise.all([
      this.predictOccupancy(zoneId, input.horizonMinutes ?? 60),
      this.predictDemand(zoneId, reading),
      this.detectAnomaly(zoneId, [reading]),
      this.optimizeHvac(zoneId, reading, { temperature: targetTemp, humidity: targetHum }),
    ]);

    await dataStore.updateZoneControls(zoneId, {
      targetTemp,
      targetHum,
      fanSpeed: optimization.fanSpeed,
    });

    const peak = Math.max(...occupancy.predictions);
    const recommendationType = anomaly.isAnomaly ? "inspect" : peak > reading.occupancy + 8 ? "pre_cool" : "optimize";
    const recommendation =
      recommendationType === "inspect"
        ? `${anomaly.message} Apply ${optimization.action.replace("_", " ")} and verify the sensor cluster.`
        : recommendationType === "pre_cool"
          ? `Occupancy may rise to ${peak}. Apply ${optimization.newSetpoint}C and ${optimization.fanSpeed}% airflow before the next peak.`
          : `AI recommends ${optimization.action.replace("_", " ")} with ${optimization.fanSpeed}% airflow for ${demand.savings}% load savings.`;

    return {
      zoneId,
      reading,
      occupancy,
      demand,
      anomaly,
      optimization,
      recommendation: {
        type: recommendationType,
        message: recommendation,
        confidence: occupancy.confidence,
        savings: Math.max(demand.savings, optimization.predictedSavings),
        co2Trend: reading.co2 > 760 ? "rising" : "stable",
      },
    };
  }

  async recommend(zoneId: number) {
    try {
      const response = await this.client.post("/recommend", { zone_id: zoneId });
      return {
        zoneId,
        type: response.data.type ?? "airflow_redirect",
        message: response.data.recommendation,
        confidence: response.data.confidence,
        savings: response.data.savings_percent,
        co2Trend: response.data.co2_trend ?? "stable",
      };
    } catch (error) {
      logger.debug({ error }, "Using local recommendation fallback");
      const [latest] = (await dataStore.getLatestReadings()).filter((reading) => reading.zoneId === zoneId);
      const prediction = await this.predictOccupancy(zoneId, 60);
      const demand = await this.predictDemand(zoneId, latest);
      const peak = Math.max(...prediction.predictions);
      return {
        zoneId,
        type: peak > (latest?.occupancy ?? 0) + 8 ? "pre_cool" : "airflow_redirect",
        message:
          peak > (latest?.occupancy ?? 0) + 8
            ? `Occupancy is forecast to rise to ${peak}. Start pre-cooling now and raise airflow gradually to avoid a demand spike.`
            : "Current demand is stable. Keep balanced airflow and trim compressor load to preserve comfort while lowering energy use.",
        confidence: prediction.confidence,
        savings: demand.savings,
        co2Trend: latest && latest.co2 > 760 ? "rising" : "stable",
      };
    }
  }

  async simulate(input: { zoneId?: number; targetTemp?: number; targetHum?: number; horizonHours?: number }) {
    const zoneId = input.zoneId ?? 1;
    const latest = (await dataStore.getLatestReadings()).find((reading) => reading.zoneId === zoneId);
    const demand = await this.predictDemand(zoneId, latest);
    const targetTemp = input.targetTemp ?? 22;
    const targetHum = input.targetHum ?? 45;
    const comfortPenalty = Math.abs((latest?.temperature ?? 22) - targetTemp) + Math.abs((latest?.humidity ?? 45) - targetHum) * 0.08;
    return {
      zoneId,
      horizonHours: input.horizonHours ?? 24,
      projectedLoadKw: round(demand.optimalLoadKw + comfortPenalty, 1),
      projectedSavingsPercent: round(clamp(demand.savings - comfortPenalty, 2, 32), 1),
      projectedCarbonReductionKg: round((demand.predictedLoadKw - demand.optimalLoadKw) * 0.72 * (input.horizonHours ?? 24), 1),
      recommendation: "Schedule is viable. Apply gradual fan ramping 20 minutes before high-occupancy windows.",
    };
  }
}

export const aiService = new AIService();
