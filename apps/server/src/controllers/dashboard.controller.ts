import { Request, Response, NextFunction } from 'express';
import {
    addWebsiteForUser,
    getAnalyticsForWebsite,
    getDailyReportsForWebsite,
    getWebsitesForUser,
    removeWebsiteForUser,
} from '../services/dashboard.service';

interface UserRequest extends Request {
    user: {
        id: string;
        username: string;
        email: string;
        subscriptionStatus: boolean;
    };
}

interface AddWebsiteRequest extends UserRequest {
    body: { url: string };
}

interface WebsiteIdRequest extends UserRequest {
    params: { websiteId: string };
    query: { timeRange?: string };
}

const addWebsite = async (
    req: AddWebsiteRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const website = await addWebsiteForUser(req.user.id, req.body.url);
        res.status(201).json({ success: true, website });
    } catch (error) {
        next(error);
    }
};

const getWebsites = async (
    req: UserRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const data = await getWebsitesForUser(req.user.id);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

const removeWebsite = async (
    req: WebsiteIdRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await removeWebsiteForUser(req.user.id, req.params.websiteId);
        res.status(200).json({
            success: true,
            message: 'Website removed successfully',
        });
    } catch (error) {
        next(error);
    }
};

const getAnalytics = async (
    req: WebsiteIdRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const data = await getAnalyticsForWebsite(req.user.id, req.params.websiteId);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

const getDailyReports = async (
    req: WebsiteIdRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const data = await getDailyReportsForWebsite(
            req.user.id,
            req.params.websiteId,
            req.query.timeRange || '5'
        );
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export { addWebsite, removeWebsite, getAnalytics, getWebsites, getDailyReports };
