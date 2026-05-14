export type ZoneType = "storage" | "packaging" | "cold_storage";

export type AlertSeverity = "info" | "warning" | "critical";

export type ScheduleMode = "full_load" | "standby" | "eco";

export type FanSpeedMode = "low" | "balanced" | "industrial" | "peak";

export interface Zone {
  id: number;
  name: string;
  type: ZoneType | string;
  capacity: number;
  targetTemp: number;
  targetHum: number;
  fanSpeed: number;
}

export interface SensorReading {
  id: number;
  zoneId: number;
  zoneName: string;
  temperature: number;
  humidity: number;
  co2: number;
  occupancy: number;
  airflow: number;
  timestamp: Date;
}

export interface SensorReadingInput {
  zoneId: number;
  temperature: number;
  humidity: number;
  co2: number;
  occupancy: number;
  airflow: number;
  timestamp?: Date;
}

export interface SystemStatus {
  id: number;
  efficiency: number;
  load: number;
  coolingScore: number;
  carbonSaved: number;
  fanSpeed: number;
  compressorEff: number;
  timestamp: Date;
}

export interface Alert {
  id: number;
  zoneId: number;
  zoneName: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  isAcked: boolean;
  createdAt: Date;
  acknowledgedAt?: Date | null;
}

export interface Schedule {
  id: number;
  zoneId: number;
  zoneName: string;
  name: string;
  startTime: string;
  duration: number;
  targetTemp: number;
  targetHum: number;
  mode: ScheduleMode | string;
  isActive: boolean;
  createdAt: Date;
}

export interface ScheduleInput {
  zoneId: number;
  name: string;
  startTime: string;
  duration: number;
  targetTemp: number;
  targetHum: number;
  mode: ScheduleMode | string;
  isActive?: boolean;
}

export interface AIRecommendation {
  id: number;
  zoneId?: number | null;
  type: string;
  message: string;
  confidence: number;
  savings: number;
  co2Trend: string;
  applied: boolean;
  createdAt: Date;
}

export interface EnergyLog {
  id: number;
  hvacLoad: number;
  optimizedLoad: number;
  savingsPercent: number;
  carbonReduced: number;
  timestamp: Date;
}

export interface DemandPrediction {
  predictedLoadKw: number;
  optimalLoadKw: number;
  savings: number;
}

export interface OccupancyPrediction {
  predictions: number[];
  confidence: number;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  type: string;
  severity: AlertSeverity;
  message: string;
}

export interface HvacOptimization {
  action: string;
  newSetpoint: number;
  fanSpeed: number;
  predictedSavings: number;
  efficiencyScore: number;
}
