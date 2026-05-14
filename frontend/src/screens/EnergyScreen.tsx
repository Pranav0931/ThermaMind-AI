import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import {
  EnergyLog,
  EnergyStats,
  createRealtimeSocket,
  fallbackEnergyStats,
  getApi,
} from '../services/thermamindApi';

const fanModes = [
  { label: 'LOW', value: 'low' },
  { label: 'BALANCED', value: 'balanced' },
  { label: 'INDUSTRIAL', value: 'industrial' },
  { label: 'PEAK LOAD', value: 'peak' },
] as const;

function chartPath(values: number[], height: number) {
  if (values.length === 0) {
    return 'M 0 120 Q 100 110, 200 120 T 400 115';
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(1, max - min);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 400;
      const y = height - 20 - ((value - min) / spread) * (height - 45);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export default function EnergyScreen() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<EnergyStats>(fallbackEnergyStats);
  const [history, setHistory] = useState<EnergyLog[]>([]);
  const [activeFanMode, setActiveFanMode] = useState<(typeof fanModes)[number]['value']>('balanced');

  const optimizedPath = useMemo(() => chartPath(history.map(item => item.optimizedLoad), 150), [history]);
  const standardPath = useMemo(() => chartPath(history.map(item => item.hvacLoad), 150), [history]);

  useEffect(() => {
    let mounted = true;

    async function loadEnergyData() {
      try {
        const [nextStats, nextHistory] = await Promise.all([
          getApi<EnergyStats>('/api/energy/stats'),
          getApi<EnergyLog[]>('/api/energy/history?limit=24'),
        ]);
        if (mounted) {
          setStats(nextStats);
          setHistory(nextHistory);
        }
      } catch {
        if (mounted) {
          setStats(fallbackEnergyStats);
        }
      }
    }

    void loadEnergyData();

    const socket = createRealtimeSocket();
    socket.on('energy_update', (payload: EnergyStats | EnergyLog) => {
      if ('optimizedLoad' in payload) {
        setHistory(current => [...current.slice(-23), payload]);
      } else {
        setStats(current => ({ ...current, ...payload }));
      }
    });
    socket.on('system_status', (payload: Partial<EnergyStats> & { load?: number }) => {
      setStats(current => ({
        ...current,
        currentLoad: payload.load ?? payload.currentLoad ?? current.currentLoad,
        efficiency: payload.efficiency ?? current.efficiency,
        coolingScore: payload.coolingScore ?? current.coolingScore,
        carbonSaved: payload.carbonSaved ?? current.carbonSaved,
        fanSpeed: payload.fanSpeed ?? current.fanSpeed,
        compressorEff: payload.compressorEff ?? current.compressorEff,
      }));
    });

    return () => {
      mounted = false;
      socket.disconnect();
    };
  }, []);

  function setFanSpeed(mode: (typeof fanModes)[number]['value']) {
    setActiveFanMode(mode);
    const socket = createRealtimeSocket();
    const timeout = setTimeout(() => socket.disconnect(), 1500);
    socket.emit('set_fan_speed', { zoneId: 1, speed: mode }, () => {
      clearTimeout(timeout);
      socket.disconnect();
    });
  }

  return (
    <View style={styles.container}>
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
        
        {/* System Efficiency Hero Card */}
        <View style={[styles.glassCard, styles.cyanGlow]}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroLabel}>Efficiency Insight</Text>
              <Text style={styles.heroTitle}>HVAC Energy Optimization</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{stats.averageSavingsPercent.toFixed(1)}% Energy Savings</Text>
            </View>
          </View>

          {/* Comparison Chart Container */}
          <View style={styles.chartContainer}>
            <Svg width="100%" height="100%" viewBox="0 0 400 150">
              <Defs>
                <SvgLinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#8aebff" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#4edea3" stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>
              <Path d={standardPath} fill="none" opacity="0.5" stroke="#bbc9cd" strokeDasharray="4 4" strokeWidth="2" />
              <Path d={optimizedPath} fill="none" stroke="url(#gradient)" strokeLinecap="round" strokeWidth="4" />
            </Svg>
            <View style={styles.chartOverlayTop}>
              <Text style={styles.chartOverlayText}>Standard HVAC Usage</Text>
            </View>
            <View style={styles.chartOverlayBottom}>
              <Text style={styles.chartOverlayActiveText}>AI Optimized Cooling</Text>
            </View>
          </View>

          <View style={styles.heroFooter}>
            <View>
              <Text style={styles.heroFooterLabel}>Current HVAC Load</Text>
              <Text style={styles.heroFooterValue}>{stats.currentLoad.toFixed(1)} kW</Text>
            </View>
            <View>
              <Text style={styles.heroFooterLabel}>Optimization Status</Text>
              <Text style={[styles.heroFooterValue, { color: '#8aebff' }]}>{stats.optimizationStatus}</Text>
            </View>
          </View>
        </View>

        {/* KPI Cards Grid */}
        <View style={styles.kpiGrid}>
          {/* Carbon Reduction */}
          <View style={[styles.glassCardSmall, styles.emeraldGlow]}>
            <View style={styles.kpiHeader}>
              <MaterialIcons name="eco" size={20} color="#4edea3" />
              <Text style={styles.kpiTitle}>Carbon Reduction</Text>
            </View>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValueLarge}>{stats.carbonSaved.toFixed(1)}</Text>
              <Text style={styles.kpiValueUnit}>kg CO2 Saved</Text>
            </View>
            <Text style={styles.kpiFooterText}>YTD SAVED</Text>
          </View>

          {/* Comfort-per-kWh */}
          <View style={styles.glassCardSmall}>
            <View style={styles.kpiHeader}>
              <MaterialIcons name="bolt" size={20} color="#8aebff" />
              <Text style={styles.kpiTitle}>Cooling Efficiency</Text>
            </View>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValueLarge}>{stats.coolingScore.toFixed(1)}</Text>
              <Text style={styles.kpiValueUnit}>Score</Text>
            </View>
            <Text style={[styles.kpiFooterText, { color: '#8aebff' }]}>ENERGY OPTIMIZATION SCORE</Text>
          </View>
        </View>

        {/* Zone Airflow Mapping Section */}
        <View style={styles.statusList}>
          
          <View style={styles.statusItem}>
            <View style={styles.statusItemLeft}>
              <View style={[styles.statusIconWrapper, { backgroundColor: 'rgba(78, 222, 163, 0.1)' }]}>
                <MaterialIcons name="filter-alt" size={24} color="#4edea3" />
              </View>
              <View>
                <Text style={styles.statusItemTitle}>Air Quality Filtration</Text>
                <Text style={styles.statusItemSubtitle}>Optimal Performance</Text>
              </View>
            </View>
            <View style={styles.statusItemRight}>
              <Text style={styles.statusItemValue}>94%</Text>
              <View style={styles.progressBarSmall}>
                <View style={[styles.progressBarSmallFill, { width: '94%', backgroundColor: '#4edea3' }]} />
              </View>
            </View>
          </View>

          <View style={[styles.statusItemExpanded, styles.cyanGlow]}>
            <View style={styles.statusItemHeader}>
              <View style={styles.statusItemLeft}>
                <View style={[styles.statusIconWrapper, { backgroundColor: 'rgba(138, 235, 255, 0.1)' }]}>
                  <MaterialIcons name="air" size={24} color="#8aebff" />
                </View>
                <View>
                  <Text style={styles.statusItemTitle}>Fan Speed</Text>
                  <Text style={styles.statusItemSubtitle}>Airflow Distribution</Text>
                </View>
              </View>
              <Text style={[styles.statusItemValueLarge, { color: '#8aebff' }]}>{Math.round(stats.fanSpeed)}%</Text>
            </View>

            <View style={styles.fanBtnsRow}>
              {fanModes.map(mode => {
                const isActive = activeFanMode === mode.value;
                return (
                  <TouchableOpacity key={mode.value} style={[styles.fanBtn, isActive && styles.fanBtnActive]} onPress={() => setFanSpeed(mode.value)}>
                    <Text style={isActive ? styles.fanBtnActiveText : styles.fanBtnText}>{mode.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.statusItem}>
            <View style={styles.statusItemLeft}>
              <View style={[styles.statusIconWrapper, { backgroundColor: 'rgba(138, 235, 255, 0.1)' }]}>
                <MaterialIcons name="thermostat" size={24} color="#8aebff" />
              </View>
              <View>
                <Text style={styles.statusItemTitle}>Thermal Balance</Text>
                <Text style={styles.statusItemSubtitle}>Realtime Thermal Balancing</Text>
              </View>
            </View>
            <Text style={[styles.statusItemValue, { color: '#8aebff' }]}>Operational</Text>
          </View>

          <View style={styles.statusItem}>
            <View style={styles.statusItemLeft}>
              <View style={[styles.statusIconWrapper, { backgroundColor: 'rgba(78, 222, 163, 0.1)' }]}>
                <MaterialIcons name="settings-input-component" size={24} color="#4edea3" />
              </View>
              <View>
                <Text style={styles.statusItemTitle}>Compressor Efficiency</Text>
                <Text style={styles.statusItemSubtitle}>Active Load Cycle</Text>
              </View>
            </View>
            <Text style={[styles.statusItemValue, { color: '#4edea3' }]}>{Math.round(stats.compressorEff)}%</Text>
          </View>

          <View style={styles.statusItem}>
            <View style={styles.statusItemLeft}>
              <View style={[styles.statusIconWrapper, { backgroundColor: 'rgba(138, 235, 255, 0.1)' }]}>
                <MaterialIcons name="air" size={24} color="#8aebff" />
              </View>
              <View>
                <Text style={styles.statusItemTitle}>Airflow Efficiency</Text>
                <Text style={styles.statusItemSubtitle}>Steady State Monitoring</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons name="trending-up" size={16} color="#4edea3" />
              <Text style={[styles.statusItemValue, { color: '#8aebff' }]}>Optimal</Text>
            </View>
          </View>

        </View>
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
    gap: 16,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cyanGlow: {
    shadowColor: '#8aebff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  emeraldGlow: {
    shadowColor: '#4edea3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 14,
    color: '#8aebff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e0e3e6',
    marginTop: 4,
  },
  heroBadge: {
    backgroundColor: 'rgba(138, 235, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  heroBadgeText: {
    color: '#8aebff',
    fontSize: 14,
  },
  chartContainer: {
    height: 192,
    width: '100%',
    marginTop: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  chartOverlayTop: {
    position: 'absolute',
    top: 32,
    right: 0,
  },
  chartOverlayText: {
    fontSize: 14,
    color: 'rgba(187, 201, 205, 0.5)',
  },
  chartOverlayBottom: {
    position: 'absolute',
    bottom: 8,
    left: 0,
  },
  chartOverlayActiveText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8aebff',
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroFooterLabel: {
    fontSize: 14,
    color: '#bbc9cd',
  },
  heroFooterValue: {
    fontSize: 24,
    color: '#4edea3',
    fontWeight: '500',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  glassCardSmall: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kpiTitle: {
    fontSize: 14,
    color: '#e0e3e6',
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  kpiValueLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e0e3e6',
  },
  kpiValueUnit: {
    fontSize: 14,
    color: '#bbc9cd',
  },
  kpiFooterText: {
    fontSize: 10,
    color: '#4edea3',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusList: {
    gap: 12,
  },
  statusItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statusItemExpanded: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statusItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e0e3e6',
  },
  statusItemSubtitle: {
    fontSize: 12,
    color: '#bbc9cd',
  },
  statusItemRight: {
    alignItems: 'flex-end',
  },
  statusItemValue: {
    fontSize: 14,
    color: '#e0e3e6',
  },
  statusItemValueLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e0e3e6',
  },
  progressBarSmall: {
    width: 64,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressBarSmallFill: {
    height: '100%',
  },
  fanBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fanBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  fanBtnActive: {
    backgroundColor: 'rgba(138, 235, 255, 0.2)',
    borderColor: 'rgba(138, 235, 255, 0.4)',
    shadowColor: '#8aebff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  fanBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(187, 201, 205, 0.6)',
  },
  fanBtnActiveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8aebff',
  },
});
