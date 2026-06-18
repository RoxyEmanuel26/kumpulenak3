import Redis from "ioredis";

const globalForRedis = global as unknown as { redisConnection: Redis };

let redisInstance: Redis;

if (globalForRedis.redisConnection) {
  redisInstance = globalForRedis.redisConnection;
} else {
  const redisUrl = process.env.REDIS_URL;
  redisInstance = redisUrl 
    ? new Redis(redisUrl, { maxRetriesPerRequest: null })
    : new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        maxRetriesPerRequest: null,
      });
}

export const redisConnection = redisInstance;

if (process.env.NODE_ENV !== 'production') globalForRedis.redisConnection = redisConnection;
