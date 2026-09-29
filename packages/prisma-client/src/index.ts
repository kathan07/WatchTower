import { User, Status, AnalyticsPeriod, AlertType, AlertStatus, SubType } from '@prisma/client';

export { prisma, connectDb, disconnectDb } from './client';
export { userExists, createUser, createMonitor } from './user';
export {
    getActiveSubscriptions,
    buySubscription,
    getExpiredSubscriptions,
    deactivateSubscriptionAndMonitor,
} from './subscription';
export {
    getActiveWebsites,
    getActiveWebsitesWithMonitors,
    getActiveMonitorsWithWebsitesAndUsers,
} from './website';
export {
    addLog,
    getRecentLogs,
    getAvgResponseTime,
    getStatusCounts,
    cleanLogs,
} from './log';
export { createAnalytics, cleanAnalytics } from './analytics';
export type { Metrics } from './analytics';
export { createAlert } from './alert';

export type { User };
export { Status, AnalyticsPeriod, AlertType, AlertStatus, SubType };
