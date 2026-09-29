import type { HealthCheck, HealthEnvelope } from '../types/health';

/** Liveness body — process is up; no dependency checks. */
export function makeLivenessBody(service: string): HealthEnvelope {
    return {
        status: 'ok',
        service,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Readiness: 200 + status ok when every check is up; else 503 + status error.
 */
export function makeReadinessResult(
    service: string,
    checks: Record<string, HealthCheck>
): { statusCode: number; body: HealthEnvelope } {
    const allUp = Object.values(checks).every((check) => check.status === 'up');
    return {
        statusCode: allUp ? 200 : 503,
        body: {
            status: allUp ? 'ok' : 'error',
            service,
            checks,
            timestamp: new Date().toISOString(),
        },
    };
}
