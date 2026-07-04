import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';

if (typeof globalThis.WebSocket === "undefined" && typeof module !== "undefined" && module.require) {
  try {
    neonConfig.webSocketConstructor = module.require("ws");
  } catch (err) {
    console.warn("Failed to load ws polyfill:", err);
  }
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };
let prismaInstance: PrismaClient;

if (globalForPrisma.prisma) {
  prismaInstance = globalForPrisma.prisma;
} else {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not defined.");
  }

  const pool = new Pool({ connectionString });

  const adapter = new PrismaNeon(pool as any);
  prismaInstance = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

  globalForPrisma.prisma = prismaInstance;
}

export const prisma = prismaInstance;
