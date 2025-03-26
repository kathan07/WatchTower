import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

// Constants
const RESPONSE_TIME_THRESHOLD: number = 750;
const WEBSITE_CACHE_KEY: string = 'active-websites';
const WEBSITE_CACHE_TTL: number = 1800; 
const ALERT_COOLDOWN_KEY_PREFIX: string = 'alert-cooldown';
const ALERT_COOLDOWN_PERIOD: number = 1800;

// Redis client setup
const redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient: IORedis = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
});

redisClient.on('error', (err: Error) => {
    console.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

// BullMQ setup
const monitoringQueue: Queue = new Queue('monitoring-queue', {
    connection: redisClient,
});

export {
    redisClient,
    monitoringQueue,
    RESPONSE_TIME_THRESHOLD,
    WEBSITE_CACHE_KEY,
    WEBSITE_CACHE_TTL,
    ALERT_COOLDOWN_KEY_PREFIX,
    ALERT_COOLDOWN_PERIOD
};
