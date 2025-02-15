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


export { redisClient, monitoringQueue, RESPONSE_TIME_THRESHOLD };



