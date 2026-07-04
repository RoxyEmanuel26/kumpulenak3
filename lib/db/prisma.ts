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
  const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_D3Yv9HMEPCUA@ep-cool-boat-aoi3pbi8-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not defined.");
  }
  console.log("===> CONNECTION STRING:", connectionString);

  const pool = new Pool({
    connectionString,
    host: "ep-cool-boat-aoi3pbi8-pooler.c-2.ap-southeast-1.aws.neon.tech",
    user: "neondb_owner",
    password: "npg_D3Yv9HMEPCUA",
    database: "neondb",
    ssl: true,
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  
  const adapter = new PrismaNeon(pool as any);
  prismaInstance = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });
  
  globalForPrisma.prisma = prismaInstance;
}

export const prisma = prismaInstance;
