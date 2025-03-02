import { Request, Response, NextFunction } from 'express';
import { userExists, createUser, createMonitor, getActiveSubscriptions } from '@repo/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import errorHandler from '../utils/error'


// Request body interfaces
interface RegisterRequestBody {
    username: string;
    email: string;
    password: string;
}

interface LoginRequestBody {
    email: string;
    password: string;
}

interface BaseUser {
    id: string;
    username: string;
    email: string;
    createdAt: Date;
}

interface User extends BaseUser {
    password: string;
}

interface UserWithSubscription extends BaseUser {
    subscriptionStatus: boolean;
}

const register = async (
    req: Request<{}, {}, RegisterRequestBody>,
    res: Response,
    next: NextFunction
) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await userExists(email);
        if (existingUser) {
            return next(errorHandler(400, "User already exists"));
        }
        const hashedPassword = await bcrypt.hashSync(password, 10);
        const user = await createUser(username, hashedPassword, email);
        await createMonitor(user.id);
        res.status(201).json({
            success: true,
            message: "User created successfully"
        });
    } catch (error) {
        next(error);
    }
};

const login = async (
    req: Request<{}, {}, LoginRequestBody>,
    res: Response,
    next: NextFunction
) => {
    try {
        const { email, password } = req.body;

        const validUser = await userExists(email);
        if (!validUser) {
            return next(errorHandler(404, "User not found"));
        }
        const validPassword = await bcrypt.compareSync(password, validUser.password);
        if (!validPassword) {
            return next(errorHandler(401, "Wrong credentials")); // Changed to 401 for authentication error
        }
        const token = jwt.sign(
            { id: validUser.id },
            process.env.JWT_SECRET as string,
            { expiresIn: '1d' } // Added token expiration
        );

        // Create a copy of user without password
        const { password: _, ...baseUser } = validUser;
        const userId = baseUser.id;
        const currentDate = new Date();
        const subscription = await getActiveSubscriptions(userId, currentDate);

        const userWithoutPassword: UserWithSubscription = {
            ...baseUser,
            subscriptionStatus: subscription === null ? false : true
        }
        res
            .cookie("access_token", token, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            })
            .status(200)
            .json({
                success: true,
                user: userWithoutPassword
            });
    } catch (error) {
        next(error);
    }
};

const logout = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        res.clearCookie("access_token", {
            httpOnly: true,
        });

        res.status(200).json("User has been logged out!");
    } catch (error) {
        next(error);
    }
};

export { register, login, logout };