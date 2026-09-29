import { prisma, AnalyticsPeriod } from '@repo/prisma';
import {
    startOfDay,
    endOfDay,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    subDays,
    subMonths,
    subYears,
} from 'date-fns';
import { redisClient, WEBSITE_CACHE_KEY, WEBSITE_CACHE_TTL } from '@repo/redis';
import {
    MAX_WEBSITES_PER_MONITOR,
    type AddWebsiteResult,
    type AnalyticsForWebsiteData,
    type AnalyticsMetrics,
    type DailyReportsData,
    type WebsiteWithMonitor,
    type WebsitesListData,
} from '@repo/shared';
import { errorHandler } from '../middleware/error';

function isValidUrl(url: string): boolean {
    try {
        const urlObject = new URL(url);
        return ['http:', 'https:'].includes(urlObject.protocol);
    } catch {
        return false;
    }
}

function normalizeUrl(url: string): string {
    try {
        const urlObject = new URL(url);
        const pathname = urlObject.pathname.replace(/\/+$/, '');
        return `${urlObject.protocol}//${urlObject.host}${pathname}`;
    } catch {
        throw errorHandler(400, 'Invalid URL format');
    }
}

const formatMetrics = (analytics: AnalyticsMetrics): AnalyticsMetrics => ({
    avgResponseTime: Number(analytics.avgResponseTime.toFixed(2)),
    avgUptime: Number(analytics.avgUptime.toFixed(2)),
    avgDowntime: Number(analytics.avgDowntime.toFixed(2)),
    avgDegradedTime: Number(analytics.avgDegradedTime.toFixed(2)),
});

const formatDate = (date: Date, format: 'YYYY-MM' | 'YYYY'): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return format === 'YYYY-MM' ? `${year}-${month}` : year.toString();
};

export async function addWebsiteForUser(
    userId: string,
    url: string
): Promise<AddWebsiteResult> {
    if (!url?.trim()) {
        throw errorHandler(400, 'URL is required');
    }
    if (!isValidUrl(url)) {
        throw errorHandler(400, 'Invalid URL format. Must be a valid HTTP/HTTPS URL');
    }

    const normalizedUrl = normalizeUrl(url);

    const monitor = await prisma.monitor.findUnique({
        where: {
            userId,
            isActive: true,
        },
        include: {
            websites: {
                select: { url: true },
            },
        },
    });

    if (!monitor) {
        throw errorHandler(404, 'Active monitor not found');
    }

    if (monitor.websites.length >= MAX_WEBSITES_PER_MONITOR) {
        throw errorHandler(400, `Maximum limit of ${MAX_WEBSITES_PER_MONITOR} websites reached`);
    }

    if (monitor.websites.some((w) => w.url === normalizedUrl)) {
        throw errorHandler(400, 'Website is already being monitored');
    }

    const result = await prisma.$transaction(async (tx) => {
        const website = await tx.website.upsert({
            where: { url: normalizedUrl },
            update: {},
            create: { url: normalizedUrl },
        });

        await tx.monitor.update({
            where: { userId },
            data: {
                websites: {
                    connect: { id: website.id },
                },
            },
        });

        // Keep scheduler cache in sync so new sites are polled without waiting for TTL expiry.
        const cachedData = await redisClient.get(WEBSITE_CACHE_KEY);
        if (cachedData) {
            const websites: WebsiteWithMonitor[] = JSON.parse(cachedData);
            const websiteExists = websites.some((w) => w.id === website.id);
            if (!websiteExists) {
                websites.push({
                    id: website.id,
                    url: website.url,
                    monitor: { isActive: true },
                });
                await redisClient.setex(
                    WEBSITE_CACHE_KEY,
                    WEBSITE_CACHE_TTL,
                    JSON.stringify(websites)
                );
            }
        }

        return website;
    });

    return { id: result.id, url: result.url };
}

export async function getWebsitesForUser(userId: string): Promise<WebsitesListData> {
    const monitor = await prisma.monitor.findFirst({
        where: { userId, isActive: true },
        include: {
            websites: {
                select: { id: true, url: true },
            },
        },
    });

    if (!monitor) {
        throw errorHandler(404, 'No active monitor found');
    }

    return {
        monitorId: monitor.id,
        websiteCount: monitor.websites.length,
        websites: monitor.websites,
    };
}

