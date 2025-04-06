import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import errorHandler from '../utils/error';
import { buySubscription } from '@repo/prisma';

const stripe = new Stripe(process.env.STRIPE_API_KEY!,
    {
        apiVersion: '2025-02-24.acacia',
    }
);

interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    validity: number;
    popular?: boolean;
}

interface UserRequest extends Request {
    user: {
        id: string;
        username: string;
        email: string;
        subscriptionStatus?: boolean;
    };
}

interface VerfiySessionRequest extends UserRequest {
    params: {
        sessionId: string;
    };
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
        const { user, body } = req;
        const plan = body;

        const lineItems = [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: plan.name
                },
                unit_amount: plan.price * 100,
            },
            quantity: 1
        }];

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/cancel`,
            metadata: {
                userId: user.id,
                planId: plan.id,
                planName: plan.name,
                validity: plan.validity.toString()
            }
        });
        if (!session) {
            next(errorHandler(500, "Session not created"));
            return;
        }
        res.status(200).json({
            success: true,
            session: session
        });
    } catch (error) {
        next(error);
    }
};

const verfiySession = async (
    req: VerfiySessionRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {

    const { sessionId } = req.params;
    if (!sessionId) {
        next(errorHandler(400, "Session ID is required"));
        return;
    }
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (!session) {
            throw Error("Session not found");
        }
        res.status(200).json({
            success: true,
            session: session
        });
    } catch (error: any) {
        next(error);
    }
};

const verifySubscriptionSession = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
        next(errorHandler(400, "Missing Stripe signature"));
        return;
    }

    try {
        // req.body is now a Buffer
        const event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
        );

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            const metadata = session.metadata;

            if (!metadata?.userId || !metadata?.planId || !metadata?.validity) {
                next(errorHandler(400, "Missing required metadata in checkout session"));
                return;
            }

            await buySubscription(
                metadata.userId,
                metadata.planId,
                parseInt(metadata.validity)
            );

            console.log("✅ Payment successful for user:", metadata.userId);
            res.status(200).json({
                success: true,
                message: "Payment verified successfully"
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Event processed"
        });
    } catch (error: any) {
        console.error("Webhook error:", error);
        next(error);
    }
};

export { subscribe, verifySubscriptionSession, verfiySession };