import type { SubscriptionPlan } from '../types/subscription';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
        id: 'basic',
        name: 'BASIC',
        price: 15.99,
        validity: 3,
    },
    {
        id: 'premium',
        name: 'PREMIUM',
        price: 25.99,
        validity: 6,
        popular: true,
    },
    {
        id: 'enterprise',
        name: 'ENTERPRISE',
        price: 45.99,
        validity: 12,
    },
];
