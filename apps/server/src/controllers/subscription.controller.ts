import { Request, Response, NextFunction } from 'express';
import type { SubscriptionPlan } from '@repo/shared';
import {
    createCheckoutSession,
    handleStripeWebhook,
    retrieveCheckoutSession,
} from '../services/subscription.service';

interface UserRequest extends Request {
    user: {
        id: string;
        username: string;
        email: string;
        subscriptionStatus?: boolean;
    };
}

interface VerifySessionRequest extends UserRequest {
    params: { sessionId: string };
}

interface SubscriptionRequest extends UserRequest {
    body: SubscriptionPlan;
}

const subscribe = async (
    req: SubscriptionRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const session = await createCheckoutSession(
            req.user.id,
            req.body,
            req.headers.origin
        );
        res.status(200).json({ success: true, session });
    } catch (error) {
        next(error);
    }
};

const verifySession = async (
    req: VerifySessionRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const session = await retrieveCheckoutSession(req.params.sessionId);
        res.status(200).json({ success: true, session });
    } catch (error) {
        next(error);
    }
};

const verifySubscriptionSession = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const result = await handleStripeWebhook(
            req.body,
            req.headers['stripe-signature']
        );
        res.status(200).json(result);
    } catch (error) {
        console.error('Webhook error:', error);
        next(error);
    }
};

export { subscribe, verifySubscriptionSession, verifySession };
