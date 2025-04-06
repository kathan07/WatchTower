import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoute from './routes/auth.route';
import dashboardRoute from './routes/dashboard.route';
import verifyUser from './utils/verifyUser';
import verifySubscription from './utils/verifySubscription';
import subscriptionRoute from './routes/subscription.route';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  if (req.originalUrl === '/api/subscribe/stripe/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(cookieParser());
app.use(cors());



// Add your routes here
app.use("/api/auth", authRoute);
app.use("/api/subscribe", subscriptionRoute);
app.use("/api/dashboard", verifyUser as express.RequestHandler, verifySubscription as express.RequestHandler, dashboardRoute);

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript + Express!');
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});