import type {
  BuildingZone,
  ComfortAIDecision,
  ComfortIntelligence,
  ComfortZonePrediction,
  IntelligenceEvent,
  ThermalInertiaIntelligence,
  TwinRoom,
} from "@/lib/realtime/types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 0) {
  return Number(value.toFixed(digits));
}

function wave(tick: number, phase = 0, amplitude = 1) {
  return Math.sin(tick / 6 + phase) * amplitude + Math.cos(tick / 11 + phase) * amplitude * 0.38;
}

function roomPressure(room: TwinRoom) {
  const occupancyPressure = room.occupancy / Math.max(room.capacity, 1);
  const heatPressure = Math.max(0, room.temperature - 22.7) * 18;
  const overcoolPressure = Math.max(0, 21 - room.temperature) * 14;
  return clamp(occupancyPressure * 46 + heatPressure + overcoolPressure + Math.abs(room.thermalDrift) * 24, 0, 100);
}

function predictZone(zone: BuildingZone, tick: number, index: number): ComfortZonePrediction {
  const occupancyForecast = clamp(
    zone.occupancy + wave(tick, index * 0.7, 9) + Math.max(0, zone.co2 - 680) * 0.035,
    0,
    zone.targetOccupancy + 26,
  );
  const density = occupancyForecast / Math.max(zone.targetOccupancy, 1);
  const airflowNeed = clamp(density * 42 + Math.max(0, zone.thermalDrift) * 54 - zone.airVelocity * 26, 8, 96);
  const humidityRisk = clamp(Math.abs(zone.humidity - 45) * 5.8 + Math.max(0, zone.co2 - 760) * 0.05, 0, 92);
  const stabilityRisk = clamp(Math.abs(zone.thermalDrift) * 170 + Math.max(0, 86 - zone.comfortScore) * 1.8, 0, 100);
  const coolingWasteRisk = clamp((1 - density) * 42 + Math.max(0, 18 - zone.supplyTemp) * 10, 0, 92);
  const discomfortRisk = clamp(
    (100 - zone.comfortScore) * 1.8 + airflowNeed * 0.22 + humidityRisk * 0.16 + stabilityRisk * 0.28,
    0,
    100,
  );

  return {
    zoneId: zone.id,
    zoneName: zone.name,
    occupancyForecast: round(occupancyForecast),
    discomfortRisk: round(discomfortRisk),
    airflowNeed: round(airflowNeed),
    humidityRisk: round(humidityRisk),
    stabilityRisk: round(stabilityRisk),
    coolingWasteRisk: round(coolingWasteRisk),
    recommendedBias: round(clamp(airflowNeed * 0.34 - coolingWasteRisk * 0.12, -12, 28)),
  };
}

function decision(
  tick: number,
  index: number,
  input: Omit<ComfortAIDecision, "id">,
): ComfortAIDecision {
  return {
    ...input,
    id: `${input.type}-${index}-${tick}`,
  };
}

