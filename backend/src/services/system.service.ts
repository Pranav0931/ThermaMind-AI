import { dataStore } from "./dataStore";

class SystemService {
  async status() {
    const [status, zones, readings, activeAlerts, recommendations] = await Promise.all([
      dataStore.getLatestSystemStatus(),
      dataStore.listZones(),
      dataStore.getLatestReadings(),
      dataStore.listAlerts(true),
      dataStore.listRecommendations(5),
    ]);

    return {
      status,
      zones,
      readings,
      activeAlerts,
      recommendations,
      datastore: dataStore.isDatabaseReady() ? "postgresql" : "memory",
    };
  }
}

export const systemService = new SystemService();
