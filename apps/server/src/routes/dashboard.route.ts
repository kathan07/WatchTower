import express from 'express';
import { dashboardRoutes } from '@repo/shared';
import {
    addWebsite,
    removeWebsite,
    getAnalytics,
    getWebsites,
    getDailyReports,
} from '../controllers/dashboard.controller';

const router = express.Router();

router.post(dashboardRoutes.addWebsite, addWebsite as express.RequestHandler);
router.get(dashboardRoutes.getWebsites, getWebsites as express.RequestHandler);
router.post(dashboardRoutes.removeWebsite, removeWebsite as express.RequestHandler);
router.get(dashboardRoutes.getAnalytics, getAnalytics as express.RequestHandler);
router.get(dashboardRoutes.getDailyReports, getDailyReports as express.RequestHandler);

export default router;
