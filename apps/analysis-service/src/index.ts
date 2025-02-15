import { CronJob } from 'cron';
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear
} from 'date-fns';
import { AnalyticsPeriod, Status, connectDb, disconnectDb, getActiveWebsites, getAvgResponseTime, getStatusCounts, createAnalytics } from '@repo/prisma';

class AnalyticsService {
  private dailyJob: CronJob;
  private monthlyJob: CronJob;
  private yearlyJob: CronJob;

  constructor() {
    // Run daily at 23:59:59
    this.dailyJob = new CronJob('59 59 23 * * *', () => this.processDailyAnalytics());

    // Run monthly on the last few days at 23:59:59
    this.monthlyJob = new CronJob('59 59 23 28-31 * *', () => {
      const now = new Date();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      if (now.getDate() === lastDayOfMonth) {
        this.processMonthlyAnalytics();
      }
    });

    // Run yearly on December 31st at 23:59:59
    this.yearlyJob = new CronJob('59 59 23 31 12 *', () => this.processYearlyAnalytics());
  }

  private async calculateMetrics(websiteId: string, startDate: Date, endDate: Date) {

    const metrics = await getAvgResponseTime(websiteId, startDate, endDate);

    const statusCounts = await getStatusCounts(websiteId, startDate, endDate);
  
    const totalLogs = metrics._count._all;

    // Create status map with defaults
    const statusMap: Record<Status, number> = {
      [Status.UP]: 0,
      [Status.DOWN]: 0,
      [Status.DEGRADED]: 0
    };

    // Update with actual counts
    statusCounts.forEach(count => {
      statusMap[count.status] = count._count.status;
    });

    // If no logs exist for the period, return default values
    if (totalLogs === 0) {
      return {
        avgResponseTime: 0,
        avgUptime: 0,
        avgDowntime: 0,
        avgDegradedTime: 0
      };
    }

    return {
      avgResponseTime: metrics._avg.responseTime || 0,
      avgUptime: (statusMap[Status.UP] / totalLogs) * 100,
      avgDowntime: (statusMap[Status.DOWN] / totalLogs) * 100,
      avgDegradedTime: (statusMap[Status.DEGRADED] / totalLogs) * 100
    };
  }

  private async processAnalytics(
    startDate: Date,
    endDate: Date,
    periodType: AnalyticsPeriod
  ) {
    try {
      const activeWebsites = await getActiveWebsites();

      console.log(`Processing ${periodType} analytics for ${activeWebsites.length} active websites`);

      // Process websites in parallel with a concurrency limit
      const batchSize = 5; // Process 5 websites at a time
      for (let i = 0; i < activeWebsites.length; i += batchSize) {
        const batch = activeWebsites.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (website) => {
            try {
              const metrics = await this.calculateMetrics(website.id, startDate, endDate);
              await createAnalytics(website.id, startDate, metrics, periodType);
              console.log(`Processed ${periodType} analytics for website: ${website.url}`);
            } catch (error) {
              console.error(`Error processing analytics for website ${website.url}:`, error);
              // Continue with other websites even if one fails
            }
          })
        );
      }

      console.log(`Completed ${periodType} analytics for period ending ${endDate}`);
    } catch (error) {
      console.error(`Error processing ${periodType} analytics:`, error);
      throw error;
    }
  }

  private async processDailyAnalytics() {
    const now = new Date();
    const start = startOfDay(now);
    const end = endOfDay(now);
    await this.processAnalytics(start, end, AnalyticsPeriod.DAILY);
  }

  private async processMonthlyAnalytics() {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    await this.processAnalytics(start, end, AnalyticsPeriod.MONTHLY);
  }

  private async processYearlyAnalytics() {
    const now = new Date();
    const start = startOfYear(now);
    const end = endOfYear(now);
    await this.processAnalytics(start, end, AnalyticsPeriod.YEARLY);
  }

  public async start() {
    try {
      await connectDb();
      console.log('Database connection established');

      this.dailyJob.start();
      this.monthlyJob.start();
      this.yearlyJob.start();

      console.log('Analytics service started');

      // Setup graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      console.error('Failed to start analytics service:', error);
      process.exit(1);
    }
  }

  private async shutdown() {
    console.log('Shutting down analytics service...');

    this.dailyJob.stop();
    this.monthlyJob.stop();
    this.yearlyJob.stop();

    try {
      await disconnectDb();
      console.log('Cleanup completed successfully');
    } catch (error) {
      console.error('Error during shutdown:', error);
    } finally {
      process.exit(0);
    }
  }
}

// Create and start the service
const analyticsService = new AnalyticsService();
analyticsService.start().catch((error) => {
  console.error('Failed to start analytics service:', error);
  process.exit(1);
});
