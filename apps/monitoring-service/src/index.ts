import { Worker, QueueEvents } from 'bullmq';
import { connectDb, disconnectDb } from '@repo/prisma';
import { redisClient } from '@repo/redis';
import { MonitoringJob, processMonitoringJob } from './processor';

class MonitoringWorker {
    private worker: Worker;
    private queueEvents: QueueEvents;
    private isShuttingDown = false;

    constructor() {
        this.worker = new Worker<MonitoringJob>(
            'monitoring-queue',
            async (job) => processMonitoringJob(job.data, () => this.isShuttingDown),
            {
                connection: redisClient,
                concurrency: 5,
                limiter: {
                    max: 100,
                    duration: 1000,
                },
                lockDuration: 30000,
                lockRenewTime: 15000,
                maxStalledCount: 3,
            }
        );

        this.queueEvents = new QueueEvents('monitoring-queue', {
            connection: redisClient,
        });

        this.setupWorkerEvents();
    }

    private setupWorkerEvents(): void {
        this.worker.on('completed', (job) => {
            console.log(`Job ${job.id} completed for website: ${job.data.url}`);
        });

        this.worker.on('failed', (job, err) => {
            console.error(`Job ${job?.id} failed for website: ${job?.data.url}`, err);
        });

        this.worker.on('error', (error) => {
            console.error('Worker error:', error);
        });

        this.queueEvents.on('stalled', ({ jobId }) => {
            console.warn(`Job ${jobId} stalled`);
        });
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
                    disconnectDb(),
                ]),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Shutdown timeout')), 4500)
                ),
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

const worker = new MonitoringWorker();
void worker.start().catch((error) => {
    console.error('Failed to start monitoring worker:', error);
    process.exit(1);
});
