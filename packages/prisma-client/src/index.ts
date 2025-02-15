import { PrismaClient, User, Status, AnalyticsPeriod } from '@prisma/client';

const prisma = new PrismaClient();



interface metrics {
    avgResponseTime: number,
    avgUptime: number,
    avgDowntime: number,
    avgDegradedTime: number
}


const connectDb = async () => {
    await prisma.$connect();
}

const disconnectDb = async () => {
    await prisma.$disconnect();
}

const userExists = async (email: string): Promise<User | null> => {
    const user = await prisma.user.findUnique({
        where: { email }
    });
    return user;
}

const createUser = async (username: string, password: string, email: string) => {
    await prisma.user.create({
        data: {
            username,
            email,
            password
        },
    })
}

const cleanLogs = async (date: Date) => {
    const deletedLogs = await prisma.log.deleteMany({
        where: {
            timestamp: {
                lt: date
            }
        }
    });
    return deletedLogs;
}

const cleanAnalytics = async (date: Date) => {
    const deletedAnalytics = await prisma.analytics.deleteMany({
        where: {
            date: {
                lt: date
            }
        }
    });
    return deletedAnalytics;
}

const getExpiredSubscriptions = async (now: Date) => {
    const expiredSubscriptions = await prisma.subscription.findMany({
        where: {
            expirationDate: {
                lt: now
            },
            isActive: true
        },
        include: {
            user: {
                include: {
                    monitor: true
                }
            }
        }
    });
    return expiredSubscriptions;
}


const deactivateSubscriptionAndMonitor = async (subscriptionId: string, monitorId: string) => {
    try {
        await prisma.$transaction(async (tx: any) => {
            await tx.subscription.update({
                where: { id: subscriptionId },
                data: { isActive: false }
            });

            if (monitorId) {
                await tx.monitor.update({
                    where: { id: monitorId },
                    data: { isActive: false }
                });
            }
        });

        console.log(`Successfully deactivated subscription ${subscriptionId}${monitorId ? ` and monitor ${monitorId}` : ''}`);
    } catch (error) {
        console.error(`Error deactivating subscription ${subscriptionId}:`, error);
        throw error;
    }
};



const getActiveWebsites = async () => {
    const activeWebsites = await prisma.website.findMany({
        where: {
            monitors: {
                some: {
                    isActive: true
                }
            }
        },
        select: {
            id: true,
            url: true,
        }
    });
    return activeWebsites;
}

const getAvgResponseTime = async (websiteId: string, startDate: Date, endDate: Date) => {
    const avgResponseTime = await prisma.log.aggregate({
        where: {
            websiteId,
            timestamp: {
                gte: startDate,
                lte: endDate
            }
        },
        _avg: {
            responseTime: true
        },
        _count: {
            _all: true
        }
    });
    return avgResponseTime;
}

const getStatusCounts = async (websiteId: string, startDate: Date, endDate: Date) => {
    const statusCounts = await prisma.log.groupBy({
        by: ['status'],
        where: {
            websiteId,
            timestamp: {
                gte: startDate,
                lte: endDate
            }
        },
        _count: {
            status: true
        }
    });

    return statusCounts;
}

const createAnalytics = async (websiteId: string, startDate: Date, metrics: metrics, periodType: AnalyticsPeriod) => {
    await prisma.analytics.upsert({
        where: {
            websiteId_periodType_date: {
                websiteId: websiteId,
                periodType: periodType,
                date: startDate
            }
        },
        create: {
            websiteId: websiteId,
            periodType: periodType,
            date: startDate,
            ...metrics
        },
        update: metrics
    });
}
const addLog = async (websiteId: string, status: Status, responseTime: number | null) => {
    await prisma.log.create({
        data: {
            websiteId,
            status,
            responseTime,
        },
    });
};

export type {User};
export { prisma, userExists, createUser, cleanLogs, cleanAnalytics, getExpiredSubscriptions, deactivateSubscriptionAndMonitor, connectDb, disconnectDb, getActiveWebsites, getAvgResponseTime, getStatusCounts, createAnalytics, addLog, Status, AnalyticsPeriod };

