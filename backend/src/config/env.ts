import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    CLIENT_ORIGIN: z.string().default("*"),
    DATABASE_URL: z.string().url().optional(),
    AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
    JWT_SECRET: z.string().min(24).default("development-jwt-secret-change-me"),
    SENSOR_MODE: z.enum(["simulation", "mqtt"]).default("simulation"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    RETENTION_CRON: z.string().default("0 2 * * *"),
    SENSOR_TICK_MS: z.coerce.number().int().min(500).default(2000),
    STATUS_TICK_MS: z.coerce.number().int().min(1000).default(5000),
    ENERGY_TICK_MS: z.coerce.number().int().min(1000).default(10000),
    RECOMMENDATION_TICK_MS: z.coerce.number().int().min(60000).default(300000),
    ALLOW_MEMORY_DATASTORE: z.coerce.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && !value.DATABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required in production",
      });
    }

    if (value.NODE_ENV === "production" && value.JWT_SECRET === "development-jwt-secret-change-me") {
      ctx.addIssue({
        code: "custom",
        path: ["JWT_SECRET"],
        message: "JWT_SECRET must be set to a production secret",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid backend environment: ${details}`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
