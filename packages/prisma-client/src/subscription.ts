import { SubType } from '@prisma/client';
import { prisma } from './client';

export const getActiveSubscriptions = async (userId: string, currentDate: Date) => {
    return prisma.subscription.findFirst({
        where: {
            userId,
            isActive: true,
            expirationDate: { gt: currentDate },
        },
        orderBy: { expirationDate: 'desc' },
    });
};

/**
 * Upserts subscription and activates the user's monitor.
 * Validity maps to day counts: 3→92, 6→183, 12→365.
 */
export const buySubscription = async (
    userId: string,
    planId: string,
    validity: number
): Promise<boolean> => {
    const timeperiod = new Map<number, number>([
        [3, 92],
        [6, 183],
        [12, 365],
    ]);
    const expirationDate = new Date();
    try {
        expirationDate.setDate(expirationDate.getDate() + timeperiod.get(validity)!);
        await prisma.subscription.upsert({
            where: { userId },
            update: {
                type: SubType[planId.toUpperCase() as keyof typeof SubType],
                isActive: true,
                startDate: new Date(),
                expirationDate,
            },
            create: {
                userId,
                isActive: true,
                startDate: new Date(),
                expirationDate,
                type: SubType[planId.toUpperCase() as keyof typeof SubType],
            },
        });
        await prisma.monitor.update({
            where: { userId },
            data: { isActive: true },
        });
        return true;
    } catch {
        return false;
    }
};

export const getExpiredSubscriptions = async (now: Date) => {
    return prisma.subscription.findMany({
        where: {
            expirationDate: { lt: now },
            isActive: true,
        },
        include: {
            user: {
                include: { monitor: true },
            },
        },
    });
};

export const deactivateSubscriptionAndMonitor = async (
    subscriptionId: string,
    monitorId: string
): Promise<void> => {
    try {
        await prisma.$transaction(async (tx) => {
            await tx.subscription.update({
                where: { id: subscriptionId },
                data: { isActive: false },
            });

            if (monitorId) {
                await tx.monitor.update({
                    where: { id: monitorId },
                    data: { isActive: false },
                });
            }
        });

        console.log(
            `Successfully deactivated subscription ${subscriptionId}${monitorId ? ` and monitor ${monitorId}` : ''}`
        );
    } catch (error) {
        console.error(`Error deactivating subscription ${subscriptionId}:`, error);
        throw error;
    }
};
