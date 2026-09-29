import { AnalyticsPeriod } from '@prisma/client';
import { prisma } from './client';

export interface Metrics {
    avgResponseTime: number;
    avgUptime: number;
    avgDowntime: number;
    avgDegradedTime: number;
}

export const createAnalytics = async (
    websiteId: string,
    startDate: Date,
    metrics: Metrics,
    periodType: AnalyticsPeriod
): Promise<void> => {
    await prisma.analytics.upsert({
        where: {
            websiteId_periodType_date: {
                websiteId,
                periodType,
                date: startDate,
            },
        },
        create: {
            websiteId,
            periodType,
            date: startDate,
            ...metrics,
        },
        update: metrics,
    });
};

export const cleanAnalytics = async (date: Date) => {
    return prisma.analytics.deleteMany({
        where: {
            date: { lt: date },
        },
    });
};
