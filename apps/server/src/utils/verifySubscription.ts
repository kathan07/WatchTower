import { Request, Response, NextFunction } from 'express';
import { prisma } from '@repo/prisma';
import errorHandler from './error';

interface CustomRequest extends Request {
    user: any;
}

const verifySubscription = async (
    req: CustomRequest, 
    res: Response, 
    next: NextFunction
) => {
    try {
        const userId = req.user.id;

        const currentDate = new Date();

        const subscription = await prisma.subscription.findFirst({
            where: {
                userId: userId,
                isActive: true,
                expirationDate: {
                    gt: currentDate
                }
            },
            orderBy: {
                expirationDate: 'desc'
            },
        });

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