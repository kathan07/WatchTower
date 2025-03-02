import express from 'express';
import {addWebsite, removeWebsite, getAnalytics, getWebsites } from '../controllers/dashboard.controller';

const router = express.Router();

router.post("/addwebsite", addWebsite as express.RequestHandler);
router.get("/getWebsites", getWebsites as express.RequestHandler);
router.post("/removewebsite/:websiteId", removeWebsite as express.RequestHandler);
router.get('/getanalytics/:websiteId', getAnalytics as express.RequestHandler);

export default router;