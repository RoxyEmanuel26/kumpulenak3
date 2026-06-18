import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

export const redisConnection = redisUrl 
  ? new Redis(redisUrl, { maxRetriesPerRequest: null })
  : new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      maxRetriesPerRequest: null,
    });