export async function removeWebsiteForUser(userId: string, websiteId: string): Promise<void> {
    if (!websiteId?.trim()) {
        throw errorHandler(400, 'Website ID is required');
    }

    await prisma.$transaction(async (tx) => {
        const monitor = await tx.monitor.findFirst({
            where: {
                userId,
                isActive: true,
                websites: { some: { id: websiteId } },
            },
        });

        if (!monitor) {
            throw errorHandler(404, 'Website not found in your active monitor');
        }

        return await tx.monitor.update({
            where: { userId },
            data: {
                websites: {
                    disconnect: { id: websiteId },
                },
            },
        });
    });
}

export async function getAnalyticsForWebsite(
    userId: string,
    websiteId: string
): Promise<AnalyticsForWebsiteData> {
    const currentDate = new Date();

    const dateRanges = {
        daily: {
            start: startOfDay(subDays(currentDate, 1)),
            end: endOfDay(subDays(currentDate, 1)),
        },
        monthly: {
            start: startOfMonth(subMonths(currentDate, 1)),
            end: endOfMonth(subMonths(currentDate, 1)),
        },
        yearly: {
            start: startOfYear(subYears(currentDate, 1)),
            end: endOfYear(subYears(currentDate, 1)),
        },
    };

    const website = await prisma.website.findFirst({
        where: {
            id: websiteId,
            monitors: { some: { userId, isActive: true } },
        },
        select: {
            id: true,
            url: true,
            monitors: {
                where: { userId, isActive: true },
                select: { id: true },
                take: 1,
            },
        },
    });

    if (!website) {
        throw errorHandler(404, 'Website not found or not associated with an active monitor');
    }

    const monitorId = website.monitors[0]?.id;
    if (!monitorId) {
        throw errorHandler(404, 'Website not found or not associated with an active monitor');
    }

    const analyticsQueries = Object.entries(dateRanges).map(([period, { start, end }]) =>
        prisma.analytics.findFirst({
            where: {
                websiteId,
                periodType: period.toUpperCase() as AnalyticsPeriod,
                date: { gte: start, lte: end },
            },
            select: {
                date: true,
                avgResponseTime: true,
                avgUptime: true,
                avgDowntime: true,
                avgDegradedTime: true,
            },
        })
    );

    const [daily, monthly, yearly] = await Promise.all(analyticsQueries);

    return {
        monitorId,
        website: {
            websiteId: website.id,
            url: website.url,
            analytics: {
                daily: daily
                    ? { date: daily.date.toISOString(), ...formatMetrics(daily) }
                    : null,
                monthly: monthly
                    ? { period: formatDate(monthly.date, 'YYYY-MM'), ...formatMetrics(monthly) }
                    : null,
                yearly: yearly
                    ? { year: formatDate(yearly.date, 'YYYY'), ...formatMetrics(yearly) }
                    : null,
            },
        },
    };
}

export async function getDailyReportsForWebsite(
    userId: string,
    websiteId: string,
    timeRange: string = '5'
): Promise<DailyReportsData> {
    const currentDate = new Date();
    const endDate = endOfDay(subDays(currentDate, 1));
    const startDate = startOfDay(subDays(currentDate, +timeRange));

    const website = await prisma.website.findFirst({
        where: {
            id: websiteId,
            monitors: { some: { userId, isActive: true } },
        },
        select: {
            id: true,
            url: true,
            monitors: {
                where: { userId, isActive: true },
                select: { id: true },
                take: 1,
            },
        },
    });

    if (!website) {
        throw errorHandler(404, 'Website not found or not associated with an active monitor');
    }

    const monitorId = website.monitors[0]?.id;
    if (!monitorId) {
        throw errorHandler(404, 'Website not found or not associated with an active monitor');
    }

    const dailyReports = await prisma.analytics.findMany({
        where: {
            websiteId,
            periodType: 'DAILY',
            date: { gte: startDate, lte: endDate },
        },
        select: {
            date: true,
            avgResponseTime: true,
            avgUptime: true,
            avgDowntime: true,
            avgDegradedTime: true,
        },
        orderBy: { date: 'asc' },
    });

    const formattedReports = dailyReports.map((report) => ({
        date: `${report.date.getFullYear()}-${String(report.date.getMonth() + 1).padStart(2, '0')}-${String(report.date.getDate()).padStart(2, '0')}`,
        ...formatMetrics(report),
    }));

    return {
        monitorId,
        website: {
            websiteId: website.id,
            url: website.url,
            timeframe: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
            },
            dailyReports: formattedReports,
        },
    };
}
