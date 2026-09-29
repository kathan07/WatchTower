import { addLog, Status } from '@repo/prisma';
import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { RESPONSE_TIME_THRESHOLD } from '@repo/redis';

axiosRetry(axios, {
    retries: 3,
    retryDelay: (retryCount) => Math.max(500, axiosRetry.exponentialDelay(retryCount)),
    retryCondition: (error) =>
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        (error.response?.status ? error.response.status >= 500 : false),
});

import type { MonitoringJob } from '@repo/shared';

export type { MonitoringJob };

/**
 * Probes a website once and persists the resulting status/response-time log.
 */
export async function processMonitoringJob(
    { websiteId, url, timeout }: MonitoringJob,
    isShuttingDown: () => boolean
): Promise<void> {
    if (isShuttingDown()) {
        throw new Error('Worker is shutting down');
    }

    let status: Status = Status.DOWN;
    let responseTime: number | null = null;
    const requestTimeout = timeout ?? 30000;

    try {
        const startTime = Date.now();
        const response = await axios.get(url, {
            timeout: requestTimeout,
            validateStatus: null,
            headers: {
                'User-Agent': 'Website-Monitoring-Service/1.0',
            },
        });
        responseTime = Date.now() - startTime;

        if (response.status >= 200 && response.status < 300) {
            status =
                responseTime > RESPONSE_TIME_THRESHOLD ? Status.DEGRADED : Status.UP;
        } else if (response.status >= 400 && response.status < 500) {
            status = Status.DOWN;
        } else {
            status = Status.DEGRADED;
        }
    } catch (error) {
        status = Status.DOWN;
        const axiosError = error as AxiosError;
        console.error(`Error monitoring ${url} after retries:`, {
            message: axiosError.message,
            code: axiosError.code,
            response: axiosError.response?.status,
        });
    }

    try {
        await addLog(websiteId, status, responseTime);
    } catch (error) {
        console.error(`Error creating log for ${url}:`, error);
        throw error;
    }
}