export function createComfortIntelligence(
  zones: BuildingZone[],
  rooms: TwinRoom[],
  thermal: ThermalInertiaIntelligence,
  tick: number,
): ComfortIntelligence {
  const zonePredictions = zones.map((zone, index) => predictZone(zone, tick, index));
  const roomRisk = rooms.reduce((sum, room) => sum + roomPressure(room), 0) / rooms.length;
  const peakZone = [...zonePredictions].sort((a, b) => b.discomfortRisk - a.discomfortRisk)[0];
  const airflowZone = [...zonePredictions].sort((a, b) => b.airflowNeed - a.airflowNeed)[0];
  const wasteZone = [...zonePredictions].sort((a, b) => b.coolingWasteRisk - a.coolingWasteRisk)[0];
  const humidityZone = [...zonePredictions].sort((a, b) => b.humidityRisk - a.humidityRisk)[0];
  const overheatRoom = [...rooms].sort((a, b) => roomPressure(b) - roomPressure(a))[0];

  const compressorSpikeAvoidance = clamp(92 - Math.max(0, thermal.thermalMomentum - 44) * 0.42, 58, 98);
  const airflowOptimization = clamp(
    88 + zonePredictions.reduce((sum, zone) => sum + zone.recommendedBias, 0) / zonePredictions.length * 0.22,
    64,
    98,
  );
  const discomfortPrediction = clamp((peakZone.discomfortRisk * 0.62 + roomRisk * 0.38), 0, 100);
  const occupancyPrediction =
    zonePredictions.reduce((sum, zone) => sum + zone.occupancyForecast, 0) / zonePredictions.length;
  const humidityBalance = clamp(96 - humidityZone.humidityRisk * 0.42, 55, 98);
  const stabilityOptimization = clamp(thermal.fluctuationSuppression - discomfortPrediction * 0.08, 58, 98);
  const coolingWasteReduction = clamp(62 + wasteZone.coolingWasteRisk * 0.32, 45, 94);
  const energyOptimization = clamp(
    82 + coolingWasteReduction * 0.1 + compressorSpikeAvoidance * 0.08 - discomfortPrediction * 0.08,
    52,
    98,
  );
  const perceivedComfort = clamp(96 - discomfortPrediction * 0.34 + airflowOptimization * 0.08, 60, 99);
  const setpointDiscipline = clamp(94 - Math.max(0, discomfortPrediction - 58) * 0.18, 72, 99);

  const decisions: ComfortAIDecision[] = [
    decision(tick, 0, {
      type: "increase-airflow",
      target: airflowZone.zoneName,
      title: "Increase airflow, hold temperature",
      reasoning: `${airflowZone.zoneName} shows rising perceived discomfort, but thermal drift remains controllable without lowering the setpoint.`,
      action: `Raise diffuser bias by ${Math.max(4, airflowZone.recommendedBias)}% and preserve adaptive setpoint.`,
      expectedImpact: "+2.8 perceived comfort",
      confidence: round(clamp(88 + airflowZone.airflowNeed * 0.08, 82, 97)),
      priority: airflowZone.airflowNeed > 62 ? "high" : "medium",
    }),
    decision(tick, 1, {
      type: "redirect-cooling",
      target: overheatRoom.name,
      title: "Redirect cooling to occupied heat pocket",
      reasoning: `${overheatRoom.name} has occupancy heat and rising thermal momentum; nearby lower-load zones can coast.`,
      action: "Shift chilled-air priority toward occupied zones before compressor escalation.",
      expectedImpact: "-0.4 C drift",
      confidence: round(clamp(84 + roomPressure(overheatRoom) * 0.1, 80, 96)),
      priority: "high",
    }),
    decision(tick, 2, {
      type: "preempt-overheat",
      target: peakZone.zoneName,
      title: "Predict overheating before discomfort",
      reasoning: `Occupancy forecast and CO2 slope indicate discomfort risk will climb to ${peakZone.discomfortRisk}% if airflow is not biased now.`,
      action: "Pre-stabilize with airflow and supply mixing; avoid aggressive temperature change.",
      expectedImpact: "-14% discomfort risk",
      confidence: round(clamp(86 + peakZone.discomfortRisk * 0.09, 82, 98)),
      priority: peakZone.discomfortRisk > 58 ? "high" : "medium",
    }),
    decision(tick, 3, {
      type: "avoid-compressor-spike",
      target: "Central plant",
      title: "Stagger compressor demand",
      reasoning: "Thermal inertia can carry comfort while airflow corrections absorb short-term load.",
      action: "Delay next compressor stage and distribute fan response across zones.",
      expectedImpact: "-16% peak draw",
      confidence: round(compressorSpikeAvoidance),
      priority: compressorSpikeAvoidance < 76 ? "high" : "medium",
    }),
    decision(tick, 4, {
      type: "balance-humidity",
      target: humidityZone.zoneName,
      title: "Balance humidity for perceived comfort",
      reasoning: `${humidityZone.zoneName} humidity and CO2 are nudging perceived warmth above measured temperature.`,
      action: "Tune ventilation mix and latent control without dropping room temperature.",
      expectedImpact: "+1.9 comfort",
      confidence: round(humidityBalance),
      priority: humidityZone.humidityRisk > 46 ? "medium" : "low",
    }),
    decision(tick, 5, {
      type: "reduce-cooling-waste",
      target: wasteZone.zoneName,
      title: "Reduce cooling waste in low-load zone",
      reasoning: `${wasteZone.zoneName} can coast on retained cooling while occupied areas receive airflow priority.`,
      action: "Trim supply bias and redirect comfort capacity to active zones.",
      expectedImpact: "-4.6 kWh",
      confidence: round(coolingWasteReduction),
      priority: "medium",
    }),
  ];

  const mode =
    compressorSpikeAvoidance < 76
      ? "stability-guard"
      : humidityZone.humidityRisk > 52
        ? "humidity-balance"
        : coolingWasteReduction > 78
          ? "energy-coast"
          : "airflow-first";

  return {
    mode,
    perceivedComfort: round(perceivedComfort),
    occupancyPrediction: round(occupancyPrediction),
    discomfortPrediction: round(discomfortPrediction),
    airflowOptimization: round(airflowOptimization),
    humidityBalance: round(humidityBalance),
    stabilityOptimization: round(stabilityOptimization),
    energyOptimization: round(energyOptimization),
    coolingWasteReduction: round(coolingWasteReduction),
    compressorSpikeAvoidance: round(compressorSpikeAvoidance),
    setpointDiscipline: round(setpointDiscipline),
    decisions: decisions.sort((a, b) => {
      const priority = { high: 3, medium: 2, low: 1 };
      return priority[b.priority] - priority[a.priority] || b.confidence - a.confidence;
    }),
    zonePredictions,
  };
}

