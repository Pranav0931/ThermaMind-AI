import type {
  BuildingSnapshot,
  BuildingZone,
  ExplainableFactor,
  SimulationScenario,
  TrendPoint,
  TwinRoom,
} from "@/lib/realtime/types";
import {
  comfortDecisionsToEvents,
  createComfortIntelligence,
} from "@/lib/realtime/comfort-intelligence-engine";
import { createComfortPerKwhOptimization } from "@/lib/realtime/comfort-per-kwh-engine";
import { createThermalInertiaIntelligence } from "@/lib/realtime/thermal-inertia-engine";

const zoneSeeds: BuildingZone[] = [
  {
    id: "atrium",
    name: "North Atrium",
    floor: "L01",
    occupancy: 84,
    targetOccupancy: 96,
    comfortScore: 92,
    airVelocity: 0.42,
    supplyTemp: 17.8,
    thermalDrift: 0.16,
    co2: 682,
    humidity: 45,
    loadShare: 29,
  },
  {
    id: "studio",
    name: "Design Studio",
    floor: "L03",
    occupancy: 61,
    targetOccupancy: 72,
    comfortScore: 89,
    airVelocity: 0.38,
    supplyTemp: 18.4,
    thermalDrift: -0.08,
    co2: 745,
    humidity: 47,
    loadShare: 24,
  },
  {
    id: "labs",
    name: "AI Labs",
    floor: "L05",
    occupancy: 43,
    targetOccupancy: 54,
    comfortScore: 95,
    airVelocity: 0.46,
    supplyTemp: 17.2,
    thermalDrift: 0.04,
    co2: 618,
    humidity: 42,
    loadShare: 31,
  },
  {
    id: "board",
    name: "Sky Boardroom",
    floor: "L08",
    occupancy: 18,
    targetOccupancy: 22,
    comfortScore: 91,
    airVelocity: 0.35,
    supplyTemp: 18.1,
    thermalDrift: 0.21,
    co2: 702,
    humidity: 44,
    loadShare: 16,
  },
];

const twinRoomSeeds: TwinRoom[] = [
  {
    id: "conf-alpha",
    name: "Conference Alpha",
    type: "conference",
    x: 5,
    y: 8,
    w: 30,
    h: 26,
    occupancy: 18,
    capacity: 24,
    comfortScore: 91,
    temperature: 22.8,
    airVelocity: 0.36,
    thermalDrift: 0.12,
    active: true,
  },
  {
    id: "office-north",
    name: "North Office",
    type: "office",
    x: 38,
    y: 8,
    w: 26,
    h: 26,
    occupancy: 42,
    capacity: 58,
    comfortScore: 94,
    temperature: 22.2,
    airVelocity: 0.44,
    thermalDrift: -0.04,
    active: true,
  },
  {
    id: "meeting-orion",
    name: "Meeting Orion",
    type: "meeting",
    x: 67,
    y: 8,
    w: 28,
    h: 26,
    occupancy: 8,
    capacity: 10,
    comfortScore: 84,
    temperature: 24.3,
    airVelocity: 0.31,
    thermalDrift: 0.31,
    active: true,
  },
  {
    id: "hall-spine",
    name: "Main Hallway",
    type: "hallway",
    x: 5,
    y: 38,
    w: 90,
    h: 18,
    occupancy: 21,
    capacity: 44,
    comfortScore: 89,
    temperature: 21.6,
    airVelocity: 0.52,
    thermalDrift: -0.18,
    active: false,
  },
  {
    id: "office-south",
    name: "South Office",
    type: "office",
    x: 5,
    y: 60,
    w: 34,
    h: 30,
    occupancy: 36,
    capacity: 52,
    comfortScore: 96,
    temperature: 22.1,
    airVelocity: 0.48,
    thermalDrift: 0.02,
    active: true,
  },
  {
    id: "meeting-nova",
    name: "Meeting Nova",
    type: "meeting",
    x: 42,
    y: 60,
    w: 22,
    h: 30,
    occupancy: 3,
    capacity: 8,
    comfortScore: 78,
    temperature: 20.1,
    airVelocity: 0.57,
    thermalDrift: -0.36,
    active: false,
  },
  {
    id: "conference-zenith",
    name: "Conference Zenith",
    type: "conference",
    x: 67,
    y: 60,
    w: 28,
    h: 30,
    occupancy: 16,
    capacity: 18,
    comfortScore: 82,
    temperature: 25.1,
    airVelocity: 0.28,
    thermalDrift: 0.42,
    active: true,
  },
];

