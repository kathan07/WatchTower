import { PrismaClient, User, Status, AnalyticsPeriod, AlertType, AlertStatus, SubType } from '@prisma/client';

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
    const newUser = await prisma.user.create({
        data: {
            username,
            email,
            password
        },
        select: {
            id: true
        }
    });
    return newUser;
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

const getActiveWebsitesWithMonitors = async () => {
    const websites = await prisma.website.findMany({
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
            monitors: {
                select: {
                    isActive: true
                }
            }
        }
    });
    return websites;
}


const getActiveMonitorsWithWebsitesAndUsers = async () => {
    const activeMonitors = await prisma.monitor.findMany({
        where: {
            isActive: true
        },
        select: {
            userId: true,
            user: {
                select: {
                    email: true
                }
            },
            websites: {
                select: {
                    id: true,
                    url: true
                }
            }
        }
    });
    return activeMonitors;
}

const getRecentLogs = async (websiteId: string, timestamp: Date) => {
    const recentLogs = await prisma.log.findMany({
        where: {
            websiteId: websiteId,
            timestamp: {
                gte: timestamp
            }
        },
        orderBy: {
            timestamp: 'desc'
        }
    });
    return recentLogs;
}

const createAlert = async (websiteId: string, type: AlertType, status: AlertStatus, message: string) => {
    const alert = await prisma.alert.create({
        data: {
            websiteId: websiteId,
            type: type,
            message: message,
            status: status
        }
    });
    return alert;
}

const createMonitor = async (userId: string) => {
    await prisma.monitor.create({
        data: {
            userId: userId,
            isActive: false
        }
    });
}

const getActiveSubscriptions = async (userId: string, currentDate: Date) => {
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId: userId,
            isActive: true,
            expirationDate: {
                gt: currentDate
            }
        },
        orderBy: {
            expirationDate: 'desc'
        },
    });
    return subscription;
}


export type { User };
export { prisma, userExists, createUser, cleanLogs, cleanAnalytics, getExpiredSubscriptions, deactivateSubscriptionAndMonitor, connectDb, disconnectDb, getActiveWebsites, getAvgResponseTime, getStatusCounts, createAnalytics, addLog, getActiveWebsitesWithMonitors, getRecentLogs, createAlert, getActiveMonitorsWithWebsitesAndUsers, createMonitor, getActiveSubscriptions, Status, AnalyticsPeriod, AlertType, AlertStatus, SubType};

