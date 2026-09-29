export const dashboardBasePath = '/api/dashboard';

export const dashboardRoutes = {
    addWebsite: '/addwebsite',
    getWebsites: '/getWebsites',
    removeWebsite: '/removewebsite/:websiteId',
    getAnalytics: '/getanalytics/:websiteId',
    getDailyReports: '/getdailyreports/:websiteId',
} as const;

export const dashboardApi = {
    addWebsite: () => `${dashboardBasePath}${dashboardRoutes.addWebsite}`,
    getWebsites: () => `${dashboardBasePath}${dashboardRoutes.getWebsites}`,
    removeWebsite: (websiteId: string) =>
        `${dashboardBasePath}/removewebsite/${encodeURIComponent(websiteId)}`,
    getAnalytics: (websiteId: string) =>
        `${dashboardBasePath}/getanalytics/${encodeURIComponent(websiteId)}`,
    getDailyReports: (websiteId: string, timeRange?: string) => {
        const path = `${dashboardBasePath}/getdailyreports/${encodeURIComponent(websiteId)}`;
        if (timeRange === undefined) {
            return path;
        }
        return `${path}?timeRange=${encodeURIComponent(timeRange)}`;
    },
} as const;
