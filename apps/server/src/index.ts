import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoute from './routes/auth.route';
import dashboardRoute from './routes/dashboard.route';
import subscriptionRoute from './routes/subscription.route';
import verifyUser from './middleware/verify-user';
import verifySubscription from './middleware/verify-subscription';
import { errorMiddleware } from './middleware/error';
import {
    authBasePath,
    dashboardBasePath,
    subscribeBasePath,
    subscribeApi,
    HEALTH_PATH,
    READY_PATH,
    makeLivenessBody,
    makeReadinessResult,
    type HealthCheck,
} from '@repo/shared';
import { prisma } from '@repo/prisma';
import { redisClient } from '@repo/redis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// WHY: Stripe webhook signature needs raw body bytes; skip JSON parser on that path only.
app.use((req, res, next) => {
    if (req.originalUrl === subscribeApi.stripeWebhook()) {
        next();
    } else {
        express.json()(req, res, next);
    }
});
app.use(cookieParser());
app.use(cors());

app.use(authBasePath, authRoute);
app.use(subscribeBasePath, subscriptionRoute);
app.use(
    dashboardBasePath,
    verifyUser as express.RequestHandler,
    verifySubscription as express.RequestHandler,
    dashboardRoute
);

app.get('/', (_req: Request, res: Response) => {
    res.send('Hello, TypeScript + Express!');
});

// Unauthenticated liveness — process up only; no dependency checks.
app.get(HEALTH_PATH, (_req: Request, res: Response) => {
    res.status(200).json(makeLivenessBody('server'));
});

app.get(READY_PATH, async (_req: Request, res: Response) => {
    const checks: Record<string, HealthCheck> = {};

    try {
        await prisma.$queryRaw`SELECT 1`;
        checks.postgres = { status: 'up' };
    } catch (err) {
        checks.postgres = {
            status: 'down',
            detail: err instanceof Error ? err.message : 'unreachable',
        };
    }

    try {
        await redisClient.ping();
        checks.redis = { status: 'up' };
    } catch (err) {
        checks.redis = {
            status: 'down',
            detail: err instanceof Error ? err.message : 'unreachable',
        };
    }

    const { statusCode, body } = makeReadinessResult('server', checks);
    res.status(statusCode).json(body);
});

app.use(errorMiddleware);

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
