import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().default("*"),
  DATABASE_URL: z.string().optional(),
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  JWT_SECRET: z.string().min(12).default("development-jwt-secret-change-me"),
  SENSOR_MODE: z.enum(["simulation", "mqtt"]).default("simulation"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  RETENTION_CRON: z.string().default("0 2 * * *"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid backend environment: ${details}`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
