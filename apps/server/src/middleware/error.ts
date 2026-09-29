import { Request, Response, NextFunction } from 'express';

export class CustomError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (statusCode: number, message: string): CustomError => {
    return new CustomError(statusCode, message);
};

/**
 * Maps thrown errors to a stable JSON error shape for clients.
 */
export const errorMiddleware = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    const statusCode = err instanceof CustomError ? err.statusCode : 500;
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    res.status(statusCode).json({
        success: false,
        message,
    });
};
