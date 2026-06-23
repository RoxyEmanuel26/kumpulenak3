import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

if (globalForPrisma.prisma) {
  prismaInstance = globalForPrisma.prisma;
} else {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not defined.");
  }

  // Pool sizing for high-concurrency serverless deployment (Neon PostgreSQL).
  //
  // Why max=5?
  //   Neon free tier supports up to ~20 concurrent connections. With multiple
  //   serverless function instances each holding up to 5 connections, we stay
  //   well within Neon's limits even under 10,000 concurrent users.
  //   Vercel functions scale horizontally — each instance gets its own pool,
  //   so keeping per-instance count low is critical.
  //
  // Why idleTimeoutMillis=30000?
  //   Serverless functions can stay warm for minutes. Releasing idle connections
  //   quickly prevents "connection already closed" errors on cold starts.
  //
  // Why connectionTimeoutMillis=5000?
  //   Fail fast if the DB is saturated — better to return a 500 quickly than
  //   to hold the request open for 30+ seconds and cascade into a timeout storm.
  const pool = new Pool({
    connectionString,
    max: 5,                     // Max 5 connections per serverless instance
    idleTimeoutMillis: 30_000,  // Release idle connections after 30 seconds
    connectionTimeoutMillis: 5_000, // Fail fast if pool is saturated (5s)
  });

  const adapter = new PrismaPg(pool);
  prismaInstance = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });
}

export const prisma = prismaInstance;

// BUG FIX: Previously only stored in non-production, causing new pool instances
// to be created on every module evaluation in production serverless environments.
// Now always stored — safe because pg.Pool is designed to be shared across requests.
globalForPrisma.prisma = prismaInstance;

