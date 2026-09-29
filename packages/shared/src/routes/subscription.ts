export const subscribeBasePath = '/api/subscribe';

export const subscribeRoutes = {
    checkout: '/checkout',
    session: '/session/:sessionId',
    stripeWebhook: '/stripe/webhook',
} as const;

export const subscribeApi = {
    checkout: () => `${subscribeBasePath}${subscribeRoutes.checkout}`,
    session: (sessionId: string) =>
        `${subscribeBasePath}/session/${encodeURIComponent(sessionId)}`,
    stripeWebhook: () => `${subscribeBasePath}${subscribeRoutes.stripeWebhook}`,
} as const;
