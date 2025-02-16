import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

// Redis client setup
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = new IORedis(redisUrl, {
    maxRetriesPerRequest: null, // Prevents retry issues in BullMQ
});

const RESPONSE_TIME_THRESHOLD = 750;
const WEBSITE_CACHE_KEY = 'active-websites';
const WEBSITE_CACHE_TTL = 1800; 
const ALERT_COOLDOWN_KEY_PREFIX = 'alert-cooldown';
const ALERT_COOLDOWN_PERIOD = 1800;


redisClient.on('error', (err) => {
    console.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

// BullMQ setup
const monitoringQueue = new Queue('monitoring-queue', {
    connection: redisClient,
});


export { redisClient, monitoringQueue, RESPONSE_TIME_THRESHOLD, WEBSITE_CACHE_KEY, WEBSITE_CACHE_TTL, ALERT_COOLDOWN_KEY_PREFIX,ALERT_COOLDOWN_PERIOD };



