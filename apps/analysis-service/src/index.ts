import { CronJob } from 'cron';
import { connectDb, disconnectDb, prisma } from '@repo/prisma';
import {
    resolveHealthPort,
    startProbeServer,
    type HealthCheck,
    type ProbeServerHandle,
} from '@repo/shared';
import {
    processDailyAnalytics,
    processMonthlyAnalytics,
    processYearlyAnalytics,
} from './processor';

class AnalyticsService {
    private dailyJob: CronJob;
    private monthlyJob: CronJob;
    private yearlyJob: CronJob;
    private probe: ProbeServerHandle | null = null;

    constructor() {
        this.dailyJob = new CronJob('59 59 23 * * *', () => processDailyAnalytics());

        // Cron fires on days 28–31; gate so monthly rollup runs only on the real last day.
        this.monthlyJob = new CronJob('59 59 23 28-31 * *', () => {
            const now = new Date();
            const lastDayOfMonth = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0
            ).getDate();
            if (now.getDate() === lastDayOfMonth) {
                void processMonthlyAnalytics();
            }
        });

        this.yearlyJob = new CronJob('59 59 23 31 12 *', () => processYearlyAnalytics());
    }

    public async start(): Promise<void> {
        try {
            await connectDb();
            console.log('Database connection established');

            const healthPort = resolveHealthPort('analysis-service');
            this.probe = await startProbeServer({
                port: healthPort,
                service: 'analysis-service',
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

            this.dailyJob.start();
            this.monthlyJob.start();
            this.yearlyJob.start();

            console.log('Analytics service started');

            process.on('SIGTERM', () => this.shutdown());
            process.on('SIGINT', () => this.shutdown());
        } catch (error) {
            console.error('Failed to start analytics service:', error);
            process.exit(1);
        }
    }

    private async shutdown(): Promise<void> {
        console.log('Shutting down analytics service...');

        this.dailyJob.stop();
        this.monthlyJob.stop();
        this.yearlyJob.stop();

        try {
            if (this.probe) {
                await this.probe.close();
            }
            await disconnectDb();
            console.log('Cleanup completed successfully');
        } catch (error) {
            console.error('Error during shutdown:', error);
        } finally {
            process.exit(0);
        }
    }
}

const analyticsService = new AnalyticsService();
analyticsService.start().catch((error) => {
    console.error('Failed to start analytics service:', error);
    process.exit(1);
});
