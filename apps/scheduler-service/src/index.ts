import { connectDb, disconnectDb, prisma } from '@repo/prisma';
import { CronJob } from 'cron';
import { redisClient } from '@repo/redis';
import {
    resolveHealthPort,
    startProbeServer,
    type HealthCheck,
    type ProbeServerHandle,
} from '@repo/shared';
import { refreshWebsiteCache, scheduleMonitoringJobs } from './processor';

class SchedulerService {
    private websiteRefreshJob: CronJob;
    private monitoringScheduleJob: CronJob;
    private isShuttingDown = false;
    private probe: ProbeServerHandle | null = null;

    constructor() {
        this.websiteRefreshJob = new CronJob('*/30 * * * *', () => refreshWebsiteCache());
        this.monitoringScheduleJob = new CronJob('*/1 * * * *', () =>
            scheduleMonitoringJobs(() => this.isShuttingDown)
        );
    }

    public async start(): Promise<void> {
        try {
            await redisClient.ping();
            console.log('Redis connection established');

            await connectDb();
            console.log('Database connection established');

            const healthPort = resolveHealthPort('scheduler-service');
            this.probe = await startProbeServer({
                port: healthPort,
                service: 'scheduler-service',
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
                    try {
                        await redisClient.ping();
                        checks.redis = { status: 'up' };
                    } catch (err) {
                        checks.redis = {
                            status: 'down',
                            detail: err instanceof Error ? err.message : 'unreachable',
                        };
                    }
                    return checks;
                },
            });
            console.log(`Probe server listening on port ${healthPort}`);

            await refreshWebsiteCache();

            this.websiteRefreshJob.start();
            this.monitoringScheduleJob.start();

            console.log('Scheduler service started');

            process.on('SIGTERM', () => this.shutdown());
            process.on('SIGINT', () => this.shutdown());
        } catch (error) {
            console.error('Failed to start scheduler service:', error);
            process.exit(1);
        }
    }

    private async shutdown(): Promise<void> {
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;
        console.log('Shutting down scheduler service...');

        this.websiteRefreshJob.stop();
        this.monitoringScheduleJob.stop();

        try {
            if (this.probe) {
                await this.probe.close();
            }
            await disconnectDb();
            await redisClient.quit();
            console.log('Cleanup completed successfully');
        } catch (error) {
            console.error('Error during shutdown:', error);
        } finally {
            process.exit(0);
        }
    }
}

const schedulerService = new SchedulerService();
schedulerService.start().catch((error) => {
    console.error('Failed to start scheduler service:', error);
    process.exit(1);
});
