import express from 'express';
import { subscribeRoutes } from '@repo/shared';
import {
    subscribe,
    verifySession,
    verifySubscriptionSession,
} from '../controllers/subscription.controller';
import verifyUser from '../middleware/verify-user';

const router = express.Router();

router.post(
    subscribeRoutes.checkout,
    verifyUser as express.RequestHandler,
    subscribe as express.RequestHandler
);

router.get(
    subscribeRoutes.session,
    verifyUser as express.RequestHandler,
    verifySession as express.RequestHandler
);

router.post(
    subscribeRoutes.stripeWebhook,
    express.raw({ type: 'application/json' }),
    verifySubscriptionSession as express.RequestHandler
);

export default router;
