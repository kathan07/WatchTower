import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoute from './routes/auth.route';
import dashboardRoute from './routes/dashboard.route';
import subscriptionRoute from './routes/subscription.route';
import verifyUser from './middleware/verify-user';
import verifySubscription from './middleware/verify-subscription';
import { errorMiddleware } from './middleware/error';
import {
    authBasePath,
    dashboardBasePath,
    subscribeBasePath,
    subscribeApi,
} from '@repo/shared';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// WHY: Stripe webhook signature needs raw body bytes; skip JSON parser on that path only.
app.use((req, res, next) => {
    if (req.originalUrl === subscribeApi.stripeWebhook()) {
        next();
    } else {
        express.json()(req, res, next);
    }
});
app.use(cookieParser());
app.use(cors());

app.use(authBasePath, authRoute);
app.use(subscribeBasePath, subscriptionRoute);
app.use(
    dashboardBasePath,
    verifyUser as express.RequestHandler,
    verifySubscription as express.RequestHandler,
    dashboardRoute
);

app.get('/', (_req: Request, res: Response) => {
    res.send('Hello, TypeScript + Express!');
});

app.use(errorMiddleware);

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
