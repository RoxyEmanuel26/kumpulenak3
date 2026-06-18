"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const globalForRedis = global;
let redisInstance;
if (globalForRedis.redisConnection) {
    redisInstance = globalForRedis.redisConnection;
}
else {
    const redisUrl = process.env.REDIS_URL;
    redisInstance = redisUrl
        ? new ioredis_1.default(redisUrl, { maxRetriesPerRequest: null })
        : new ioredis_1.default({
            host: process.env.REDIS_HOST || "localhost",
            port: parseInt(process.env.REDIS_PORT || "6379", 10),
            maxRetriesPerRequest: null,
        });
}
exports.redisConnection = redisInstance;
if (process.env.NODE_ENV !== 'production')
    globalForRedis.redisConnection = exports.redisConnection;
