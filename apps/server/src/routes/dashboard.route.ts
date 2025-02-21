import express from 'express';
import {addWebsite, removeWebsite, getAnalytics } from '../controllers/dashboard.controller';

const router = express.Router();

router.post("/addwebsite", addWebsite);
router.post("/removewebsite/:websiteId", removeWebsite);
router.get('/getanalytics', getAnalytics);

export default router;