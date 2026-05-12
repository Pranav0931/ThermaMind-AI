import type {
  BuildingZone,
  ComfortIntelligence,
  ComfortPerKwhOptimization,
  ThermalInertiaIntelligence,
  TrendPoint,
  TwinRoom,
} from "@/lib/realtime/types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

export function createComfortPerKwhOptimization({
  zones,
  rooms,
  trend,
  comfort,
  thermal,
  energyLoad,
  compressorSpikeRisk,
}: {
  zones: BuildingZone[];
  rooms: TwinRoom[];
  trend: TrendPoint[];
  comfort: ComfortIntelligence;
  thermal: ThermalInertiaIntelligence;
  energyLoad: number;
  compressorSpikeRisk: number;
}): ComfortPerKwhOptimization {
  const comfortScore = average([
    average(zones.map((zone) => zone.comfortScore)),
    average(rooms.map((room) => room.comfortScore)),
    comfort.perceivedComfort,
  ]);
  const airflowEffectiveness = clamp(
    average(zones.map((zone) => zone.airVelocity * 150)) * 0.46 +
      comfort.airflowOptimization * 0.42 +
      comfort.setpointDiscipline * 0.12,
    40,
    99,
  );
  const thermalStabilityScore = clamp(
    thermal.fluctuationSuppression * 0.58 + comfort.stabilityOptimization * 0.42,
    45,
    99,
  );
  const coolingWasteReduction = clamp(
    comfort.coolingWasteReduction * 0.62 +
      (100 - average(comfort.zonePredictions.map((zone) => zone.coolingWasteRisk))) * 0.22 +
      thermal.coolingRetentionScore * 0.16,
    35,
    98,
  );
  const avoidedCompressorUsage = clamp(
    comfort.compressorSpikeAvoidance * 0.68 + (100 - compressorSpikeRisk) * 0.32,
    30,
    98,
  );
  const optimizedAirflowPerformance = clamp(
    airflowEffectiveness * 0.72 + comfort.humidityBalance * 0.16 + comfort.perceivedComfort * 0.12,
    45,
    99,
  );
  const traditionalEfficiency = clamp(
    comfortScore / Math.max(energyLoad * 1.28 + compressorSpikeRisk * 0.11, 1),
    0.7,
    2.6,
  );
  const thermaMindEfficiency = clamp(
    (comfortScore * 1.18 + airflowEffectiveness * 0.24 + thermalStabilityScore * 0.2) /
      Math.max(energyLoad * 0.82 + compressorSpikeRisk * 0.045, 1),
    1.5,
    5.8,
  );
  const energyEfficiency = clamp((thermaMindEfficiency / traditionalEfficiency) * 52, 45, 99);
  const avoidedEnergyWaste = clamp(
    energyLoad * (coolingWasteReduction / 100) * 0.34 + avoidedCompressorUsage * 0.045,
    2,
    28,
  );
  const carbonReductionEstimate = clamp(avoidedEnergyWaste * 0.72, 1.2, 22);
  const comfortDeliveryGain = clamp(
    ((thermaMindEfficiency - traditionalEfficiency) / traditionalEfficiency) * 100,
    12,
    148,
  );
  const score = clamp(
    thermaMindEfficiency * 16 +
      comfortScore * 0.14 +
      airflowEffectiveness * 0.08 +
      thermalStabilityScore * 0.06 -
      compressorSpikeRisk * 0.03,
    42,
    99,
  );

  return {
    score: round(score, 1),
    comfortScore: round(comfortScore, 0),
    energyEfficiency: round(energyEfficiency, 0),
    airflowEffectiveness: round(airflowEffectiveness, 0),
    coolingWasteReduction: round(coolingWasteReduction, 0),
    thermalStabilityScore: round(thermalStabilityScore, 0),
    carbonReductionEstimate: round(carbonReductionEstimate, 1),
    traditionalEfficiency: round(traditionalEfficiency, 2),
    thermaMindEfficiency: round(thermaMindEfficiency, 2),
    avoidedCompressorUsage: round(avoidedCompressorUsage, 0),
    optimizedAirflowPerformance: round(optimizedAirflowPerformance, 0),
    avoidedEnergyWaste: round(avoidedEnergyWaste, 1),
    comfortDeliveryGain: round(comfortDeliveryGain, 0),
    trend: trend.slice(-8).map((point, index) => {
      const traditional = clamp(point.comfort / Math.max(point.kwh * 1.2 + point.compressor * 0.08, 1), 0.7, 2.8);
      const thermaMind = clamp(
        (point.comfort * 1.16 + point.airflow * 0.18 + point.stability * 0.12) /
          Math.max(point.kwh * 0.84 + point.compressor * 0.035, 1),
        1.4,
        5.8,
      );

      return {
        label: index === 7 ? "now" : `-${(7 - index) * 5}m`,
        traditional: round(traditional, 2),
        thermaMind: round(thermaMind, 2),
        avoidedWaste: round(clamp((thermaMind - traditional) * 6.2, 2, 24), 1),
      };
    }),
  };
}
