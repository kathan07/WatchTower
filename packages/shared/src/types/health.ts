/** Aggregate probe status for a service. */
export type HealthStatus = 'ok' | 'degraded' | 'error';

/** Per-dependency check outcome. */
export type CheckStatus = 'up' | 'down';

export interface HealthCheck {
    status: CheckStatus;
    detail?: string;
}

/**
 * Canonical probe response body.
 * `checks` is omitted on liveness; present on readiness.
 */
export interface HealthEnvelope {
    status: HealthStatus;
    service: string;
    checks?: Record<string, HealthCheck>;
    timestamp: string;
}

/** App-injected dependency checks — shared kit must not import prisma/redis. */
export type GetChecks = () => Promise<Record<string, HealthCheck>>;
