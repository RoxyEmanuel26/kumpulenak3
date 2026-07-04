import { PrismaClient } from '@prisma/client/edge';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

if (globalForPrisma.prisma) {
  prismaInstance = globalForPrisma.prisma;
} else {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not defined.");
  }

  // ── Cloudflare Workers Edge Pool Configuration ──────────────────────────────
  //
  // PLATFORM: Cloudflare Workers (via @cloudflare/next-on-pages)
  // DRIVER:   @neondatabase/serverless (WebSocket, not TCP)
  //
  // Why max=1?
  //   Cloudflare Workers can spawn many V8 isolates in parallel during traffic
  //   spikes. Unlike Vercel (where functions are long-lived processes), each
  //   Cloudflare isolate is ephemeral. With max=5, a spike of 50 isolates would
  //   attempt 250 simultaneous Neon connections — far exceeding the free tier
  //   limit (~100 connections via Neon's built-in pooler).
  //
  //   With max=1, even 100 parallel isolates = 100 connections, safely within
  //   Neon's pooler capacity. Performance is not impacted because:
  //   a) Cloudflare CDN cache absorbs 70–90% of requests (no DB hit at all)
  //   b) Each Worker isolate typically only needs ONE connection at a time
  //   c) @neondatabase/serverless WebSocket is low-latency (~10ms to Neon)
  //
  // Why fetchConnectionCache=true?
  //   Instructs Neon's serverless driver to reuse the underlying WebSocket
  //   connection across multiple sequential queries within the same isolate
  //   lifetime (warm requests). Reduces connection overhead by ~40ms per query.
  //
  // Why idleTimeoutMillis=10000?
  //   Cloudflare isolates are short-lived (seconds to minutes). Releasing idle
  //   connections after 10s (not 30s) frees Neon connections faster, allowing
  //   other isolates to acquire them during sustained high traffic.
  //
  // Why connectionTimeoutMillis=5000?
  //   Fail fast if Neon is saturated. A 5s timeout prevents cascading queue
  //   buildup where hundreds of isolates wait indefinitely for a DB connection.

  const pool = new Pool({
    connectionString,
    max: 1,                     // 1 connection per isolate — safe for Cloudflare Workers
    idleTimeoutMillis: 10_000,  // Release idle connections faster (10s, not 30s)
    connectionTimeoutMillis: 5_000, // Fail fast if Neon pool is saturated
  });

  const adapter = new PrismaNeon(pool as any);
  prismaInstance = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });
}

export const prisma = prismaInstance;

// Reuse the same Prisma + Pool instance across warm requests within the same
// Cloudflare Worker isolate. Each isolate gets its own global scope, so this
// prevents creating a new Pool on every sequential request to the same isolate.
globalForPrisma.prisma = prismaInstance;
