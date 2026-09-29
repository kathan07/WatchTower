import { getActiveWebsitesWithMonitors } from '@repo/prisma';
import type { MonitoringJob, WebsiteWithMonitor } from '@repo/shared';
import {
    redisClient,
    monitoringQueue,
    WEBSITE_CACHE_KEY,
    WEBSITE_CACHE_TTL,
} from '@repo/redis';

function getDynamicBatchSize(totalWebsites: number): number {
    if (totalWebsites < 500) return 50;
    if (totalWebsites > 5000) return 500;
    return 100;
}

export async function refreshWebsiteCache(): Promise<void> {
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

        // Keep serving stale cache when refresh fails so monitoring stays online.
        const existingCache = await redisClient.get(WEBSITE_CACHE_KEY);
        if (!existingCache) {
            throw error;
        }
    }
}

async function getWebsitesFromCache(): Promise<WebsiteWithMonitor[]> {
    const cachedData = await redisClient.get(WEBSITE_CACHE_KEY);

    if (!cachedData) {
        await refreshWebsiteCache();
        const newCache = await redisClient.get(WEBSITE_CACHE_KEY);
        if (!newCache) {
            throw new Error('Failed to get websites from cache');
        }
        return JSON.parse(newCache);
    }

    return JSON.parse(cachedData);
}

export async function scheduleMonitoringJobs(
    isShuttingDown: () => boolean
): Promise<void> {
    if (isShuttingDown()) {
        return;
    }

    try {
        const websites = await getWebsitesFromCache();
        const batchSize = getDynamicBatchSize(websites.length);

        console.log(`Using batch size of ${batchSize} for ${websites.length} websites`);

        for (let i = 0; i < websites.length; i += batchSize) {
            const batch = websites.slice(i, i + batchSize);
            const batchStartTime = Date.now();

            await Promise.all(
                batch.map(async (website) => {
                    try {
                        const jobPayload: MonitoringJob = {
                            websiteId: website.id,
                            url: website.url,
                        };
                        await monitoringQueue.add(
                            'monitor',
                            jobPayload,
                            {
                                attempts: 3,
                                backoff: {
                                    type: 'exponential',
                                    delay: 1000,
                                },
                                removeOnComplete: true,
                                removeOnFail: false,
                                lifo: false,
                            }
                        );
                    } catch (error) {
                        console.error(
                            `Error scheduling job for website ${website.id}:`,
                            error
                        );
                    }
                })
            );

            const batchDuration = Date.now() - batchStartTime;
            console.log(
                `Processed batch of ${batch.length} websites in ${batchDuration}ms`
            );
        }

        console.log(`Scheduled monitoring jobs for ${websites.length} websites`);
    } catch (error) {
        console.error('Error scheduling monitoring jobs:', error);
    }
}