const factorSeeds: ExplainableFactor[] = [
  {
    label: "Occupancy pulse forming on L03",
    weight: 87,
    reasoning: "Badge flow and CO2 slope indicate a conference break pattern in 14 minutes.",
    direction: "comfort",
  },
  {
    label: "Envelope thermal mass is favorable",
    weight: 78,
    reasoning: "Concrete core temperature is lagging outdoor gain, allowing compressor deferral.",
    direction: "energy",
  },
  {
    label: "Compressor synchronization risk",
    weight: 64,
    reasoning: "Two AHUs would ramp together if setpoint correction exceeded 0.6 C.",
    direction: "risk",
  },
  {
    label: "Perceived comfort can be lifted by airspeed",
    weight: 72,
    reasoning: "Draft risk is low, so diffuser bias can increase comfort without overcooling.",
    direction: "comfort",
  },
];

function wave(tick: number, phase = 0, amplitude = 1) {
  return Math.sin(tick / 8 + phase) * amplitude + Math.cos(tick / 13 + phase) * amplitude * 0.42;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function zoneAtTick(zone: BuildingZone, tick: number, index: number): BuildingZone {
  const movement = wave(tick, index * 0.9, 1);
  const occupancy = clamp(zone.occupancy + Math.round(movement * 5), 8, zone.targetOccupancy + 18);
  const airVelocity = clamp(zone.airVelocity + movement * 0.025, 0.24, 0.58);
  const thermalDrift = clamp(zone.thermalDrift + wave(tick, index * 1.7, 0.06), -0.32, 0.34);

  return {
    ...zone,
    occupancy,
    airVelocity: round(airVelocity, 2),
    thermalDrift: round(thermalDrift, 2),
    supplyTemp: round(zone.supplyTemp + wave(tick, index, 0.18), 1),
    comfortScore: round(clamp(zone.comfortScore + movement * 1.8 - Math.abs(thermalDrift) * 3, 82, 99), 0),
    co2: Math.round(clamp(zone.co2 + occupancy * 0.85 + movement * 28, 520, 980)),
    humidity: round(clamp(zone.humidity + wave(tick, index * 0.4, 1.2), 38, 53), 0),
    loadShare: round(clamp(zone.loadShare + wave(tick, index * 0.8, 2.8), 8, 42), 0),
  };
}

function roomAtTick(room: TwinRoom, tick: number, index: number): TwinRoom {
  const motion = wave(tick, index * 0.72, 1);
  const loadPressure = room.occupancy / room.capacity;
  const thermalDrift = clamp(room.thermalDrift + wave(tick, index * 1.31, 0.08), -0.52, 0.58);
  const temperature = clamp(room.temperature + thermalDrift * 0.34 + motion * 0.16, 19.2, 26.4);
  const occupancy = Math.round(clamp(room.occupancy + motion * 3.8, 0, room.capacity + 6));
  const overheatPenalty = Math.max(0, temperature - 23.4) * 9;
  const overcoolPenalty = Math.max(0, 21.1 - temperature) * 8;
  const densityPenalty = Math.max(0, loadPressure - 0.75) * 8;

  return {
    ...room,
    occupancy,
    temperature: round(temperature, 1),
    airVelocity: round(clamp(room.airVelocity + wave(tick, index * 0.4, 0.035), 0.22, 0.62), 2),
    thermalDrift: round(thermalDrift, 2),
    comfortScore: round(
      clamp(room.comfortScore + motion * 2.4 - overheatPenalty - overcoolPenalty - densityPenalty, 66, 99),
      0,
    ),
    active: room.active || occupancy > room.capacity * 0.7 || Math.abs(thermalDrift) > 0.34,
  };
}

function buildTrend(tick: number): TrendPoint[] {
  return Array.from({ length: 18 }, (_, index) => {
    const frame = tick - (17 - index);
    return {
      time: `${String((8 + index) % 24).padStart(2, "0")}:00`,
      comfort: round(clamp(90 + wave(frame, 0.2, 4.2), 78, 99), 0),
      kwh: round(clamp(42 + wave(frame, 1.2, 7.5), 25, 58), 1),
      airflow: round(clamp(72 + wave(frame, 2.1, 9.8), 42, 94), 0),
      compressor: round(clamp(28 + wave(frame, 3.4, 12), 8, 62), 0),
      stability: round(clamp(88 + wave(frame, 4.2, 6.4), 70, 98), 0),
      occupancy: round(clamp(56 + wave(frame, 2.7, 18), 22, 91), 0),
    };
  });
}

function simulationRamp(tick: number, activatedAtTick: number) {
  return clamp(0.35 + Math.max(0, tick - activatedAtTick) * 0.18, 0.35, 1);
}

function applySimulationToZone(
  zone: BuildingZone,
  scenario: SimulationScenario | null,
  strength: number,
  index: number,
): BuildingZone {
  if (!scenario) {
    return zone;
  }

  switch (scenario) {
    case "occupancy-surge":
      return {
        ...zone,
        occupancy: Math.round(clamp(zone.occupancy * (1.22 + strength * 0.2) + 4 + index * 2, 10, zone.targetOccupancy + 36)),
        co2: Math.round(clamp(zone.co2 + 72 + strength * 60, 540, 1200)),
        airVelocity: round(clamp(zone.airVelocity + 0.05 + strength * 0.04, 0.24, 0.7), 2),
        comfortScore: round(clamp(zone.comfortScore - 3 - strength * 4, 64, 99), 0),
      };
    case "heatwave":
      return {
        ...zone,
        supplyTemp: round(clamp(zone.supplyTemp + 0.4 + strength * 1.4, 17, 22), 1),
        thermalDrift: round(clamp(zone.thermalDrift + 0.14 + strength * 0.24, -0.3, 0.88), 2),
        humidity: round(clamp(zone.humidity + 2 + strength * 3, 38, 63), 0),
        comfortScore: round(clamp(zone.comfortScore - 6 - strength * 6, 58, 99), 0),
      };
    case "empty-building":
      return {
        ...zone,
        occupancy: Math.round(clamp(zone.occupancy * (0.2 - strength * 0.04), 0, 24)),
        co2: Math.round(clamp(zone.co2 - 110 - strength * 80, 420, 900)),
        airVelocity: round(clamp(zone.airVelocity - 0.04 - strength * 0.03, 0.18, 0.62), 2),
        thermalDrift: round(clamp(zone.thermalDrift - 0.08, -0.42, 0.34), 2),
        comfortScore: round(clamp(zone.comfortScore + 2 - strength * 1.2, 68, 99), 0),
      };
    case "conference-event":
      return {
        ...zone,
        occupancy: Math.round(clamp(zone.occupancy + (zone.floor === "L08" ? 24 : 12) + strength * 10, 6, zone.targetOccupancy + 40)),
        loadShare: round(clamp(zone.loadShare + 3 + strength * 6, 8, 48), 0),
        airVelocity: round(clamp(zone.airVelocity + 0.04 + strength * 0.05, 0.24, 0.72), 2),
        comfortScore: round(clamp(zone.comfortScore - 2 - strength * 3, 62, 99), 0),
      };
    case "humidity-spike":
      return {
        ...zone,
        humidity: round(clamp(zone.humidity + 8 + strength * 10, 40, 76), 0),
        thermalDrift: round(clamp(zone.thermalDrift + 0.04 + strength * 0.1, -0.32, 0.56), 2),
        comfortScore: round(clamp(zone.comfortScore - 4 - strength * 4, 60, 99), 0),
      };
    case "hvac-stress":
      return {
        ...zone,
        airVelocity: round(clamp(zone.airVelocity - 0.06 - strength * 0.06, 0.15, 0.58), 2),
        thermalDrift: round(clamp(zone.thermalDrift + 0.16 + strength * 0.2, -0.2, 0.9), 2),
        supplyTemp: round(clamp(zone.supplyTemp + 0.6 + strength * 1.2, 17, 23), 1),
        comfortScore: round(clamp(zone.comfortScore - 6 - strength * 6, 54, 99), 0),
      };
  }
}

function applySimulationToRoom(
  room: TwinRoom,
  scenario: SimulationScenario | null,
  strength: number,
): TwinRoom {
  if (!scenario) {
    return room;
  }

  const conferenceBias = room.type === "conference" ? 1.6 : room.type === "meeting" ? 1.25 : 1;

  switch (scenario) {
    case "occupancy-surge":
      return {
        ...room,
        occupancy: Math.round(clamp(room.occupancy + 5 + strength * 8 * conferenceBias, 0, room.capacity + 10)),
        airVelocity: round(clamp(room.airVelocity + 0.05 + strength * 0.03, 0.2, 0.72), 2),
        temperature: round(clamp(room.temperature + 0.3 + strength * 0.5, 19, 27.2), 1),
        comfortScore: round(clamp(room.comfortScore - 4 - strength * 4, 52, 99), 0),
      };
    case "heatwave":
      return {
        ...room,
        temperature: round(clamp(room.temperature + 1.2 + strength * 2, 19.2, 29.4), 1),
        thermalDrift: round(clamp(room.thermalDrift + 0.15 + strength * 0.2, -0.4, 1), 2),
        comfortScore: round(clamp(room.comfortScore - 8 - strength * 8, 45, 99), 0),
      };
    case "empty-building":
      return {
        ...room,
        occupancy: Math.round(clamp(room.occupancy * (0.16 - strength * 0.04), 0, 8)),
        temperature: round(clamp(room.temperature - 0.4, 18.8, 25.8), 1),
        airVelocity: round(clamp(room.airVelocity - 0.04, 0.16, 0.62), 2),
        active: false,
      };
    case "conference-event":
      return {
        ...room,
        occupancy: Math.round(
          clamp(
            room.occupancy + (room.type === "conference" ? 8 : room.type === "meeting" ? 5 : 2) + strength * 6,
            0,
            room.capacity + 12,
          ),
        ),
        temperature: round(clamp(room.temperature + 0.5 + strength * 0.8 * conferenceBias, 19.2, 28.4), 1),
        thermalDrift: round(clamp(room.thermalDrift + 0.1 + strength * 0.12, -0.4, 0.88), 2),
        comfortScore: round(clamp(room.comfortScore - 3 - strength * 4, 50, 99), 0),
        active: true,
      };
    case "humidity-spike":
      return {
        ...room,
        temperature: round(clamp(room.temperature + 0.3 + strength * 0.5, 19.2, 27.4), 1),
        thermalDrift: round(clamp(room.thermalDrift + 0.08 + strength * 0.14, -0.38, 0.82), 2),
        comfortScore: round(clamp(room.comfortScore - 5 - strength * 4, 48, 99), 0),
      };
    case "hvac-stress":
      return {
        ...room,
        airVelocity: round(clamp(room.airVelocity - 0.08 - strength * 0.05, 0.14, 0.62), 2),
        temperature: round(clamp(room.temperature + 0.8 + strength * 1.4, 19.2, 29), 1),
        thermalDrift: round(clamp(room.thermalDrift + 0.18 + strength * 0.2, -0.34, 1), 2),
        comfortScore: round(clamp(room.comfortScore - 8 - strength * 7, 42, 99), 0),
      };
  }
}

function applySimulationToTrendPoint(
  point: TrendPoint,
  scenario: SimulationScenario | null,
  strength: number,
  index: number,
): TrendPoint {
  if (!scenario) {
    return point;
  }

  const recency = (index + 1) / 18;

  switch (scenario) {
    case "occupancy-surge":
      return {
        ...point,
        occupancy: round(clamp(point.occupancy + recency * (12 + strength * 18), 18, 100), 0),
        airflow: round(clamp(point.airflow + recency * (7 + strength * 9), 36, 100), 0),
        kwh: round(clamp(point.kwh + recency * (3 + strength * 5), 18, 78), 1),
        comfort: round(clamp(point.comfort - recency * (2 + strength * 4), 48, 99), 0),
      };
    case "heatwave":
      return {
        ...point,
        stability: round(clamp(point.stability - recency * (8 + strength * 10), 44, 99), 0),
        kwh: round(clamp(point.kwh + recency * (5 + strength * 7), 18, 84), 1),
        compressor: round(clamp(point.compressor + recency * (9 + strength * 12), 6, 98), 0),
        comfort: round(clamp(point.comfort - recency * (5 + strength * 6), 40, 99), 0),
      };
    case "empty-building":
      return {
        ...point,
        occupancy: round(clamp(point.occupancy - recency * (20 + strength * 22), 0, 95), 0),
        kwh: round(clamp(point.kwh - recency * (6 + strength * 7), 8, 72), 1),
        compressor: round(clamp(point.compressor - recency * (10 + strength * 10), 0, 80), 0),
        stability: round(clamp(point.stability + recency * (2 + strength * 4), 48, 99), 0),
      };
    case "conference-event":
      return {
        ...point,
        occupancy: round(clamp(point.occupancy + recency * (10 + strength * 12), 16, 100), 0),
        airflow: round(clamp(point.airflow + recency * (8 + strength * 9), 34, 100), 0),
        compressor: round(clamp(point.compressor + recency * (7 + strength * 9), 8, 96), 0),
        comfort: round(clamp(point.comfort - recency * (3 + strength * 4), 45, 99), 0),
      };
    case "humidity-spike":
      return {
        ...point,
        comfort: round(clamp(point.comfort - recency * (4 + strength * 5), 44, 99), 0),
        stability: round(clamp(point.stability - recency * (4 + strength * 6), 48, 99), 0),
        kwh: round(clamp(point.kwh + recency * (2 + strength * 4), 18, 72), 1),
      };
    case "hvac-stress":
      return {
        ...point,
        airflow: round(clamp(point.airflow - recency * (8 + strength * 10), 24, 100), 0),
        kwh: round(clamp(point.kwh + recency * (7 + strength * 9), 20, 90), 1),
        compressor: round(clamp(point.compressor + recency * (12 + strength * 14), 10, 99), 0),
        stability: round(clamp(point.stability - recency * (6 + strength * 8), 40, 99), 0),
      };
  }
}

function simulationContext(
  scenario: SimulationScenario | null,
  strength: number,
): { label: string; detail: string; impact: string; category: "occupancy" | "airflow" | "humidity" | "thermal" | "energy" | "compressor"; severity: "info" | "optimization" | "guardrail" } | null {
  if (!scenario) {
    return null;
  }

  switch (scenario) {
    case "occupancy-surge":
      return {
        label: "Simulation: Occupancy surge activated",
        detail: "Crowd density and thermal load rose quickly. AI is rebalancing airflow and comfort in realtime.",
        impact: `+${Math.round(8 + strength * 12)}% demand`,
        category: "occupancy",
        severity: "guardrail",
      };
    case "heatwave":
      return {
        label: "Simulation: Heatwave conditions",
        detail: "Outdoor thermal gain is forcing higher cooling demand and reduced comfort stability.",
        impact: `+${Math.round(10 + strength * 14)}% cooling`,
        category: "thermal",
        severity: "guardrail",
      };
    case "empty-building":
      return {
        label: "Simulation: Empty building mode",
        detail: "Occupancy collapsed. AI has shifted to coast mode and reduced active cooling.",
        impact: `-${Math.round(12 + strength * 12)}% energy`,
        category: "energy",
        severity: "optimization",
      };
    case "conference-event":
      return {
        label: "Simulation: Conference event peak",
        detail: "Meeting and conference zones spiked. AI is redistributing conditioned air to preserve comfort.",
        impact: `+${Math.round(9 + strength * 11)}% airflow`,
        category: "airflow",
        severity: "info",
      };
    case "humidity-spike":
      return {
        label: "Simulation: Humidity spike",
        detail: "Latent load increased sharply. AI has started humidity balancing with minimal setpoint drift.",
        impact: `+${Math.round(7 + strength * 9)}% latent control`,
        category: "humidity",
        severity: "guardrail",
      };
    case "hvac-stress":
      return {
        label: "Simulation: HVAC stress response",
        detail: "System stress is constraining airflow and compressor availability. AI is prioritizing critical comfort zones.",
        impact: `+${Math.round(12 + strength * 15)}% compressor risk`,
        category: "compressor",
        severity: "guardrail",
      };
  }
}

export function createBuildingSnapshot(
  tick: number,
  simulation?: {
    scenario: SimulationScenario | null;
    activatedAtTick: number;
  },
): BuildingSnapshot {
  const activeScenario = simulation?.scenario ?? null;
  const simulationStrength = activeScenario ? simulationRamp(tick, simulation?.activatedAtTick ?? tick) : 0;

  const zones = zoneSeeds
    .map((zone, index) => zoneAtTick(zone, tick, index))
    .map((zone, index) => applySimulationToZone(zone, activeScenario, simulationStrength, index));
  const twinRooms = twinRoomSeeds
    .map((room, index) => roomAtTick(room, tick, index))
    .map((room) => applySimulationToRoom(room, activeScenario, simulationStrength));

  const trend = buildTrend(tick).map((point, index) =>
    applySimulationToTrendPoint(point, activeScenario, simulationStrength, index),
  );
  const thermalIntelligence = createThermalInertiaIntelligence(twinRooms, tick);
  const comfortIntelligence = createComfortIntelligence(zones, twinRooms, thermalIntelligence, tick);
  const comfortScore = zones.reduce((sum, zone) => sum + zone.comfortScore, 0) / zones.length;
  const occupancy = zones.reduce((sum, zone) => sum + zone.occupancy, 0);
  const airflowBalance = zones.reduce((sum, zone) => sum + zone.airVelocity * 170, 0) / zones.length;
  const latestTrend = trend[trend.length - 1];
  const energyLoad = latestTrend.kwh + 1.8 + wave(tick, 1.2, 1.3);
  const compressorSpikeRisk = latestTrend.compressor + Math.max(0, wave(tick, 2.9, 4.2));
  const thermalInertia = 74 + wave(tick, 0.7, 8) + Math.max(0, latestTrend.stability - 86) * 0.26;
  const stabilityScore = latestTrend.stability;
  const comfortPerKwhOptimization = createComfortPerKwhOptimization({
    zones,
    rooms: twinRooms,
    trend,
    comfort: comfortIntelligence,
    thermal: thermalIntelligence,
    energyLoad,
    compressorSpikeRisk,
  });

  const generatedEvents = comfortDecisionsToEvents(comfortIntelligence.decisions);
  const activeSimulationContext = simulationContext(activeScenario, simulationStrength);
  const events = activeSimulationContext
    ? [
        {
          id: `sim-${activeScenario}-${tick}`,
          label: activeSimulationContext.label,
          detail: activeSimulationContext.detail,
          impact: activeSimulationContext.impact,
          confidence: round(88 + simulationStrength * 10, 0),
          severity: activeSimulationContext.severity,
          category: activeSimulationContext.category,
          timestamp: Date.now(),
        },
        ...generatedEvents,
      ]
    : generatedEvents;

  return {
    timestamp: Date.now(),
    comfortScore: round(comfortScore, 0),
    comfortPerKwh: comfortPerKwhOptimization.thermaMindEfficiency,
    energyLoad: round(energyLoad, 1),
    predictedPeakMinutes: Math.round(clamp(38 + wave(tick, 1.9, 16), 12, 66)),
    compressorSpikeRisk: round(clamp(compressorSpikeRisk, 8, 72), 0),
    thermalInertia: round(clamp(thermalInertia, 52, 91), 0),
    airflowBalance: round(clamp(airflowBalance, 78, 99), 0),
    stabilityScore: round(clamp(stabilityScore, 42, 99), 0),
    adaptiveSetpoint: round(clamp(22.4 + wave(tick, 1.1, 0.28) + (activeScenario === "heatwave" || activeScenario === "hvac-stress" ? 0.3 : 0), 21.4, 24.6), 1),
    avoidedKwh: round(clamp(14.2 + wave(tick, 0.2, 3.8), 6, 22), 1),
    predictedOccupancySurge: Math.round(
      clamp(
        18 + wave(tick, 2.2, 12) + (activeScenario === "occupancy-surge" || activeScenario === "conference-event" ? 12 + simulationStrength * 10 : activeScenario === "empty-building" ? -12 : 0),
        0,
        66,
      ),
    ),
    aiConfidence: round(clamp(91 + wave(tick, 0.4, 4.2), 84, 98), 0),
    occupancy,
    zones,
    twinRooms,
    trend,
    events: events.slice(0, 9),
    explainability: factorSeeds.map((factor, index) => ({
      ...factor,
      weight: Math.round(clamp(factor.weight + wave(tick, index * 0.55, 5.2), 42, 96)),
    })),
    thermalIntelligence,
    comfortIntelligence,
    comfortPerKwhOptimization,
  };
}
