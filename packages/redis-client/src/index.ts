import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

export const RESPONSE_TIME_THRESHOLD = 750;
export const WEBSITE_CACHE_KEY = 'active-websites';
export const WEBSITE_CACHE_TTL = 1800;
export const ALERT_COOLDOWN_KEY_PREFIX = 'alert-cooldown';
// WHY: 30m cooldown prevents alert storms when a site stays DOWN/DEGRADED.
export const ALERT_COOLDOWN_PERIOD = 1800;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient: IORedis = new IORedis(redisUrl, {
    // BullMQ requires maxRetriesPerRequest: null on the shared connection.
    maxRetriesPerRequest: null,
});

redisClient.on('error', (err: Error) => {
    console.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

export const monitoringQueue: Queue = new Queue('monitoring-queue', {
    connection: redisClient,
});
