import {
    AnalyticsPeriod,
    Status,
    getActiveWebsites,
    getAvgResponseTime,
    getStatusCounts,
    createAnalytics,
} from '@repo/prisma';
import {
    startOfDay,
    endOfDay,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
} from 'date-fns';
import type { AnalyticsMetrics } from '@repo/shared';

const BATCH_SIZE = 5;

async function calculateMetrics(
    websiteId: string,
    startDate: Date,
    endDate: Date
): Promise<AnalyticsMetrics> {
    const metrics = await getAvgResponseTime(websiteId, startDate, endDate);
    const statusCounts = await getStatusCounts(websiteId, startDate, endDate);
    const totalLogs = metrics._count._all;

    const statusMap: Record<Status, number> = {
        [Status.UP]: 0,
        [Status.DOWN]: 0,
        [Status.DEGRADED]: 0,
    };

    statusCounts.forEach((count) => {
        statusMap[count.status] = count._count.status;
    });

    if (totalLogs === 0) {
        return {
            avgResponseTime: 0,
            avgUptime: 0,
            avgDowntime: 0,
            avgDegradedTime: 0,
        };
    }

    return {
        avgResponseTime: metrics._avg.responseTime || 0,
        avgUptime: (statusMap[Status.UP] / totalLogs) * 100,
        avgDowntime: (statusMap[Status.DOWN] / totalLogs) * 100,
        avgDegradedTime: (statusMap[Status.DEGRADED] / totalLogs) * 100,
    };
}

export async function processAnalytics(
    startDate: Date,
    endDate: Date,
    periodType: AnalyticsPeriod
): Promise<void> {
    try {
        const activeWebsites = await getActiveWebsites();
        console.log(
            `Processing ${periodType} analytics for ${activeWebsites.length} active websites`
        );

        for (let i = 0; i < activeWebsites.length; i += BATCH_SIZE) {
            const batch = activeWebsites.slice(i, i + BATCH_SIZE);
            await Promise.all(
                batch.map(async (website) => {
                    try {
                        const metrics = await calculateMetrics(
                            website.id,
                            startDate,
                            endDate
                        );
                        await createAnalytics(website.id, startDate, metrics, periodType);
                        console.log(
                            `Processed ${periodType} analytics for website: ${website.url}`
                        );
                    } catch (error) {
                        console.error(
                            `Error processing analytics for website ${website.url}:`,
                            error
                        );
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

export async function processDailyAnalytics(): Promise<void> {
    const now = new Date();
    await processAnalytics(startOfDay(now), endOfDay(now), AnalyticsPeriod.DAILY);
}

export async function processMonthlyAnalytics(): Promise<void> {
    const now = new Date();
    await processAnalytics(startOfMonth(now), endOfMonth(now), AnalyticsPeriod.MONTHLY);
}

export async function processYearlyAnalytics(): Promise<void> {
    const now = new Date();
    await processAnalytics(startOfYear(now), endOfYear(now), AnalyticsPeriod.YEARLY);
}
