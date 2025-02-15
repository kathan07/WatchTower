import { CronJob } from 'cron';
import { cleanLogs, cleanAnalytics, getExpiredSubscriptions, deactivateSubscriptionAndMonitor, connectDb, disconnectDb } from '@repo/prisma';

class CleanupService {
  // Initialize with undefined to satisfy TypeScript
  private logCleanupJob!: CronJob;
  private analyticsCleanupJob!: CronJob;
  private subscriptionCheckJob!: CronJob;

  constructor() {
    this.initializeErrorHandlers();
  }

  private getDateFromMonthsAgo(months: number): Date {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date;
  }

  private async cleanupOldLogs(): Promise<void> {
    const oneYearAgo = this.getDateFromMonthsAgo(18);

    try {
      const deletedLogs = await cleanLogs(oneYearAgo);
      console.log(`Cleaned up ${deletedLogs.count} old logs`);
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
    }
  }

  private async cleanupOldAnalytics(): Promise<void> {
    const oneYearAgo = this.getDateFromMonthsAgo(12);

    try {
      const deletedAnalytics = await cleanAnalytics(oneYearAgo);
      console.log(`Cleaned up ${deletedAnalytics.count} old analytics records`);
    } catch (error) {
      console.error('Error cleaning up old analytics:', error);
    }
  }

  private async handleExpiredSubscriptions(): Promise<void> {
    const now = new Date();

    try {
      const expiredSubscriptions = await getExpiredSubscriptions(now);
      for (const subscription of expiredSubscriptions) {
        // Add null check for monitor
        if (subscription.user.monitor) {
          await deactivateSubscriptionAndMonitor(subscription.id, subscription.user.monitor.id);
        } else {
          // Just deactivate the subscription if there's no monitor
          await deactivateSubscriptionAndMonitor(subscription.id, '');
        }
      }
    } catch (error) {
      console.error('Error handling expired subscriptions:', error);
    }
  }

  private initializeCronJobs(): void {
    // Run logs cleanup daily at 2 AM
    this.logCleanupJob = new CronJob(
      '0 2 * * *',
      () => this.cleanupOldLogs(),
      null,
      true
    );

    // Run analytics cleanup daily at 3 AM
    this.analyticsCleanupJob = new CronJob(
      '0 3 * * *',
      () => this.cleanupOldAnalytics(),
      null,
      true
    );

    // Check for expired subscriptions every hour
    this.subscriptionCheckJob = new CronJob(
      '0 * * * *',
      () => this.handleExpiredSubscriptions(),
      null,
      true
    );
  }

  private initializeErrorHandlers(): void {
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM signal. Cleaning up...');
      await this.stop();
      process.exit(0);
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

// Create and start the service immediately
const cleanupService = new CleanupService();
cleanupService.start().catch(error => {
  console.error('Failed to start cleanup service:', error);
  process.exit(1);
});