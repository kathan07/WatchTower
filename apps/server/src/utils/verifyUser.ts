import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import errorHandler from './error';
import { prisma } from '@repo/prisma';

interface CustomRequest extends Request {
    user?: any;
}

const verifyUser = async (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
                const token = req.cookies.access_token;
                if (!token) return next(errorHandler(401, "Unauthorized"));

                const verified = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
                if (!verified) return next(errorHandler(401, "Unauthorized - Invalid Token"));

                const user = await prisma.user.findUnique({
                    where: {
                        id: verified.id
                    },
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    }
                });
                
                if (!user) return next(errorHandler(404, "User not found"));

                req.user = user;
                next();
        } catch (error) {
                next(errorHandler(500, "Internal server error"));
        }
};

export default verifyUser;

