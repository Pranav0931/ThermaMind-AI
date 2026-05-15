import { Platform } from 'react-native';
import { io } from 'socket.io-client';

declare const process: { env?: { EXPO_PUBLIC_API_URL?: string } };

const DEFAULT_SERVER_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
export const SERVER_URL = process.env?.EXPO_PUBLIC_API_URL ?? DEFAULT_SERVER_URL;

export interface SensorReading {
  id: number;
  zoneId: number;
  zoneName: string;
  temperature: number;
  humidity: number;
  co2: number;
  occupancy: number;
  airflow: number;
  timestamp: string;
}

export interface Alert {
  id: number;
  zoneId: number;
  zoneName: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  isAcked: boolean;
  createdAt: string;
}

export interface EnergyStats {
  currentLoad: number;
  efficiency: number;
  coolingScore: number;
  carbonSaved: number;
  fanSpeed: number;
  compressorEff: number;
  averageSavingsPercent: number;
  optimizationStatus: string;
  timestamp: string;
}

export interface EnergyLog {
  id: number;
  hvacLoad: number;
  optimizedLoad: number;
  savingsPercent: number;
  carbonReduced: number;
  timestamp: string;
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
  mode: 'full_load' | 'standby' | 'eco' | string;
  isActive: boolean;
  createdAt: string;
}

export interface Recommendation {
  id?: number;
  zoneId?: number;
  type: string;
  message: string;
  confidence: number;
  savings: number;
  co2Trend: string;
  applied?: boolean;
  createdAt?: string;
}

export interface HvacOptimization {
  action: string;
  newSetpoint: number;
  fanSpeed: number;
  predictedSavings: number;
  efficiencyScore: number;
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
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface DashboardAIResult {
  zoneId: number;
  reading: SensorReading;
  occupancy: OccupancyPrediction;
  demand: DemandPrediction;
  anomaly: AnomalyResult;
  optimization: HvacOptimization;
  recommendation: Recommendation;
  energy?: {
    efficiency: number;
    load: number;
    coolingScore: number;
    carbonSaved: number;
    fanSpeed: number;
    compressorEff: number;
    timestamp: string;
  };
}

export interface SchedulePolicyResult {
  policyUpdated: boolean;
  trainingSamples: number;
  optimization: HvacOptimization;
}

export interface SimulationResult {
  zoneId: number;
  horizonHours: number;
  projectedLoadKw: number;
  projectedSavingsPercent: number;
  projectedCarbonReductionKg: number;
  recommendation: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${SERVER_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message ?? payload?.error ?? `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return payload.data ?? payload;
}

export function getApi<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function postApi<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

export function putApi<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteApi(path: string): Promise<void> {
  await request(path, { method: 'DELETE' });
}

export function createRealtimeSocket() {
  return io(SERVER_URL, {
    transports: ['websocket', 'polling'],
  });
}

export const fallbackEnergyStats: EnergyStats = {
  currentLoad: 10.8,
  efficiency: 98,
  coolingScore: 98.2,
  carbonSaved: 2.4,
  fanSpeed: 65,
  compressorEff: 94,
  averageSavingsPercent: 24,
  optimizationStatus: 'active',
  timestamp: new Date().toISOString(),
};

export const fallbackReadings: SensorReading[] = [
  {
    id: 1,
    zoneId: 1,
    zoneName: 'Storage Zone A',
    temperature: 22.4,
    humidity: 48,
    co2: 410,
    occupancy: 12,
    airflow: 65,
    timestamp: new Date().toISOString(),
  },
  {
    id: 2,
    zoneId: 2,
    zoneName: 'Packaging Section',
    temperature: 21.8,
    humidity: 43,
    co2: 395,
    occupancy: 18,
    airflow: 72,
    timestamp: new Date().toISOString(),
  },
  {
    id: 3,
    zoneId: 3,
    zoneName: 'Cold Storage Unit',
    temperature: 20.5,
    humidity: 39,
    co2: 380,
    occupancy: 4,
    airflow: 58,
    timestamp: new Date().toISOString(),
  },
];
