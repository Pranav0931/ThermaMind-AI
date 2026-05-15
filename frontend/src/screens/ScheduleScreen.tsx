import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AmbientGlow from '../components/AmbientGlow';
import Slider from '@react-native-community/slider';
import {
  Schedule,
  SchedulePolicyResult,
  SimulationResult,
  deleteApi,
  getApi,
  postApi,
} from '../services/thermamindApi';

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const [temperature, setTemperature] = useState(22);
  const [humidity, setHumidity] = useState(45);
  const [zoneId, setZoneId] = useState(1);
  const [profileName, setProfileName] = useState('Custom Shift Profile');
  const [startTime, setStartTime] = useState('06:00');
  const [duration, setDuration] = useState('8');
  const [mode, setMode] = useState<'full_load' | 'standby' | 'eco'>('full_load');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [policyResult, setPolicyResult] = useState<SchedulePolicyResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSchedules() {
      try {
        const data = await getApi<Schedule[]>('/api/schedules');
        if (mounted) {
          setSchedules(data);
          if (data[0]) {
            setTemperature(data[0].targetTemp);
            setHumidity(data[0].targetHum);
            setZoneId(data[0].zoneId);
            setProfileName(data[0].name);
            setStartTime(data[0].startTime);
            setDuration(String(data[0].duration));
            setMode(data[0].mode === 'standby' || data[0].mode === 'eco' ? data[0].mode : 'full_load');
          }
        }
      } catch {
        if (mounted) {
          setSchedules([]);
        }
      }
    }

    void loadSchedules();

    return () => {
      mounted = false;
    };
  }, []);

  function schedulePayload(overrides?: Partial<{ targetTemp: number; targetHum: number }>) {
    return {
      zoneId,
      name: profileName.trim() || 'Custom Shift Profile',
      startTime,
      duration: Math.max(1, Math.min(24, Number(duration) || 8)),
      targetTemp: Number((overrides?.targetTemp ?? temperature).toFixed(1)),
      targetHum: Math.round(overrides?.targetHum ?? humidity),
      mode,
      isActive: true,
    };
  }

  async function runPolicyOptimization(overrides?: Partial<{ targetTemp: number; targetHum: number }>) {
    setIsOptimizing(true);
    try {
      const result = await postApi<SchedulePolicyResult>('/api/ai/schedule/optimize', schedulePayload(overrides));
      setPolicyResult(result);
      return result;
    } catch {
      setPolicyResult(null);
      return null;
    } finally {
      setIsOptimizing(false);
    }
  }

  async function saveProfile() {
    const payload = schedulePayload();
    const created = await postApi<Schedule>('/api/schedules', payload);
    setSchedules(current => [created, ...current.filter(item => item.id !== created.id)]);
    await runPolicyOptimization();
  }

  async function removeSchedule(id: number) {
    await deleteApi(`/api/schedules/${id}`);
    setSchedules(current => current.filter(item => item.id !== id));
  }

  async function runSimulation() {
    const result = await postApi<SimulationResult>('/api/ai/simulate', {
      zoneId,
      targetTemp: Number(temperature.toFixed(1)),
      targetHum: Math.round(humidity),
      horizonHours: 24,
    });
    setSimulation(result);
    await runPolicyOptimization();
  }

  return (
    <View style={styles.container}>
      <AmbientGlow color="#8aebff" size={500} top={-150} right={-100} />
      
      {/* Header */}
      <BlurView intensity={30} tint="dark" style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="blur-on" size={24} color="#8aebff" />
          <Text style={styles.headerTitle}>ThermaMind AI</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn}>
          <MaterialIcons name="account-circle" size={24} color="#bbc9cd" />
        </TouchableOpacity>
      </BlurView>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>Scheduling & Automation</Text>
        </View>

        {/* Global Settings */}
        <View style={styles.glassPanel}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Custom Schedule Profile</Text>
              <Text style={styles.cardSubtitle}>RL-trained schedule controls</Text>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGrid}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Profile Name</Text>
              <TextInput value={profileName} onChangeText={setProfileName} style={styles.textInput} placeholderTextColor="rgba(187, 201, 205, 0.45)" />
            </View>
            <View style={styles.formRow}>
              <View style={[styles.inputGroup, styles.smallInput]}>
                <Text style={styles.inputLabel}>Start</Text>
                <TextInput value={startTime} onChangeText={setStartTime} style={styles.textInput} placeholder="06:00" placeholderTextColor="rgba(187, 201, 205, 0.45)" />
              </View>
              <View style={[styles.inputGroup, styles.smallInput]}>
                <Text style={styles.inputLabel}>Hours</Text>
                <TextInput value={duration} onChangeText={setDuration} keyboardType="numeric" style={styles.textInput} placeholderTextColor="rgba(187, 201, 205, 0.45)" />
              </View>
            </View>
          </View>

          <View style={styles.pillRow}>
            {[1, 2, 3].map(item => (
              <TouchableOpacity key={item} style={[styles.pill, zoneId === item && styles.pillActive]} onPress={() => setZoneId(item)}>
                <Text style={[styles.pillText, zoneId === item && styles.pillTextActive]}>Zone {item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.pillRow}>
            {(['full_load', 'standby', 'eco'] as const).map(item => (
              <TouchableOpacity key={item} style={[styles.pill, mode === item && styles.pillActive]} onPress={() => setMode(item)}>
                <Text style={[styles.pillText, mode === item && styles.pillTextActive]}>{item.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Temperature Slider */}
          <View style={styles.sliderSection}>
            <View style={styles.sliderHeader}>
              <MaterialIcons name="thermostat" size={24} color="#8aebff" />
              <Text style={styles.sliderLabel}>Target Temperature</Text>
              <Text style={[styles.sliderValue, { color: '#8aebff' }]}>{temperature.toFixed(1)}°C</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={16}
              maximumValue={30}
              value={temperature}
              onValueChange={setTemperature}
              onSlidingComplete={value => void runPolicyOptimization({ targetTemp: value })}
              minimumTrackTintColor="#8aebff"
              maximumTrackTintColor="rgba(255,255,255,0.1)"
              thumbTintColor="#8aebff"
            />
          </View>

          {/* Humidity Slider */}
          <View style={styles.sliderSection}>
            <View style={styles.sliderHeader}>
              <MaterialIcons name="water-drop" size={24} color="#4edea3" />
              <Text style={styles.sliderLabel}>Target Humidity</Text>
              <Text style={[styles.sliderValue, { color: '#4edea3' }]}>{Math.round(humidity)}%</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={30}
              maximumValue={60}
              value={humidity}
              onValueChange={setHumidity}
              onSlidingComplete={value => void runPolicyOptimization({ targetHum: value })}
              minimumTrackTintColor="#4edea3"
              maximumTrackTintColor="rgba(255,255,255,0.1)"
              thumbTintColor="#4edea3"
            />
          </View>

          <View style={styles.policyPanel}>
            <View style={styles.policyHeader}>
              <Text style={styles.policyTitle}>RL HVAC Output</Text>
              {isOptimizing && <ActivityIndicator color="#8aebff" />}
            </View>
            {policyResult ? (
              <>
                <View style={styles.policyGrid}>
                  <View style={styles.policyMetric}>
                    <Text style={styles.policyLabel}>Action</Text>
                    <Text style={styles.policyValue}>{policyResult.optimization.action.replace('_', ' ')}</Text>
                  </View>
                  <View style={styles.policyMetric}>
                    <Text style={styles.policyLabel}>Airflow</Text>
                    <Text style={styles.policyValue}>{policyResult.optimization.fanSpeed}%</Text>
                  </View>
                  <View style={styles.policyMetric}>
                    <Text style={styles.policyLabel}>Setpoint</Text>
                    <Text style={styles.policyValue}>{policyResult.optimization.newSetpoint}C</Text>
                  </View>
                  <View style={styles.policyMetric}>
                    <Text style={styles.policyLabel}>Savings</Text>
                    <Text style={styles.policyValue}>{policyResult.optimization.predictedSavings}%</Text>
                  </View>
                </View>
                <Text style={styles.trainingText}>
                  {policyResult.policyUpdated ? `${policyResult.trainingSamples} schedule samples applied to the RL policy.` : 'Local optimizer fallback used for this profile.'}
                </Text>
              </>
            ) : (
              <Text style={styles.trainingText}>Move a target or save a profile to generate the AI control output.</Text>
            )}
          </View>
        </View>

        {/* Predictive Timeline */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Daily Schedule</Text>

          {schedules.map((schedule, index) => {
            const active = schedule.isActive && index === 0;
            return (
              <View key={schedule.id} style={styles.timelineEvent}>
                <View style={styles.timelineLeft}>
                  <Text style={styles.timeText}>{schedule.startTime}</Text>
                  <Text style={styles.durationText}>{schedule.duration} hrs</Text>
                </View>
                <View style={styles.timelineCenter}>
                  <View style={[styles.timelineNode, { borderColor: active ? '#8aebff' : '#bbc9cd', backgroundColor: active ? 'rgba(138, 235, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)' }]} />
                  <View style={[styles.timelineLine, { backgroundColor: active ? '#8aebff' : 'rgba(255, 255, 255, 0.1)' }]} />
                </View>
                <View style={[styles.timelineCard, active ? styles.glowCard : undefined, { borderColor: active ? 'rgba(138, 235, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)' }]}>
                  <View style={styles.timelineCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timelineCardTitle}>{schedule.name}</Text>
                      <Text style={styles.timelineCardSubtitle}>{schedule.zoneName}</Text>
                    </View>
                    <TouchableOpacity style={[styles.statusBadge, { backgroundColor: active ? 'rgba(138, 235, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)' }]} onPress={() => removeSchedule(schedule.id)}>
                      <Text style={[styles.statusBadgeText, { color: active ? '#8aebff' : '#bbc9cd' }]}>{active ? 'ACTIVE' : 'REMOVE'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.timelineCardBody}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Mode</Text>
                      <Text style={styles.infoValue}>{schedule.mode.replace('_', ' ')}</Text>
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Target</Text>
                      <Text style={styles.infoValue}>{schedule.targetTemp.toFixed(1)}°C / {Math.round(schedule.targetHum)}%</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
          
          <TouchableOpacity style={styles.addEventBtn} onPress={saveProfile}>
            <MaterialIcons name="add" size={24} color="#8aebff" />
            <Text style={styles.addEventText}>Add New Schedule Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Simulation Card */}
        <LinearGradient colors={['rgba(78, 222, 163, 0.15)', 'rgba(255, 255, 255, 0.05)']} style={styles.simulationCard}>
          <View style={styles.simIconWrapper}>
            <MaterialIcons name="science" size={24} color="#4edea3" />
          </View>
          <View style={styles.simInfo}>
            <Text style={styles.simTitle}>Forecast Simulation</Text>
            <Text style={styles.simSubtitle}>{simulation?.recommendation ?? "Test your settings against tomorrow's predicted warehouse activity and weather patterns."}</Text>
          </View>
          <TouchableOpacity style={styles.simBtn} onPress={runSimulation}>
            <LinearGradient colors={['#4edea3', '#00a572']} style={styles.simBtnGradient}>
              <Text style={styles.simBtnText}>{simulation ? `${simulation.projectedSavingsPercent}% Savings` : 'Run Simulation'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

      </ScrollView>
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
    color: '#8aebff',
  },
  profileBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 24,
    gap: 24,
  },
  titleContainer: {
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '300',
    color: '#e0e3e6',
  },
  glassPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    color: '#e0e3e6',
    fontWeight: '500',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#bbc9cd',
  },
  saveBtn: {
    backgroundColor: 'rgba(138, 235, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 235, 255, 0.3)',
  },
  saveBtnText: {
    color: '#8aebff',
    fontWeight: 'bold',
  },
  formGrid: {
    gap: 12,
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
  },
  smallInput: {
    flex: 1,
  },
  inputLabel: {
    color: '#bbc9cd',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    color: '#e0e3e6',
    fontSize: 16,
    fontWeight: '700',
    padding: 0,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillActive: {
    backgroundColor: 'rgba(78, 222, 163, 0.15)',
    borderColor: 'rgba(78, 222, 163, 0.4)',
  },
  pillText: {
    color: '#bbc9cd',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  pillTextActive: {
    color: '#4edea3',
  },
  sliderSection: {
    marginBottom: 24,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sliderLabel: {
    flex: 1,
    fontSize: 16,
    color: '#e0e3e6',
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  policyPanel: {
    backgroundColor: 'rgba(138, 235, 255, 0.06)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 235, 255, 0.18)',
  },
  policyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  policyTitle: {
    color: '#e0e3e6',
    fontSize: 16,
    fontWeight: '800',
  },
  policyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  policyMetric: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 12,
    padding: 12,
  },
  policyLabel: {
    color: '#bbc9cd',
    fontSize: 12,
    marginBottom: 4,
  },
  policyValue: {
    color: '#8aebff',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  trainingText: {
    color: '#bbc9cd',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  sectionContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#e0e3e6',
    fontWeight: '500',
    marginBottom: 8,
  },
  timelineEvent: {
    flexDirection: 'row',
    gap: 16,
  },
  timelineLeft: {
    width: 56,
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e0e3e6',
  },
  durationText: {
    fontSize: 12,
    color: '#bbc9cd',
  },
  timelineCenter: {
    alignItems: 'center',
  },
  timelineNode: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginTop: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  glowCard: {
    shadowColor: '#8aebff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  timelineCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e0e3e6',
  },
  timelineCardSubtitle: {
    fontSize: 12,
    color: '#bbc9cd',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  timelineCardBody: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoCol: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#bbc9cd',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e0e3e6',
  },
  addEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 235, 255, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 20,
    marginLeft: 72,
    backgroundColor: 'rgba(138, 235, 255, 0.05)',
  },
  addEventText: {
    fontSize: 14,
    color: '#8aebff',
    fontWeight: 'bold',
  },
  simulationCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(78, 222, 163, 0.2)',
    flexDirection: 'column',
    gap: 16,
  },
  simIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(78, 222, 163, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simInfo: {
    gap: 8,
  },
  simTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e0e3e6',
  },
  simSubtitle: {
    fontSize: 14,
    color: '#bbc9cd',
    lineHeight: 20,
  },
  simBtn: {
    marginTop: 8,
  },
  simBtnGradient: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05080A',
  },
});
