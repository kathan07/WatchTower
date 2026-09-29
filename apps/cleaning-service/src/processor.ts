import {
    cleanLogs,
    cleanAnalytics,
    getExpiredSubscriptions,
    deactivateSubscriptionAndMonitor,
} from '@repo/prisma';

function getDateFromMonthsAgo(months: number): Date {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date;
}

export async function cleanupOldLogs(): Promise<void> {
    // Retention: purge logs older than 18 months.
    const cutoff = getDateFromMonthsAgo(18);

    try {
        const deletedLogs = await cleanLogs(cutoff);
        console.log(`Cleaned up ${deletedLogs.count} old logs`);
    } catch (error) {
        console.error('Error cleaning up old logs:', error);
    }
}

export async function cleanupOldAnalytics(): Promise<void> {
    // Retention: purge analytics older than 12 months.
    const cutoff = getDateFromMonthsAgo(12);

    try {
        const deletedAnalytics = await cleanAnalytics(cutoff);
        console.log(`Cleaned up ${deletedAnalytics.count} old analytics records`);
    } catch (error) {
        console.error('Error cleaning up old analytics:', error);
    }
}

export async function handleExpiredSubscriptions(): Promise<void> {
    const now = new Date();

    try {
        const expiredSubscriptions = await getExpiredSubscriptions(now);
        for (const subscription of expiredSubscriptions) {
            const monitorId = subscription.user.monitor?.id ?? '';
            await deactivateSubscriptionAndMonitor(subscription.id, monitorId);
        }
    } catch (error) {
        console.error('Error handling expired subscriptions:', error);
    }
}
