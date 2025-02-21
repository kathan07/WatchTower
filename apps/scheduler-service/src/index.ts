import { connectDb, disconnectDb, getActiveWebsitesWithMonitors} from '@repo/prisma';
import { CronJob } from 'cron';
import {
  redisClient,
  monitoringQueue,
  WEBSITE_CACHE_KEY,
  WEBSITE_CACHE_TTL
} from '@repo/redis';

interface WebsiteData {
  id: string;
  url: string;
  monitor: {
    isActive: boolean;
  } | null;
}

class SchedulerService {
  private websiteRefreshJob: CronJob;
  private monitoringScheduleJob: CronJob;
  private isShuttingDown = false;

  constructor() {
    // Refresh website cache every 30 minutes
    this.websiteRefreshJob = new CronJob('*/30 * * * *', () => this.refreshWebsiteCache());

    // Schedule monitoring jobs every minute
    this.monitoringScheduleJob = new CronJob('*/1 * * * *', () => this.scheduleMonitoringJobs());
  }

  private getDynamicBatchSize(totalWebsites: number): number {
    if (totalWebsites < 500) {
      return 50;  // Smaller batch size for smaller systems
    } else if (totalWebsites > 5000) {
      return 500; // Larger batch size for large-scale deployments
    }
    return 100;   // Default batch size for medium-scale systems
  }

  private async refreshWebsiteCache(): Promise<void> {
    try {
      console.log('Refreshing website cache...');

      const websites = await getActiveWebsitesWithMonitors();

      await redisClient.setex(
        WEBSITE_CACHE_KEY,
        WEBSITE_CACHE_TTL,
        JSON.stringify(websites)
      );

      console.log(`Cached ${websites.length} websites successfully`);
    } catch (error) {
      console.error('Error refreshing website cache:', error);

      const existingCache = await redisClient.get(WEBSITE_CACHE_KEY);
      if (!existingCache) {
        throw error;
      }
    }
  }

  private async getWebsitesFromCache(): Promise<WebsiteData[]> {
    const cachedData = await redisClient.get(WEBSITE_CACHE_KEY);

    if (!cachedData) {
      await this.refreshWebsiteCache();
      const newCache = await redisClient.get(WEBSITE_CACHE_KEY);
      if (!newCache) {
        throw new Error('Failed to get websites from cache');
      }
      return JSON.parse(newCache);
    }

    return JSON.parse(cachedData);
  }

  private async scheduleMonitoringJobs(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    try {
      const websites = await this.getWebsitesFromCache();
      const batchSize = this.getDynamicBatchSize(websites.length);

      console.log(`Using batch size of ${batchSize} for ${websites.length} websites`);

      // Process websites in dynamically sized batches
      for (let i = 0; i < websites.length; i += batchSize) {
        const batch = websites.slice(i, i + batchSize);
        const batchStartTime = Date.now();

        await Promise.all(
          batch.map(async (website) => {
            try {
              await monitoringQueue.add(
                'monitor', // Add this job name/type string
                {  // Now the data object is the second parameter
                  websiteId: website.id,
                  url: website.url
                },
                {
                  attempts: 3,
                  backoff: {
                    type: 'exponential',
                    delay: 1000
                  },
                  removeOnComplete: true,
                  removeOnFail: false,
                  lifo: false
                }
              );
            } catch (error) {
              console.error(`Error scheduling job for website ${website.id}:`, error);
            }
          })
        );

        const batchDuration = Date.now() - batchStartTime;
        console.log(`Processed batch of ${batch.length} websites in ${batchDuration}ms`);
      }

      console.log(`Scheduled monitoring jobs for ${websites.length} websites`);
    } catch (error) {
      console.error('Error scheduling monitoring jobs:', error);
    }
  }

  public async start(): Promise<void> {
    try {
      await redisClient.ping();
      console.log('Redis connection established');

      await connectDb();
      console.log('Database connection established');

      await this.refreshWebsiteCache();

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

// Start the service
const schedulerService = new SchedulerService();
schedulerService.start().catch((error) => {
  console.error('Failed to start scheduler service:', error);
  process.exit(1);
});