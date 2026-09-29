export interface MonitoringJob {
    websiteId: string;
    url: string;
    timeout?: number;
}

export interface WebsiteWithMonitor {
    id: string;
    url: string;
    monitor: {
        isActive: boolean;
    } | null;
}
