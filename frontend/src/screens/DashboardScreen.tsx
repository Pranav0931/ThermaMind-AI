import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, TextInput, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AmbientGlow from '../components/AmbientGlow';
import {
  Alert,
  DashboardAIResult,
  EnergyStats,
  SensorReading,
  createRealtimeSocket,
  fallbackEnergyStats,
  fallbackReadings,
  getApi,
  postApi,
} from '../services/thermamindApi';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [pulse, setPulse] = useState(true);
  const [readings, setReadings] = useState<SensorReading[]>(fallbackReadings);
  const [energyStats, setEnergyStats] = useState<EnergyStats>(fallbackEnergyStats);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [airflowHistory, setAirflowHistory] = useState<number[]>([48, 80, 96, 64, 112, 72, 88]);
  const [inputZoneId, setInputZoneId] = useState(1);
  const [manualInput, setManualInput] = useState({
    occupancy: '12',
    temperature: '22.4',
    humidity: '48',
    co2: '410',
  });
  const [aiResult, setAiResult] = useState<DashboardAIResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const activeAlert = alerts[0];
  const zones = readings.length > 0 ? readings : fallbackReadings;
  const primary = zones[0] ?? fallbackReadings[0];
  const secondary = zones[1] ?? fallbackReadings[1];
  const tertiary = zones[2] ?? fallbackReadings[2];
  const systemStable = energyStats.efficiency >= 90 && !alerts.some(alert => alert.severity === 'critical');
  const airflowBars = useMemo(() => airflowHistory.slice(-7), [airflowHistory]);
  const selectedZone = zones.find(zone => zone.zoneId === inputZoneId) ?? primary;
  const aiRecommendation = aiResult?.recommendation.message;

  function updateManualInput(key: keyof typeof manualInput, value: string) {
    setManualInput(current => ({ ...current, [key]: value }));
  }

  function fillFromLiveReading(zone: SensorReading = selectedZone) {
    setInputZoneId(zone.zoneId);
    setManualInput({
      occupancy: String(zone.occupancy),
      temperature: zone.temperature.toFixed(1),
      humidity: String(Math.round(zone.humidity)),
      co2: String(Math.round(zone.co2)),
    });
  }

  async function runAiEvaluation() {
    setIsEvaluating(true);
    try {
      const result = await postApi<DashboardAIResult>('/api/ai/evaluate', {
        zoneId: inputZoneId,
        occupancy: Number(manualInput.occupancy),
        temperature: Number(manualInput.temperature),
        humidity: Number(manualInput.humidity),
        co2: Number(manualInput.co2),
        airflow: selectedZone.airflow,
      });
      setAiResult(result);
      setReadings(current => {
        const next = current.filter(reading => reading.zoneId !== result.reading.zoneId);
        return [result.reading, ...next].sort((a, b) => a.zoneId - b.zoneId);
      });
      setAirflowHistory(history => [...history.slice(-6), Math.max(24, Math.min(120, result.optimization.fanSpeed * 1.25))]);
      if (result.energy) {
        setEnergyStats(current => ({
          ...current,
          currentLoad: result.energy?.load ?? current.currentLoad,
          efficiency: result.energy?.efficiency ?? current.efficiency,
          coolingScore: result.energy?.coolingScore ?? current.coolingScore,
          carbonSaved: result.energy?.carbonSaved ?? current.carbonSaved,
          fanSpeed: result.optimization.fanSpeed,
          compressorEff: result.energy?.compressorEff ?? current.compressorEff,
          timestamp: result.energy?.timestamp ?? current.timestamp,
        }));
      }
    } catch {
      setAiResult(null);
    } finally {
      setIsEvaluating(false);
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 1000);

    let mounted = true;

    async function loadInitialData() {
      try {
        const [latestReadings, activeAlerts, stats, history] = await Promise.all([
          getApi<SensorReading[]>('/api/sensors'),
          getApi<Alert[]>('/api/alerts'),
          getApi<EnergyStats>('/api/energy/stats'),
          getApi<SensorReading[]>(`/api/sensors/${primary.zoneId}/history?limit=7`),
        ]);

        if (!mounted) {
          return;
        }

        setReadings(latestReadings.length ? latestReadings : fallbackReadings);
        setAlerts(activeAlerts);
        setEnergyStats(stats);
        setAirflowHistory(history.map(item => Math.max(24, Math.min(120, item.airflow * 1.25))));
      } catch {
        if (mounted) {
          setReadings(fallbackReadings);
          setEnergyStats(fallbackEnergyStats);
        }
      }
    }

    void loadInitialData();

    const socket = createRealtimeSocket();
    socket.on('sensor_update', (payload: { data?: SensorReading[] }) => {
      if (payload.data?.length) {
        setReadings(payload.data);
        setAirflowHistory(history => [...history.slice(-6), Math.max(24, Math.min(120, payload.data![0].airflow * 1.25))]);
      }
    });
    socket.on('system_status', (status: Partial<EnergyStats> & { load?: number }) => {
      setEnergyStats(current => ({
        ...current,
        efficiency: status.efficiency ?? current.efficiency,
        currentLoad: status.load ?? current.currentLoad,
        coolingScore: status.coolingScore ?? current.coolingScore,
        carbonSaved: status.carbonSaved ?? current.carbonSaved,
        fanSpeed: status.fanSpeed ?? current.fanSpeed,
        compressorEff: status.compressorEff ?? current.compressorEff,
        timestamp: status.timestamp ?? current.timestamp,
      }));
    });
    socket.on('energy_update', (stats: Partial<EnergyStats>) => {
      setEnergyStats(current => ({
        ...current,
        ...stats,
        currentLoad: stats.currentLoad ?? current.currentLoad,
      }));
    });
    socket.on('alert_triggered', (alert: Alert) => {
      setAlerts(current => [alert, ...current.filter(item => item.id !== alert.id)].slice(0, 5));
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      socket.disconnect();
    };
  }, [primary.zoneId]);

  return (
    <View style={styles.container}>
      <AmbientGlow color="#2fd9f4" size={320} top={-80} left={-80} />
      <AmbientGlow color="#4edea3" size={384} top={300} right={-160} />
      
      {/* Header */}
      <BlurView intensity={30} tint="dark" style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.headerLeft}>
          <MaterialIcons name="blur-on" size={24} color="#8aebff" />
          <Text style={styles.headerTitle}>ThermaMind AI</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileBtn}>
          <MaterialIcons name="account-circle" size={24} color="#bbc9cd" />
        </TouchableOpacity>
      </BlurView>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Warehouse Operations</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { opacity: pulse ? 1 : 0.4 }]} />
            <Text style={styles.statusText}>
              System Status: <Text style={styles.statusTextHighlight}>{systemStable ? 'Stable Operations' : 'Attention Required'}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.aiInputPanel}>
          <View style={styles.aiInputHeader}>
            <View>
              <Text style={styles.cardLabel}>AI MODEL INPUT</Text>
              <Text style={styles.cardTitle}>Live Scenario</Text>
            </View>
            <TouchableOpacity style={styles.syncBtn} onPress={() => fillFromLiveReading()}>
              <MaterialIcons name="sync" size={18} color="#8aebff" />
              <Text style={styles.syncBtnText}>Live</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.zoneSelector}>
            {zones.map(zone => (
              <TouchableOpacity
                key={zone.zoneId}
                style={[styles.zoneChip, inputZoneId === zone.zoneId && styles.zoneChipActive]}
                onPress={() => fillFromLiveReading(zone)}
              >
                <Text style={[styles.zoneChipText, inputZoneId === zone.zoneId && styles.zoneChipTextActive]}>{zone.zoneName}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputGrid}>
            {[
              ['occupancy', 'Occupancy'],
              ['temperature', 'Temp C'],
              ['humidity', 'Humidity %'],
              ['co2', 'CO2 ppm'],
            ].map(([key, label]) => (
              <View key={key} style={styles.inputBox}>
                <Text style={styles.inputLabel}>{label}</Text>
                <TextInput
                  value={manualInput[key as keyof typeof manualInput]}
                  onChangeText={value => updateManualInput(key as keyof typeof manualInput, value)}
                  keyboardType="numeric"
                  style={styles.textInput}
                  placeholderTextColor="rgba(187, 201, 205, 0.45)"
                />
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.evaluateBtn} onPress={runAiEvaluation} disabled={isEvaluating}>
            <LinearGradient colors={['#8aebff', '#4edea3']} style={styles.evaluateBtnGradient}>
              {isEvaluating ? <ActivityIndicator color="#00363e" /> : <Text style={styles.evaluateBtnText}>Run AI Models</Text>}
            </LinearGradient>
          </TouchableOpacity>

          {aiResult && (
            <View style={styles.aiResultPanel}>
              <View style={styles.aiResultRow}>
                <View style={styles.aiResultCell}>
                  <Text style={styles.aiResultLabel}>RL Action</Text>
                  <Text style={styles.aiResultValue}>{aiResult.optimization.action.replace('_', ' ')}</Text>
                </View>
                <View style={styles.aiResultCell}>
                  <Text style={styles.aiResultLabel}>Airflow</Text>
                  <Text style={styles.aiResultValue}>{aiResult.optimization.fanSpeed}%</Text>
                </View>
              </View>
              <View style={styles.aiResultRow}>
                <View style={styles.aiResultCell}>
                  <Text style={styles.aiResultLabel}>Load</Text>
                  <Text style={styles.aiResultValue}>{aiResult.demand.predictedLoadKw} kW</Text>
                </View>
                <View style={styles.aiResultCell}>
                  <Text style={styles.aiResultLabel}>Savings</Text>
                  <Text style={styles.aiResultValue}>{aiResult.demand.savings}%</Text>
                </View>
              </View>
              <Text style={styles.aiResultMessage}>{aiResult.recommendation.message}</Text>
            </View>
          )}

        </View>

        {/* Zonal Cards */}
        {/* Card 1 */}
        <View style={styles.glassCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardLabel}>ACTIVE ZONE</Text>
              <Text style={styles.cardTitle}>{primary.zoneName}</Text>
              <View style={styles.cardSubStatus}>
                <MaterialIcons name="ac-unit" size={16} color="#4edea3" />
                <Text style={styles.cardSubStatusText}>{energyStats.efficiency >= 90 ? 'Cooling Efficiency Stable' : 'Efficiency Drift Detected'}</Text>
              </View>
            </View>
            <View style={styles.tempContainer}>
              <View style={styles.tempRow}>
                <MaterialIcons name="trending-down" size={20} color="#4edea3" />
                <Text style={styles.tempText}>{primary.temperature.toFixed(1)}°</Text>
              </View>
              <Text style={styles.tempUnit}>Celsius</Text>
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Humidity</Text>
              <Text style={styles.statValue}>{Math.round(primary.humidity)}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Cooling Efficiency</Text>
              <Text style={styles.statValue}>{Math.round(energyStats.efficiency)}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Occupancy</Text>
              <Text style={styles.statValue}>{primary.occupancy}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <MaterialIcons name="bolt" size={16} color="#8aebff" />
              <Text style={styles.metricText}>{energyStats.currentLoad.toFixed(1)} kW</Text>
            </View>
            <View style={styles.metricItem}>
              <MaterialIcons name="co2" size={16} color="#8aebff" />
              <Text style={styles.metricText}>{Math.round(primary.co2)} ppm</Text>
            </View>
          </View>

          <View style={styles.alertBox}>
            <MaterialIcons name="auto-awesome" size={20} color="#4edea3" />
            <Text style={styles.alertText}>{aiRecommendation ?? activeAlert?.message ?? `${primary.zoneName} is operating inside target climate bands.`}</Text>
          </View>
        </View>

        {/* Card 2 */}
        <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} style={[styles.glassCard, { marginTop: 24 }]}>
          <View style={styles.card2Header}>
            <Text style={styles.cardTitle}>{secondary.zoneName}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Key Win!</Text>
            </View>
          </View>
          
          <View style={styles.card2Body}>
            <View style={styles.card2Left}>
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="bolt" size={24} color="#4edea3" />
                </View>
                <View>
                  <Text style={styles.infoLabel}>Cooling Mode</Text>
                  <Text style={styles.infoValue}>Optimized</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="air" size={24} color="#8aebff" />
                </View>
                <View>
                  <Text style={styles.infoLabel}>Airflow Distribution</Text>
                  <Text style={styles.infoValue}>Stable</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.card2Right}>
              <View style={styles.tempRow}>
                <MaterialIcons name="trending-flat" size={24} color="#8aebff" />
                <Text style={styles.largeTemp}>{secondary.temperature.toFixed(1)}°</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '75%' }]} />
              </View>
            </View>
          </View>
          
          <View style={[styles.metricsRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }]}>
            <View style={styles.metricItem}>
              <MaterialIcons name="bolt" size={16} color="#4edea3" />
              <Text style={styles.metricText}>{Math.max(0, energyStats.currentLoad * 0.42).toFixed(1)} kW</Text>
            </View>
            <View style={styles.metricItem}>
              <MaterialIcons name="co2" size={16} color="#4edea3" />
              <Text style={styles.metricText}>{Math.round(secondary.co2)} ppm</Text>
            </View>
          </View>

          <View style={styles.noteLine}>
            <Text style={styles.noteText}>Cooling adjusted from live occupancy and airflow telemetry.</Text>
          </View>
        </LinearGradient>

        {/* Card 3 */}
        <View style={[styles.glassCard, { marginTop: 24 }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>{tertiary.zoneName}</Text>
              <Text style={styles.statusTextLight}>Status: <Text style={styles.statusTextWhite}>{tertiary.occupancy <= 6 ? 'Low Activity' : 'Active'}</Text></Text>
            </View>
            <View style={styles.tempContainer}>
              <View style={styles.tempRow}>
                <MaterialIcons name="trending-up" size={18} color="rgba(187, 201, 205, 0.4)" />
                <Text style={styles.mutedTemp}>{tertiary.temperature.toFixed(1)}°</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.splitRow}>
            <View style={styles.splitBox}>
              <Text style={styles.splitBoxLabel}>Occupancy</Text>
              <Text style={styles.splitBoxValue}>{tertiary.occupancy}</Text>
            </View>
            <View style={styles.splitBox}>
              <Text style={styles.splitBoxLabel}>Cooling Score</Text>
              <Text style={styles.splitBoxValue}>{Math.round(energyStats.coolingScore)}</Text>
            </View>
          </View>
        </View>

        {/* Airflow Distribution Graph */}
        <View style={[styles.glassCard, { marginTop: 24, paddingBottom: 20 }]}>
          <Text style={styles.cardTitle}>Airflow Distribution</Text>
          <View style={styles.graphContainer}>
            {airflowBars.map((height, index) => (
              <LinearGradient
                key={`${height}-${index}`}
                colors={[index % 2 === 0 ? 'rgba(78, 222, 163, 0.55)' : 'rgba(138, 235, 255, 0.45)', 'transparent']}
                style={[styles.bar, { height }]}
              />
            ))}
          </View>
          <View style={styles.graphLabels}>
            <Text style={styles.graphLabelMuted}>08:00</Text>
            <Text style={styles.graphLabelActive}>Realtime Monitoring</Text>
            <Text style={styles.graphLabelMuted}>20:00</Text>
          </View>
        </View>

      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab}>
        <LinearGradient colors={['#8aebff', '#4edea3']} style={styles.fabGradient}>
          <MaterialIcons name="add" size={24} color="#00363e" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05080A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: '#8aebff', // gradient text alternative
  },
  profileBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 24,
  },
  titleSection: {
    marginBottom: 24,
    gap: 4,
  },
  aiInputPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(138, 235, 255, 0.18)',
    marginBottom: 24,
    gap: 16,
  },
  aiInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(138, 235, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(138, 235, 255, 0.25)',
  },
  syncBtnText: {
    color: '#8aebff',
    fontSize: 13,
    fontWeight: '700',
  },
  zoneSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  zoneChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  zoneChipActive: {
    backgroundColor: 'rgba(78, 222, 163, 0.15)',
    borderColor: 'rgba(78, 222, 163, 0.4)',
  },
  zoneChipText: {
    color: '#bbc9cd',
    fontSize: 12,
    fontWeight: '600',
  },
  zoneChipTextActive: {
    color: '#4edea3',
  },
  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  inputBox: {
    flexGrow: 1,
    flexBasis: width > 520 ? '23%' : '47%',
    backgroundColor: 'rgba(0,0,0,0.24)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
  },
  inputLabel: {
    color: '#bbc9cd',
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  textInput: {
    color: '#e0e3e6',
    fontSize: 18,
    fontWeight: '700',
    padding: 0,
  },
  evaluateBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  evaluateBtnGradient: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evaluateBtnText: {
    color: '#00363e',
    fontSize: 15,
    fontWeight: '800',
  },
  aiResultPanel: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 14,
    gap: 10,
  },
  aiResultRow: {
    flexDirection: 'row',
    gap: 10,
  },
  aiResultCell: {
    flex: 1,
    backgroundColor: 'rgba(78, 222, 163, 0.08)',
    borderRadius: 12,
    padding: 12,
  },
  aiResultLabel: {
    color: '#bbc9cd',
    fontSize: 12,
    marginBottom: 4,
  },
  aiResultValue: {
    color: '#e0e3e6',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  aiResultMessage: {
    color: '#8aebff',
    fontSize: 14,
    lineHeight: 20,
  },
  mainTitle: {
    fontSize: 40,
    fontWeight: '300',
    color: '#e0e3e6',
    letterSpacing: -0.8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4edea3',
  },
  statusText: {
    fontSize: 16,
    color: '#bbc9cd',
  },
  statusTextHighlight: {
    color: '#4edea3',
    fontWeight: '600',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLabel: {
    fontSize: 14,
    color: 'rgba(138, 235, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 24,
    color: '#e0e3e6',
    fontWeight: '500',
    marginTop: 4,
  },
  cardSubStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  cardSubStatusText: {
    fontSize: 14,
    color: '#4edea3',
    fontWeight: '600',
  },
  tempContainer: {
    alignItems: 'flex-end',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tempText: {
    fontSize: 48,
    fontWeight: '300',
    color: '#8aebff',
    lineHeight: 48,
  },
  tempUnit: {
    fontSize: 14,
    color: '#bbc9cd',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  statItem: {
    gap: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#bbc9cd',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    color: '#e0e3e6',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricText: {
    fontSize: 14,
    color: '#bbc9cd',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(78, 222, 163, 0.1)',
    borderRadius: 16,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(78, 222, 163, 0.2)',
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: '#00a572',
    fontStyle: 'italic',
  },
  card2Header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(138, 235, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: {
    color: '#a2eeff',
    fontSize: 14,
    fontWeight: '600',
  },
  card2Body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  card2Left: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#bbc9cd',
  },
  infoValue: {
    fontSize: 16,
    color: '#e0e3e6',
  },
  card2Right: {
    alignItems: 'flex-end',
  },
  largeTemp: {
    fontSize: 56,
    fontWeight: '200',
    color: '#e0e3e6',
    lineHeight: 56,
  },
  progressBarBg: {
    height: 4,
    width: 48,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8aebff',
  },
  noteLine: {
    marginTop: 16,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(138, 235, 255, 0.3)',
    paddingLeft: 12,
  },
  noteText: {
    fontSize: 14,
    color: 'rgba(138, 235, 255, 0.8)',
    fontStyle: 'italic',
  },
  statusTextLight: {
    fontSize: 14,
    color: '#bbc9cd',
    marginTop: 4,
  },
  statusTextWhite: {
    color: '#e0e3e6',
  },
  mutedTemp: {
    fontSize: 40,
    fontWeight: '300',
    color: 'rgba(187, 201, 205, 0.5)',
    lineHeight: 40,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  splitBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  splitBoxLabel: {
    fontSize: 14,
    color: '#bbc9cd',
    marginBottom: 4,
  },
  splitBoxValue: {
    fontSize: 18,
    color: '#e0e3e6',
  },
  graphContainer: {
    height: 128,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 16,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  graphLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  graphLabelMuted: {
    fontSize: 14,
    color: '#bbc9cd',
  },
  graphLabelActive: {
    fontSize: 14,
    color: '#4edea3',
  },
  fab: {
    position: 'absolute',
    bottom: 128,
    right: 24,
    zIndex: 40,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
