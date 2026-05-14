import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env";
import { logger } from "../utils/logger";

let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient | null {
  if (!env.DATABASE_URL) {
    return null;
  }

  if (!prisma) {
    try {
      const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
      prisma = new PrismaClient({ adapter });
    } catch (error) {
      logger.warn({ error }, "Failed to configure Prisma adapter; using in-memory datastore");
      return null;
    }
  }

  return prisma;
}

export async function disconnectPrisma() {
  if (!prisma) {
    return;
  }

  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.warn({ error }, "Failed to disconnect Prisma cleanly");
  }
}
