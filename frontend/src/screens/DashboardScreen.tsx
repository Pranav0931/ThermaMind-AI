import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AmbientGlow from '../components/AmbientGlow';
import { io } from 'socket.io-client';

const { width } = Dimensions.get('window');
const SERVER_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [pulse, setPulse] = useState(true);
  const [sensorData, setSensorData] = useState({
    temperature: 22.4,
    humidity: 48,
    co2: 410,
    occupancy: 12,
    efficiency: 98,
    load: 14.2
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 1000);

    const socket = io(SERVER_URL);
    socket.on('sensor_data', (data) => {
      setSensorData(data);
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

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
              System Status: <Text style={styles.statusTextHighlight}>Stable Operations</Text>
            </Text>
          </View>
        </View>

        {/* Zonal Cards */}
        {/* Card 1 */}
        <View style={styles.glassCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardLabel}>ACTIVE ZONE</Text>
              <Text style={styles.cardTitle}>Storage Zone A</Text>
              <View style={styles.cardSubStatus}>
                <MaterialIcons name="ac-unit" size={16} color="#4edea3" />
                <Text style={styles.cardSubStatusText}>Cooling Efficiency Stable</Text>
              </View>
            </View>
            <View style={styles.tempContainer}>
              <View style={styles.tempRow}>
                <MaterialIcons name="trending-down" size={20} color="#4edea3" />
                <Text style={styles.tempText}>{sensorData.temperature.toFixed(1)}°</Text>
              </View>
              <Text style={styles.tempUnit}>Celsius</Text>
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Humidity</Text>
              <Text style={styles.statValue}>{sensorData.humidity}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Cooling Efficiency</Text>
              <Text style={styles.statValue}>{sensorData.efficiency}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Occupancy</Text>
              <Text style={styles.statValue}>{sensorData.occupancy}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <MaterialIcons name="bolt" size={16} color="#8aebff" />
              <Text style={styles.metricText}>{sensorData.load.toFixed(1)} kW</Text>
            </View>
            <View style={styles.metricItem}>
              <MaterialIcons name="co2" size={16} color="#8aebff" />
              <Text style={styles.metricText}>{sensorData.co2} ppm</Text>
            </View>
          </View>

          <View style={styles.alertBox}>
            <MaterialIcons name="auto-awesome" size={20} color="#4edea3" />
            <Text style={styles.alertText}>Humidity rising in Storage Zone A. Airflow increased by 8% to maintain optimal cooling conditions.</Text>
          </View>
        </View>

        {/* Card 2 */}
        <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} style={[styles.glassCard, { marginTop: 24 }]}>
          <View style={styles.card2Header}>
            <Text style={styles.cardTitle}>Packaging Section</Text>
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
                <Text style={styles.largeTemp}>21.8°</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '75%' }]} />
              </View>
            </View>
          </View>
          
          <View style={[styles.metricsRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }]}>
            <View style={styles.metricItem}>
              <MaterialIcons name="bolt" size={16} color="#4edea3" />
              <Text style={styles.metricText}>11.8 kW</Text>
            </View>
            <View style={styles.metricItem}>
              <MaterialIcons name="co2" size={16} color="#4edea3" />
              <Text style={styles.metricText}>395 ppm</Text>
            </View>
          </View>

          <View style={styles.noteLine}>
            <Text style={styles.noteText}>Cooling adjusted due to increased loading dock activity.</Text>
          </View>
        </LinearGradient>

        {/* Card 3 */}
        <View style={[styles.glassCard, { marginTop: 24 }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Cold Storage Unit</Text>
              <Text style={styles.statusTextLight}>Status: <Text style={styles.statusTextWhite}>Low Activity</Text></Text>
            </View>
            <View style={styles.tempContainer}>
              <View style={styles.tempRow}>
                <MaterialIcons name="trending-up" size={18} color="rgba(187, 201, 205, 0.4)" />
                <Text style={styles.mutedTemp}>23.0°</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.splitRow}>
            <View style={styles.splitBox}>
              <Text style={styles.splitBoxLabel}>Status: <Text style={styles.statusTextWhite}>Low Activity</Text></Text>
              <Text style={styles.splitBoxValue}>45%</Text>
            </View>
            <View style={styles.splitBox}>
              <Text style={styles.splitBoxLabel}>Cooling Score</Text>
              <Text style={styles.splitBoxValue}>92</Text>
            </View>
          </View>
        </View>

        {/* Airflow Distribution Graph */}
        <View style={[styles.glassCard, { marginTop: 24, paddingBottom: 20 }]}>
          <Text style={styles.cardTitle}>Airflow Distribution</Text>
          <View style={styles.graphContainer}>
            <LinearGradient colors={['rgba(78, 222, 163, 0.4)', 'transparent']} style={[styles.bar, { height: 48 }]} />
            <LinearGradient colors={['rgba(138, 235, 255, 0.4)', 'transparent']} style={[styles.bar, { height: 80 }]} />
            <LinearGradient colors={['rgba(78, 222, 163, 0.6)', 'transparent']} style={[styles.bar, { height: 96 }]} />
            <LinearGradient colors={['rgba(138, 235, 255, 0.3)', 'transparent']} style={[styles.bar, { height: 64 }]} />
            <LinearGradient colors={['rgba(78, 222, 163, 0.5)', 'transparent']} style={[styles.bar, { height: 112 }]} />
            <LinearGradient colors={['rgba(138, 235, 255, 0.4)', 'transparent']} style={[styles.bar, { height: 72 }]} />
            <LinearGradient colors={['rgba(78, 222, 163, 0.4)', 'transparent']} style={[styles.bar, { height: 88 }]} />
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
