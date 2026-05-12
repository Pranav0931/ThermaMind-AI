export type BuildingZone = {
  id: string;
  name: string;
  floor: string;
  occupancy: number;
  targetOccupancy: number;
  comfortScore: number;
  airVelocity: number;
  supplyTemp: number;
  thermalDrift: number;
  co2: number;
  humidity: number;
  loadShare: number;
};

export type TwinRoomType = "meeting" | "office" | "hallway" | "conference";

export type TwinRoom = {
  id: string;
  name: string;
  type: TwinRoomType;
  x: number;
  y: number;
  w: number;
  h: number;
  occupancy: number;
  capacity: number;
  comfortScore: number;
  temperature: number;
  airVelocity: number;
  thermalDrift: number;
  active: boolean;
};

export type ThermalMaterial = "glass" | "concrete" | "lightweight" | "mixed";

export type ThermalForecastPoint = {
  minute: number;
  heatAccumulation: number;
  coolingRetention: number;
  predictedComfort: number;
  predictedTemperature: number;
};

export type ThermalRoomIntelligence = {
  roomId: string;
  roomName: string;
  material: ThermalMaterial;
  solarGain: number;
  occupancyHeat: number;
  retentionFactor: number;
  thermalMomentum: number;
  aiAction: "pre-stabilize" | "coast" | "retain-cooling" | "defer-hvac";
  actionDetail: string;
  forecast: ThermalForecastPoint[];
};

export type ThermalInertiaIntelligence = {
  organismState: "absorbing heat" | "holding coolth" | "pre-stabilizing" | "balanced";
  thermalMomentum: number;
  heatAccumulationRisk: number;
  coolingRetentionScore: number;
  fluctuationSuppression: number;
  optimalCoolingWindow: number;
  rooms: ThermalRoomIntelligence[];
};

export type TrendPoint = {
  time: string;
  comfort: number;
  kwh: number;
  airflow: number;
  compressor: number;
  stability: number;
  occupancy: number;
};

export type SimulationScenario =
  | "occupancy-surge"
  | "heatwave"
  | "empty-building"
  | "conference-event"
  | "humidity-spike"
  | "hvac-stress";

export type IntelligenceEvent = {
  id: string;
  label: string;
  detail: string;
  impact: string;
  confidence: number;
  severity: "info" | "optimization" | "guardrail";
  category: "occupancy" | "airflow" | "humidity" | "thermal" | "energy" | "compressor";
  timestamp: number;
};

export type ComfortDecisionType =
  | "increase-airflow"
  | "redirect-cooling"
  | "preempt-overheat"
  | "balance-humidity"
  | "hold-setpoint"
  | "avoid-compressor-spike"
  | "reduce-cooling-waste";

export type ComfortAIDecision = {
  id: string;
  type: ComfortDecisionType;
  target: string;
  title: string;
  reasoning: string;
  action: string;
  expectedImpact: string;
  confidence: number;
  priority: "low" | "medium" | "high";
};

export type ComfortZonePrediction = {
  zoneId: string;
  zoneName: string;
  occupancyForecast: number;
  discomfortRisk: number;
  airflowNeed: number;
  humidityRisk: number;
  stabilityRisk: number;
  coolingWasteRisk: number;
  recommendedBias: number;
};

export type ComfortIntelligence = {
  mode: "airflow-first" | "stability-guard" | "humidity-balance" | "energy-coast";
  perceivedComfort: number;
  occupancyPrediction: number;
  discomfortPrediction: number;
  airflowOptimization: number;
  humidityBalance: number;
  stabilityOptimization: number;
  energyOptimization: number;
  coolingWasteReduction: number;
  compressorSpikeAvoidance: number;
  setpointDiscipline: number;
  decisions: ComfortAIDecision[];
  zonePredictions: ComfortZonePrediction[];
};

export type ComfortPerKwhPoint = {
  label: string;
  traditional: number;
  thermaMind: number;
  avoidedWaste: number;
};

export type ComfortPerKwhOptimization = {
  score: number;
  comfortScore: number;
  energyEfficiency: number;
  airflowEffectiveness: number;
  coolingWasteReduction: number;
  thermalStabilityScore: number;
  carbonReductionEstimate: number;
  traditionalEfficiency: number;
  thermaMindEfficiency: number;
  avoidedCompressorUsage: number;
  optimizedAirflowPerformance: number;
  avoidedEnergyWaste: number;
  comfortDeliveryGain: number;
  trend: ComfortPerKwhPoint[];
};

export type ExplainableFactor = {
  label: string;
  weight: number;
  reasoning: string;
  direction: "comfort" | "energy" | "risk";
};

export type BuildingSnapshot = {
  timestamp: number;
  comfortScore: number;
  comfortPerKwh: number;
  energyLoad: number;
  predictedPeakMinutes: number;
  compressorSpikeRisk: number;
  thermalInertia: number;
  airflowBalance: number;
  stabilityScore: number;
  adaptiveSetpoint: number;
  avoidedKwh: number;
  predictedOccupancySurge: number;
  aiConfidence: number;
  occupancy: number;
  zones: BuildingZone[];
  twinRooms: TwinRoom[];
  trend: TrendPoint[];
  events: IntelligenceEvent[];
  explainability: ExplainableFactor[];
  thermalIntelligence: ThermalInertiaIntelligence;
  comfortIntelligence: ComfortIntelligence;
  comfortPerKwhOptimization: ComfortPerKwhOptimization;
};
