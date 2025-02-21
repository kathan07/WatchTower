import { Worker, QueueEvents } from 'bullmq';
import { addLog, connectDb, disconnectDb, Status } from '@repo/prisma';
import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import {
    redisClient,
    RESPONSE_TIME_THRESHOLD
} from '@repo/redis';

// Configure axios retry behavior
axiosRetry(axios, {
    retries: 3,
    retryDelay: (retryCount) => {
        return Math.max(500, axiosRetry.exponentialDelay(retryCount));
    },
    retryCondition: (error) => {
        // Retry on network errors and 5xx responses
        return (
            axiosRetry.isNetworkOrIdempotentRequestError(error) ||
            (error.response?.status ? error.response.status >= 500 : false)
        );
    }
});

interface MonitoringJob {
    websiteId: string;
    url: string;
    timeout?: number;
}

class MonitoringWorker {
    private worker: Worker;
    private queueEvents: QueueEvents;
    private isShuttingDown = false;

    constructor() {
        this.worker = new Worker<MonitoringJob>(
            'monitoring-queue',
            async (job) => {
                return this.processJob(job.data);
            },
            {
                connection: redisClient,
                concurrency: 5,
                limiter: {
                    max: 100,
                    duration: 1000
                },
                lockDuration: 30000,         // Replaces stalledInterval
                lockRenewTime: 15000,        // Half of lockDuration is a good practice
                maxStalledCount: 3
            }
        );

        // BullMQ uses separate QueueEvents for monitoring
        this.queueEvents = new QueueEvents('monitoring-queue', {
            connection: redisClient
        });

        this.setupWorkerEvents();
    }

    private setupWorkerEvents(): void {
        // BullMQ uses different event names and structures
        this.worker.on('completed', (job) => {
            console.log(`Job ${job.id} completed for website: ${job.data.url}`);
        });

        this.worker.on('failed', (job, err) => {
            console.error(`Job ${job?.id} failed for website: ${job?.data.url}`, err);
        });

        this.worker.on('error', (error) => {
            console.error('Worker error:', error);
        });

        // Stalled jobs are handled through QueueEvents in BullMQ
        this.queueEvents.on('stalled', ({ jobId }) => {
            console.warn(`Job ${jobId} stalled`);
        });
    }

    private async processJob({ websiteId, url, timeout }: MonitoringJob): Promise<void> {
        if (this.isShuttingDown) {
            throw new Error('Worker is shutting down');
        }

        let status: Status = Status.DOWN;
        let responseTime: number | null = null;
        const requestTimeout = timeout ?? 30000;

        try {
            const startTime = Date.now();
            const response = await axios.get(url, {
                timeout: requestTimeout,
                validateStatus: null,
                headers: {
                    'User-Agent': 'Website-Monitoring-Service/1.0'
                }
            });
            responseTime = Date.now() - startTime;

            if (response.status >= 200 && response.status < 300) {
                status = responseTime > RESPONSE_TIME_THRESHOLD ? Status.DEGRADED : Status.UP;
            } else if (response.status >= 400 && response.status < 500) {
                status = Status.DOWN;
            } else {
                status = Status.DEGRADED;
            }
        } catch (error) {
            status = Status.DOWN;
            const axiosError = error as AxiosError;
            console.error(`Error monitoring ${url} after retries:`, {
                message: axiosError.message,
                code: axiosError.code,
                response: axiosError.response?.status,
                retryCount: (axiosError.config as any)?._retry || 0
            });
        }

        try {
            await addLog(websiteId, status, responseTime);
        } catch (error) {
            console.error(`Error creating log for ${url}:`, error);
            throw error;
        }
    }

    public async start(): Promise<void> {
        try {
            await connectDb();
            console.log('Database connection established');

            await this.worker.resume();
            console.log('Monitoring worker started');

            process.on('SIGTERM', () => {
                void this.shutdown();
            });

            process.on('SIGINT', () => {
                void this.shutdown();
            });
        } catch (error) {
            console.error('Failed to start monitoring worker:', error);
            process.exit(1);
        }
    }

    private async shutdown(): Promise<void> {
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;
        console.log('Shutting down monitoring worker...');

        const forceExitTimeout = setTimeout(() => {
            console.warn('Forcing shutdown due to timeout.');
            process.exit(1);
        }, 5000);

        try {
            await Promise.race([
                Promise.all([
                    this.worker.close(),
                    this.queueEvents.close(),
                    disconnectDb()
                ]),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Shutdown timeout')), 4500)
                )
            ]);

            clearTimeout(forceExitTimeout);
            console.log('Cleanup completed successfully');
            process.exit(0);
        } catch (error) {
            clearTimeout(forceExitTimeout);
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Start the worker
const worker = new MonitoringWorker();
void worker.start().catch((error) => {
    console.error('Failed to start monitoring worker:', error);
    process.exit(1);
});