import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import type { PublicUser } from '@repo/shared';
import { errorHandler } from './error';
import { prisma } from '@repo/prisma';

export interface AuthenticatedRequest extends Request {
    user?: Pick<PublicUser, 'id' | 'username' | 'email'> & {
        subscriptionStatus?: boolean;
    };
}

const verifyUser = async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // SECURITY: Session is httpOnly cookie — never read token from query/body.
        const token = req.cookies.access_token;
        if (!token) return next(errorHandler(401, 'Unauthorized'));

        const verified = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
        if (!verified) return next(errorHandler(401, 'Unauthorized - Invalid Token'));

        const user = await prisma.user.findUnique({
            where: { id: verified.id },
            select: {
                id: true,
                username: true,
                email: true,
            },
        });

        if (!user) return next(errorHandler(404, 'User not found'));

        req.user = user;
        next();
    } catch {
        next(errorHandler(500, 'Internal server error'));
    }
};

export default verifyUser;
