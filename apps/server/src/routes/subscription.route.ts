import express from 'express';
import { subscribe, verfiySession, verifySubscriptionSession } from "../controllers/subscription.controller";
import verifyUser from "../utils/verifyUser";

const router = express.Router();

// Route for initiating checkout process
router.post("/checkout", verifyUser as express.RequestHandler,  subscribe as express.RequestHandler);

router.get('/session/:sessionId',  verifyUser as express.RequestHandler,  verfiySession as express.RequestHandler);

router.post("/stripe/webhook", express.raw({ type: "application/json" }), verifySubscriptionSession as express.RequestHandler);


export default router;