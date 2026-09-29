import { CronJob } from 'cron';
import { connectDb, disconnectDb, prisma } from '@repo/prisma';
import {
    resolveHealthPort,
    startProbeServer,
    type HealthCheck,
    type ProbeServerHandle,
} from '@repo/shared';
import {
    cleanupOldAnalytics,
    cleanupOldLogs,
    handleExpiredSubscriptions,
} from './processor';

class CleanupService {
    private logCleanupJob!: CronJob;
    private analyticsCleanupJob!: CronJob;
    private subscriptionCheckJob!: CronJob;
    private probe: ProbeServerHandle | null = null;

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

            const healthPort = resolveHealthPort('cleaning-service');
            this.probe = await startProbeServer({
                port: healthPort,
                service: 'cleaning-service',
                getChecks: async () => {
                    const checks: Record<string, HealthCheck> = {};
                    try {
                        await prisma.$queryRaw`SELECT 1`;
                        checks.postgres = { status: 'up' };
                    } catch (err) {
                        checks.postgres = {
                            status: 'down',
                            detail: err instanceof Error ? err.message : 'unreachable',
                        };
                    }
                    return checks;
                },
            });
            console.log(`Probe server listening on port ${healthPort}`);

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
            if (this.probe) {
                await this.probe.close();
            }
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
