export const HEALTH_PATH = '/health';
export const READY_PATH = '/ready';

/** Default HEALTH_PORT per worker when env is unset. */
export const DEFAULT_HEALTH_PORTS = {
    'monitoring-service': 3011,
    'scheduler-service': 3012,
    'alerting-service': 3013,
    'analysis-service': 3014,
    'cleaning-service': 3015,
} as const;

export type HealthPortService = keyof typeof DEFAULT_HEALTH_PORTS;

/**
 * Resolves probe listen port: HEALTH_PORT env wins, else service default.
 */
export function resolveHealthPort(service: HealthPortService): number {
    const raw = process.env.HEALTH_PORT;
    if (raw !== undefined && raw !== '') {
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return DEFAULT_HEALTH_PORTS[service];
}