export function comfortDecisionsToEvents(decisions: ComfortAIDecision[]): IntelligenceEvent[] {
  return decisions.slice(0, 6).map((item, index) => {
    const metadata = eventMetadata(item);

    return {
      id: item.id,
      label: metadata.label,
      detail: `${item.reasoning} Action: ${item.action}`,
      impact: metadata.impact ?? item.expectedImpact,
      confidence: item.confidence,
      severity: metadata.severity,
      category: metadata.category,
      timestamp: Date.now() - index * 9000,
    };
  });
}

function eventMetadata(item: ComfortAIDecision): Pick<
  IntelligenceEvent,
  "label" | "impact" | "severity" | "category"
> {
  switch (item.type) {
    case "increase-airflow":
      return {
        label: "Airflow redirected to occupied zones",
        impact: item.expectedImpact,
        severity: "info",
        category: "airflow",
      };
    case "redirect-cooling":
      return {
        label: `${item.target} cooling priority adjusted`,
        impact: item.expectedImpact,
        severity: "optimization",
        category: "airflow",
      };
    case "preempt-overheat":
      return {
        label: `${item.target} occupancy surge predicted`,
        impact: item.expectedImpact,
        severity: "guardrail",
        category: "occupancy",
      };
    case "avoid-compressor-spike":
      return {
        label: "Compressor spike avoided",
        impact: item.expectedImpact,
        severity: "guardrail",
        category: "compressor",
      };
    case "balance-humidity":
      return {
        label: "Humidity imbalance detected",
        impact: item.expectedImpact,
        severity: "info",
        category: "humidity",
      };
    case "reduce-cooling-waste":
      return {
        label: "Cooling waste reduced by 18%",
        impact: item.expectedImpact,
        severity: "optimization",
        category: "energy",
      };
    case "hold-setpoint":
      return {
        label: "Thermal stability optimized",
        impact: item.expectedImpact,
        severity: "optimization",
        category: "thermal",
      };
  }
}
