import { Request, Response, NextFunction } from 'express';
import { getActiveSubscriptions} from '@repo/prisma';
import errorHandler from './error';

interface CustomRequest extends Request {
    user: {
        id: string;
        username: string;
        email: string;
        subscriptionStatus?: boolean;
    };
}

const verifySubscription = async (
    req: CustomRequest, 
    res: Response, 
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user.id;

        const currentDate = new Date();

        const subscription = await getActiveSubscriptions(userId, currentDate);

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