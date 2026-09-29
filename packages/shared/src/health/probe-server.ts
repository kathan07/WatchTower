import http from 'node:http';
import { HEALTH_PATH, READY_PATH } from '../constants/health';
import type { GetChecks } from '../types/health';
import { makeLivenessBody, makeReadinessResult } from './envelope';

export interface StartProbeServerOptions {
    port: number;
    service: string;
    getChecks: GetChecks;
}

export interface ProbeServerHandle {
    server: http.Server;
    close: () => Promise<void>;
}

/**
 * Minimal node:http probe server for workers (no Express).
 * Apps inject getChecks so @repo/shared stays free of prisma/redis.
 */
export async function startProbeServer(
    options: StartProbeServerOptions
): Promise<ProbeServerHandle> {
    const { port, service, getChecks } = options;

    const server = http.createServer((req, res) => {
        void handleProbeRequest(req, res, service, getChecks);
    });

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, () => {
            server.removeListener('error', reject);
            resolve();
        });
    });

    return {
        server,
        close: () =>
            new Promise<void>((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            }),
    };
}

async function handleProbeRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    service: string,
    getChecks: GetChecks
): Promise<void> {
    const path = req.url?.split('?')[0] ?? '';

    if (req.method === 'GET' && path === HEALTH_PATH) {
        writeJson(res, 200, makeLivenessBody(service));
        return;
    }

    if (req.method === 'GET' && path === READY_PATH) {
        try {
            const checks = await getChecks();
            const { statusCode, body } = makeReadinessResult(service, checks);
            writeJson(res, statusCode, body);
        } catch (err) {
            const detail = err instanceof Error ? err.message : 'check failed';
            const { statusCode, body } = makeReadinessResult(service, {
                probe: { status: 'down', detail },
            });
            writeJson(res, statusCode, body);
        }
        return;
    }

    res.writeHead(404);
    res.end();
}

function writeJson(
    res: http.ServerResponse,
    statusCode: number,
    body: unknown
): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}
