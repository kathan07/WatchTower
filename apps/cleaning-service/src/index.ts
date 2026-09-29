import { CronJob } from 'cron';
import { connectDb, disconnectDb } from '@repo/prisma';
import {
    cleanupOldAnalytics,
    cleanupOldLogs,
    handleExpiredSubscriptions,
} from './processor';

class CleanupService {
    private logCleanupJob!: CronJob;
    private analyticsCleanupJob!: CronJob;
    private subscriptionCheckJob!: CronJob;

    constructor() {
        this.initializeErrorHandlers();
    }

    private initializeCronJobs(): void {
        this.logCleanupJob = new CronJob('0 2 * * *', () => cleanupOldLogs(), null, true);
        this.analyticsCleanupJob = new CronJob(
            '0 3 * * *',
            () => cleanupOldAnalytics(),
            null,
            true
        );
        this.subscriptionCheckJob = new CronJob(
            '0 * * * *',
            () => handleExpiredSubscriptions(),
            null,
            true
        );
    }

    private initializeErrorHandlers(): void {
        process.on('SIGTERM', async () => {
            console.log('Received SIGTERM signal. Cleaning up...');
            await this.stop();
        });

        process.on('uncaughtException', async (error) => {
            console.error('Uncaught Exception:', error);
            await this.stop();
            process.exit(1);
        });
    }

    public async start(): Promise<void> {
        try {
            console.log('Starting cleanup service...');
            this.initializeCronJobs();
            await connectDb();
            console.log('Cleanup service started successfully');
        } catch (error) {
            console.error('Error starting cleanup service:', error);
            await this.stop();
            process.exit(1);
        }
    }

    public async stop(): Promise<void> {
        console.log('Stopping cleanup service...');
        this.logCleanupJob?.stop();
        this.analyticsCleanupJob?.stop();
        this.subscriptionCheckJob?.stop();
        try {
            await disconnectDb();
            console.log('Cleanup service stopped successfully');
        } catch (error) {
            console.error('Error during shutdown:', error);
        } finally {
            process.exit(0);
        }
    }
}

const cleanupService = new CleanupService();
cleanupService.start().catch((error) => {
    console.error('Failed to start cleanup service:', error);
    process.exit(1);
});
