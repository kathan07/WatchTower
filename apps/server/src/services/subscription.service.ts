import Stripe from 'stripe';
import { buySubscription } from '@repo/prisma';
import type { SubscriptionPlan } from '@repo/shared';
import { errorHandler } from '../middleware/error';

export type { SubscriptionPlan };

// Stripe SDK requires a fixed apiVersion pin for webhook payload compatibility.
const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
    apiVersion: '2025-02-24.acacia',
});

export async function createCheckoutSession(
    userId: string,
    plan: SubscriptionPlan,
    origin: string | undefined
): Promise<Stripe.Checkout.Session> {
    if (!plan?.id || !plan?.name || plan.price == null || plan.validity == null) {
        throw errorHandler(400, 'Invalid subscription plan');
    }

    const lineItems = [
        {
            price_data: {
                currency: 'usd',
                product_data: { name: plan.name },
                unit_amount: plan.price * 100,
            },
            quantity: 1,
        },
    ];

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cancel`,
        metadata: {
            userId,
            planId: plan.id,
            planName: plan.name,
            validity: plan.validity.toString(),
        },
    });

    if (!session) {
        throw errorHandler(500, 'Session not created');
    }

    return session;
}

export async function retrieveCheckoutSession(
    sessionId: string
): Promise<Stripe.Checkout.Session> {
    if (!sessionId) {
        throw errorHandler(400, 'Session ID is required');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
        throw errorHandler(404, 'Session not found');
    }

    return session;
}

/**
 * Verifies Stripe webhook signature and activates subscription on checkout.session.completed.
 * @throws {CustomError} when signature or metadata is invalid
 */
export async function handleStripeWebhook(
    rawBody: Buffer | string,
    signature: string | string[] | undefined
): Promise<{ success: true; message: string }> {
    if (!signature) {
        throw errorHandler(400, 'Missing Stripe signature');
    }

    // Stripe signature verification requires the exact raw body bytes — never a re-serialized JSON object.
    const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata;

        if (!metadata?.userId || !metadata?.planId || !metadata?.validity) {
            throw errorHandler(400, 'Missing required metadata in checkout session');
        }

        await buySubscription(metadata.userId, metadata.planId, parseInt(metadata.validity, 10));

        return { success: true, message: 'Payment verified successfully' };
    }

    return { success: true, message: 'Event processed' };
}
