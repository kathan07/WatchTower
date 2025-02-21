import express from 'express';
import {addWebsite, removeWebsite, getAnalytics } from '../controllers/dashboard.controller';

const router = express.Router();

router.post("/addwebsite", addWebsite as express.RequestHandler);
router.post("/removewebsite/:websiteId", removeWebsite as express.RequestHandler);
router.get('/getanalytics', getAnalytics as express.RequestHandler);

export default router;