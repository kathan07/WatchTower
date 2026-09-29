import { Response, NextFunction } from 'express';
import { getActiveSubscriptions } from '@repo/prisma';
import { errorHandler } from './error';
import { AuthenticatedRequest } from './verify-user';

const verifySubscription = async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user?.id) {
            return next(errorHandler(401, 'Unauthorized'));
        }

        const subscription = await getActiveSubscriptions(req.user.id, new Date());

        if (!subscription) {
            return next(errorHandler(403, 'Unauthorized: Active subscription required'));
        }

        req.user.subscriptionStatus = true;
        next();
    } catch (error) {
        next(error);
    }
};

export default verifySubscription;
