export interface AnalyticsMetrics {
    avgResponseTime: number;
    avgUptime: number;
    avgDowntime: number;
    avgDegradedTime: number;
}

export interface WebsiteSummary {
    id: string;
    url: string;
}

export interface WebsitesListData {
    monitorId: string;
    websiteCount: number;
    websites: WebsiteSummary[];
}

export interface AddWebsiteResult {
    id: string;
    url: string;
}

export interface DailyReportPoint extends AnalyticsMetrics {
    date: string;
}

export interface PeriodAnalytics {
    daily: (AnalyticsMetrics & { date: string }) | null;
    monthly: (AnalyticsMetrics & { period: string }) | null;
    yearly: (AnalyticsMetrics & { year: string }) | null;
}

export interface WebsiteAnalyticsPayload {
    websiteId: string;
    url: string;
    analytics: PeriodAnalytics;
}

export interface AnalyticsForWebsiteData {
    monitorId: string;
    website: WebsiteAnalyticsPayload;
}

export interface DailyReportsWebsitePayload {
    websiteId: string;
    url: string;
    timeframe: { start: string; end: string };
    dailyReports: DailyReportPoint[];
}

export interface DailyReportsData {
    monitorId: string;
    website: DailyReportsWebsitePayload;
}
