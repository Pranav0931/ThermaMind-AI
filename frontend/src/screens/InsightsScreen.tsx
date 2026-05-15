import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AmbientGlow from '../components/AmbientGlow';
import {
  OccupancyPrediction,
  Recommendation,
  SensorReading,
  fallbackReadings,
  getApi,
  postApi,
} from '../services/thermamindApi';

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [readings, setReadings] = useState<SensorReading[]>(fallbackReadings);
  const [prediction, setPrediction] = useState<OccupancyPrediction>({ predictions: [12, 18, 24, 20], confidence: 0.94 });
  const [recommendation, setRecommendation] = useState<Recommendation>({
    type: 'airflow_redirect',
    message: 'Demand is stable. Maintain balanced airflow and trim compressor load for energy savings.',
    confidence: 0.94,
    savings: 12.5,
    co2Trend: 'stable',
  });

  const primary = readings[0] ?? fallbackReadings[0];
  const maxPrediction = Math.max(...prediction.predictions, 1);
  const stabilityScore = useMemo(() => {
    const tempScore = Math.max(0, 100 - Math.abs(primary.temperature - 22) * 7);
    const humidityScore = Math.max(0, 100 - Math.abs(primary.humidity - 45) * 1.4);
    const co2Score = Math.max(0, 100 - Math.max(0, primary.co2 - 450) * 0.08);
    return Math.round((tempScore + humidityScore + co2Score) / 3);
  }, [primary]);

  useEffect(() => {
    let mounted = true;

    async function loadInsights() {
      try {
        const latestReadings = await getApi<SensorReading[]>('/api/sensors');
        const nextReadings = latestReadings.length ? latestReadings : fallbackReadings;
        const zoneId = nextReadings[0]?.zoneId ?? 1;
        const [occupancy, nextRecommendation] = await Promise.all([
          postApi<OccupancyPrediction>('/api/ai/predict', { zoneId, horizonMinutes: 120 }),
          postApi<Recommendation>('/api/ai/recommend', { zoneId }),
        ]);

        if (mounted) {
          setReadings(nextReadings);
          setPrediction(occupancy);
          setRecommendation(nextRecommendation);
        }
      } catch {
        if (mounted) {
          setReadings(fallbackReadings);
        }
      }
    }

    void loadInsights();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <AmbientGlow color="#8aebff" size={400} top={-100} left={-100} />
      <AmbientGlow color="#4edea3" size={400} bottom={-100} right={-100} />

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
        
        {/* Comfort Intelligence Card */}
        <View style={styles.glassPanel}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Climate Stability Score</Text>
              <Text style={styles.cardSubtitle}>Realtime HVAC Performance</Text>
            </View>
            <Text style={styles.largeScore}>{stabilityScore}%</Text>
          </View>
          
          <View style={styles.progressBg}>
            <LinearGradient 
              colors={['#8aebff', '#4edea3']} 
              style={[styles.progressFill, { width: `${stabilityScore}%` }]}
              start={{x: 0, y: 0}} 
              end={{x: 1, y: 0}} 
            />
          </View>

          <View style={styles.splitRow}>
            <View style={styles.splitBox}>
              <Text style={styles.splitBoxLabel}>Humidity Level</Text>
              <Text style={styles.splitBoxValue}>{Math.round(primary.humidity)}%</Text>
            </View>
            <View style={styles.splitBox}>
              <Text style={styles.splitBoxLabel}>Air Quality Status</Text>
              <Text style={[styles.splitBoxValue, { color: primary.co2 > 800 ? '#ffb4ab' : '#4edea3' }]}>{primary.co2 > 800 ? 'Elevated' : 'Optimal'}</Text>
            </View>
          </View>
        </View>

        {/* Live Learning Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Occupancy Forecasting</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>FORECAST MODEL ACTIVE</Text>
            </View>
          </View>
          <Text style={styles.description}>
            AI forecasting analyzes occupancy, airflow, and temperature patterns to predict cooling demand.
          </Text>

          {/* Bar Graph */}
          <View style={styles.graphContainer}>
            {prediction.predictions.map((value, index) => (
              <View
                key={`${value}-${index}`}
                style={[
                  styles.graphBar,
                  {
                    height: `${Math.max(16, Math.round((value / maxPrediction) * 95))}%`,
                    backgroundColor: index === prediction.predictions.length - 1 ? 'rgba(78, 222, 163, 0.8)' : 'rgba(138, 235, 255, 0.55)',
                  },
                ]}
              />
            ))}
            <Text style={styles.graphOverlayText}>PREDICTED OCCUPANCY</Text>
          </View>

          {/* Buttons Row */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.actionBtn}>
              <MaterialIcons name="person-off" size={24} color="#bbc9cd" />
              <Text style={styles.actionBtnText}>Low Occupancy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnActive]}>
              <MaterialIcons name="groups" size={24} color="#8aebff" />
              <Text style={[styles.actionBtnText, { color: '#8aebff' }]}>High Activity</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnError}>
              <MaterialIcons name="warning" size={24} color="#bbc9cd" />
              <Text style={styles.actionBtnText}>Heat Risk</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Decision Card */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIconWrapper}>
              <MaterialIcons name="psychology" size={24} color="#8aebff" />
            </View>
            <View style={styles.aiInfo}>
              <Text style={styles.cardTitle}>AI Recommendation</Text>
              <Text style={styles.aiDescription}>
                {recommendation.message}
              </Text>
              
              <View style={styles.aiMetricsRow}>
                <View>
                  <Text style={styles.aiMetricLabel}>CONFIDENCE</Text>
                  <Text style={[styles.aiMetricValue, { color: '#8aebff' }]}>{Math.round(recommendation.confidence * 100)}%</Text>
                </View>
                <View>
                  <Text style={styles.aiMetricLabel}>SAVINGS</Text>
                  <Text style={[styles.aiMetricValue, { color: '#4edea3' }]}>{recommendation.savings.toFixed(1)}%</Text>
                </View>
                <View>
                  <Text style={styles.aiMetricLabel}>CO2 TREND</Text>
                  <Text style={styles.aiMetricValue}>{recommendation.co2Trend}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.aiFooter}>
            <View style={styles.alertIndicator}>
              <MaterialIcons name="place" size={12} color="#ffb4ab" />
              <Text style={styles.alertIndicatorText}>HOTSPOT PREDICTION</Text>
            </View>
            <TouchableOpacity style={styles.viewAnalyticsBtn}>
              <Text style={styles.viewAnalyticsText}>View Operational Analytics</Text>
              <MaterialIcons name="arrow-forward" size={14} color="#8aebff" />
            </TouchableOpacity>
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
    gap: 24,
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
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    color: '#e0e3e6',
    fontWeight: '500',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#bbc9cd',
  },
  largeScore: {
    fontSize: 40,
    fontWeight: '300',
    color: '#4edea3',
  },
  progressBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 16,
  },
  splitBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  splitBoxLabel: {
    fontSize: 14,
    color: '#bbc9cd',
    marginBottom: 4,
  },
  splitBoxValue: {
    fontSize: 24,
    color: '#e0e3e6',
    fontWeight: '500',
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(138, 235, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: {
    color: '#8aebff',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: '#bbc9cd',
    lineHeight: 24,
  },
  graphContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 8,
    borderRadius: 8,
    position: 'relative',
  },
  graphBar: {
    flex: 1,
    borderRadius: 2,
  },
  graphOverlayText: {
    position: 'absolute',
    right: 16,
    bottom: 8,
    fontSize: 10,
    color: '#bbc9cd',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    opacity: 0.5,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionBtnActive: {
    backgroundColor: 'rgba(138, 235, 255, 0.2)',
    borderColor: 'rgba(138, 235, 255, 0.4)',
  },
  actionBtnError: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionBtnText: {
    fontSize: 14,
    color: '#e0e3e6',
    fontWeight: '600',
  },
  aiCard: {
    backgroundColor: 'rgba(138, 235, 255, 0.05)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(138, 235, 255, 0.2)',
  },
  aiHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  aiIconWrapper: {
    padding: 12,
    backgroundColor: 'rgba(138, 235, 255, 0.1)',
    borderRadius: 24,
    alignSelf: 'flex-start',
  },
  aiInfo: {
    flex: 1,
  },
  aiDescription: {
    fontSize: 16,
    color: '#bbc9cd',
    lineHeight: 24,
    marginTop: 8,
  },
  aiMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  aiMetricLabel: {
    fontSize: 10,
    color: '#bbc9cd',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  aiMetricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e0e3e6',
  },
  aiFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  alertIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertIndicatorText: {
    fontSize: 10,
    color: '#ffb4ab',
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  viewAnalyticsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAnalyticsText: {
    fontSize: 14,
    color: '#8aebff',
    fontWeight: '600',
  },
});
