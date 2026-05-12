import type {
  ThermalForecastPoint,
  ThermalInertiaIntelligence,
  ThermalMaterial,
  ThermalRoomIntelligence,
  TwinRoom,
} from "@/lib/realtime/types";

const materialProfile: Record<
  ThermalMaterial,
  { retention: number; solarAbsorption: number; responseLag: number }
> = {
  glass: { retention: 0.48, solarAbsorption: 0.84, responseLag: 0.28 },
  concrete: { retention: 0.86, solarAbsorption: 0.58, responseLag: 0.82 },
  lightweight: { retention: 0.38, solarAbsorption: 0.46, responseLag: 0.22 },
  mixed: { retention: 0.64, solarAbsorption: 0.62, responseLag: 0.54 },
};

const roomMaterials: Record<string, ThermalMaterial> = {
  "conf-alpha": "glass",
  "office-north": "mixed",
  "meeting-orion": "glass",
  "hall-spine": "concrete",
  "office-south": "concrete",
  "meeting-nova": "lightweight",
  "conference-zenith": "glass",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function solarCurve(tick: number, room: TwinRoom, material: ThermalMaterial) {
  const westExposure = room.x > 60 ? 1.22 : room.x < 20 ? 0.82 : 1;
  const dailyArc = 0.5 + Math.sin(tick / 10 + room.x / 80) * 0.5;
  return clamp(dailyArc * westExposure * materialProfile[material].solarAbsorption * 100, 8, 96);
}

function comfortFromTemp(temp: number) {
  const deviation = Math.abs(temp - 22.4);
  return clamp(99 - deviation * 13.5, 58, 99);
}

function forecastRoom(room: TwinRoom, tick: number, material: ThermalMaterial): ThermalRoomIntelligence {
  const profile = materialProfile[material];
  const solarGain = solarCurve(tick, room, material);
  const occupancyPressure = room.occupancy / Math.max(room.capacity, 1);
  const occupancyHeat = clamp(occupancyPressure * 72 + Math.max(0, room.occupancy - room.capacity) * 4, 4, 94);
  const retentionFactor = round(profile.retention * 100, 0);
  const coolingMemory = clamp((22.4 - room.temperature) * profile.retention * 18, -16, 38);
  const thermalMomentum = clamp(
    room.thermalDrift * 48 + solarGain * 0.34 + occupancyHeat * 0.26 - coolingMemory,
    -42,
    96,
  );

  let aiAction: ThermalRoomIntelligence["aiAction"] = "defer-hvac";
  let actionDetail = "Let room coast; material mass is smoothing the thermal curve.";

  if (thermalMomentum > 58 || room.temperature > 24) {
    aiAction = "pre-stabilize";
    actionDetail = "Start low-intensity cooling before heat accumulation becomes discomfort.";
  } else if (room.temperature < 21.2 && profile.retention > 0.5) {
    aiAction = "retain-cooling";
    actionDetail = "Preserve existing coolth and reduce supply changes to avoid overcooling.";
  } else if (thermalMomentum > 28) {
    aiAction = "coast";
    actionDetail = "Use airflow and retained cooling before activating compressor stages.";
  }

  const forecast: ThermalForecastPoint[] = [0, 10, 20, 30, 45, 60].map((minute) => {
    const timeFactor = minute / 60;
    const retainedCooling = clamp((100 - solarGain) * profile.retention * (1 - timeFactor * 0.58), 0, 96);
    const heatAccumulation = clamp(
      solarGain * timeFactor * (1 - profile.responseLag * 0.34) +
        occupancyHeat * timeFactor * 0.42 +
        Math.max(0, room.thermalDrift) * 28,
      0,
      100,
    );
    const activeCoolingOffset = aiAction === "pre-stabilize" ? timeFactor * 0.9 : aiAction === "retain-cooling" ? 0.3 : 0;
    const predictedTemperature = clamp(
      room.temperature + heatAccumulation * 0.035 - retainedCooling * 0.018 - activeCoolingOffset,
      19,
      27.4,
    );

    return {
      minute,
      heatAccumulation: round(heatAccumulation, 0),
      coolingRetention: round(retainedCooling, 0),
      predictedTemperature: round(predictedTemperature, 1),
      predictedComfort: round(comfortFromTemp(predictedTemperature), 0),
    };
  });

  return {
    roomId: room.id,
    roomName: room.name,
    material,
    solarGain: round(solarGain, 0),
    occupancyHeat: round(occupancyHeat, 0),
    retentionFactor,
    thermalMomentum: round(thermalMomentum, 0),
    aiAction,
    actionDetail,
    forecast,
  };
}

export function createThermalInertiaIntelligence(
  rooms: TwinRoom[],
  tick: number,
): ThermalInertiaIntelligence {
  const roomIntel = rooms.map((room) => forecastRoom(room, tick, roomMaterials[room.id] ?? "mixed"));
  const averageMomentum = roomIntel.reduce((sum, room) => sum + room.thermalMomentum, 0) / roomIntel.length;
  const heatRisk = roomIntel.reduce((sum, room) => sum + room.forecast.at(-1)!.heatAccumulation, 0) / roomIntel.length;
  const coolingRetention =
    roomIntel.reduce((sum, room) => sum + room.forecast.at(2)!.coolingRetention, 0) / roomIntel.length;
  const preStabilizingRooms = roomIntel.filter((room) => room.aiAction === "pre-stabilize").length;
  const retainingRooms = roomIntel.filter((room) => room.aiAction === "retain-cooling").length;

  const organismState =
    preStabilizingRooms > 1
      ? "pre-stabilizing"
      : retainingRooms > 1
        ? "holding coolth"
        : averageMomentum > 36
          ? "absorbing heat"
          : "balanced";

  return {
    organismState,
    thermalMomentum: round(clamp(averageMomentum, -30, 95), 0),
    heatAccumulationRisk: round(clamp(heatRisk, 0, 100), 0),
    coolingRetentionScore: round(clamp(coolingRetention, 0, 100), 0),
    fluctuationSuppression: round(clamp(94 - Math.abs(averageMomentum - 26) * 0.7, 54, 98), 0),
    optimalCoolingWindow: Math.round(clamp(8 + (100 - heatRisk) * 0.22 + preStabilizingRooms * 4, 6, 34)),
    rooms: roomIntel,
  };
}
