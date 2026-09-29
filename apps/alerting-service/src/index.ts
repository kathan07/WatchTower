import { connectDb, disconnectDb, prisma } from '@repo/prisma';
import { CronJob } from 'cron';
import { redisClient } from '@repo/redis';
import dotenv from 'dotenv';
import {
    resolveHealthPort,
    startProbeServer,
    type HealthCheck,
    type ProbeServerHandle,
} from '@repo/shared';
import { checkAlertConditions, createEmailTransporter } from './processor';

dotenv.config();

class AlertingService {
    private alertCheckJob: CronJob;
    private emailTransporter = createEmailTransporter();
    private isShuttingDown = false;
    private probe: ProbeServerHandle | null = null;

    constructor() {
        this.alertCheckJob = new CronJob('*/1 * * * *', () =>
            checkAlertConditions(this.emailTransporter, () => this.isShuttingDown)
        );
    }

    public async start(): Promise<void> {
        try {
            await redisClient.ping();
            console.log('Redis connection established');

            await connectDb();
            console.log('Database connection established');

            await this.emailTransporter.verify();
            console.log('Email transport verified');

            const healthPort = resolveHealthPort('alerting-service');
            this.probe = await startProbeServer({
                port: healthPort,
                service: 'alerting-service',
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

            this.alertCheckJob.start();
            console.log('Alerting service started');

            process.on('SIGTERM', () => this.shutdown());
            process.on('SIGINT', () => this.shutdown());
        } catch (error) {
            console.error('Failed to start alerting service:', error);
            process.exit(1);
        }
    }

    private async shutdown(): Promise<void> {
        if (this.isShuttingDown) return;

        this.isShuttingDown = true;
        console.log('Shutting down alerting service...');

        this.alertCheckJob.stop();

        try {
            if (this.probe) {
                await this.probe.close();
            }
            await disconnectDb();
            await redisClient.quit();
            this.emailTransporter.close();
            console.log('Cleanup completed successfully');
        } catch (error) {
            console.error('Error during shutdown:', error);
        } finally {
            process.exit(0);
        }
    }
}

const alertingService = new AlertingService();
alertingService.start().catch((error) => {
    console.error('Failed to start alerting service:', error);
    process.exit(1);
});
