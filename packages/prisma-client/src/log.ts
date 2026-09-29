import { Status } from '@prisma/client';
import { prisma } from './client';

export const addLog = async (
    websiteId: string,
    status: Status,
    responseTime: number | null
): Promise<void> => {
    await prisma.log.create({
        data: {
            websiteId,
            status,
            responseTime,
        },
    });
};

export const getRecentLogs = async (websiteId: string, timestamp: Date) => {
    return prisma.log.findMany({
        where: {
            websiteId,
            timestamp: { gte: timestamp },
        },
        orderBy: { timestamp: 'desc' },
    });
};

export const getAvgResponseTime = async (
    websiteId: string,
    startDate: Date,
    endDate: Date
) => {
    return prisma.log.aggregate({
        where: {
            websiteId,
            timestamp: { gte: startDate, lte: endDate },
        },
        _avg: { responseTime: true },
        _count: { _all: true },
    });
};

export const getStatusCounts = async (
    websiteId: string,
    startDate: Date,
    endDate: Date
) => {
    return prisma.log.groupBy({
        by: ['status'],
        where: {
            websiteId,
            timestamp: { gte: startDate, lte: endDate },
        },
        _count: { status: true },
    });
};

export const cleanLogs = async (date: Date) => {
    return prisma.log.deleteMany({
        where: {
            timestamp: { lt: date },
        },
    });
};
