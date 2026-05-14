import cron from "node-cron";
import { env } from "../config/env";
import { dataStore } from "../services/dataStore";
import { logger } from "../utils/logger";

export function startRetentionJob() {
  return cron.schedule(env.RETENTION_CRON, async () => {
    const now = Date.now();
    try {
      await dataStore.pruneOlderThan({
        sensor: new Date(now - 30 * 24 * 60 * 60 * 1000),
        energy: new Date(now - 365 * 24 * 60 * 60 * 1000),
        alerts: new Date(now - 90 * 24 * 60 * 60 * 1000),
        recommendations: new Date(now - 30 * 24 * 60 * 60 * 1000),
      });
      logger.info("Retention job completed");
    } catch (error) {
      logger.error({ error }, "Retention job failed");
    }
  });
}
