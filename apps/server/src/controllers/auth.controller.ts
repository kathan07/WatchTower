import { Request, Response, NextFunction } from 'express';
import type { LoginInput, RegisterInput } from '@repo/shared';
import { loginUser, registerUser } from '../services/auth.service';

const register = async (
    req: Request<{}, {}, RegisterInput>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await registerUser(req.body);
        res.status(201).json({
            success: true,
            message: 'User created successfully',
        });
    } catch (error) {
        next(error);
    }
};

const login = async (
    req: Request<{}, {}, LoginInput>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { token, user } = await loginUser(req.body);
        res
            .cookie('access_token', token, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000,
            })
            .status(200)
            .json({
                success: true,
                user,
            });
    } catch (error) {
        next(error);
    }
};

const logout = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        res.clearCookie('access_token', { httpOnly: true });
        res.status(200).json('User has been logged out!');
    } catch (error) {
        next(error);
    }
};

export { register, login, logout };
