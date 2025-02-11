import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

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
        await prisma.$transaction(async (tx) => {
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


export { prisma, userExists, createUser, cleanLogs, cleanAnalytics, getExpiredSubscriptions, deactivateSubscriptionAndMonitor, User };

