import { Request, Response, NextFunction } from 'express';
import errorHandler from '../utils/error';
import { prisma, AnalyticsPeriod } from '@repo/prisma';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears } from 'date-fns';
import { redisClient, WEBSITE_CACHE_KEY, WEBSITE_CACHE_TTL } from '@repo/redis';

// Custom request interfaces
interface UserRequest extends Request {
    user: {
        id: string;
        username: string;
        email: string;
        subscriptionStatus: boolean;
    };
}

interface AddWebsiteRequest extends UserRequest {
    body: {
        url: string;
    };
}

interface RemoveWebsiteRequest extends UserRequest {
    params: {
        websiteId: string;
    };
}

interface GetAnalyticsRequest extends UserRequest {
    params: {
        websiteId: string;
    };
}

// Other interfaces
interface Analytics {
    avgResponseTime: number;
    avgUptime: number;
    avgDowntime: number;
    avgDegradedTime: number;
}

interface WebsiteData {
    id: string;
    url: string;
    monitor: {
        isActive: boolean;
    } | null;
}

// Helper functions remain the same
function isValidUrl(url: string): boolean {
    try {
        const urlObject = new URL(url);
        return ['http:', 'https:'].includes(urlObject.protocol);
    } catch {
        return false;
    }
}

function normalizeUrl(url: string): string {
    try {
        const urlObject = new URL(url);
        const pathname = urlObject.pathname.replace(/\/+$/, '');
        return `${urlObject.protocol}//${urlObject.host}${pathname}`;
    } catch {
        throw errorHandler(400, 'Invalid URL format');
    }
}

const formatMetrics = (analytics: Analytics): Analytics => ({
    avgResponseTime: Number(analytics.avgResponseTime.toFixed(2)),
    avgUptime: Number(analytics.avgUptime.toFixed(2)),
    avgDowntime: Number(analytics.avgDowntime.toFixed(2)),
    avgDegradedTime: Number(analytics.avgDegradedTime.toFixed(2))
});

const formatDate = (date: Date, format: 'YYYY-MM' | 'YYYY'): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return format === 'YYYY-MM' ? `${year}-${month}` : year.toString();
};

// Modified controllers with custom request types
const addWebsite = async (
    req: AddWebsiteRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { url } = req.body;

        if (!url?.trim()) {
            return next(errorHandler(400, 'URL is required'));
        }

        if (!isValidUrl(url)) {
            return next(errorHandler(400, 'Invalid URL format. Must be a valid HTTP/HTTPS URL'));
        }

        const normalizedUrl = normalizeUrl(url);

        const monitor = await prisma.monitor.findUnique({
            where: {
                userId: req.user.id,
                isActive: true
            },
            include: {
                websites: {
                    select: {
                        url: true
                    }
                }
            }
        });

        if (!monitor) {
            return next(errorHandler(404, 'Active monitor not found'));
        }

        if (monitor.websites.length >= 10) {
            return next(errorHandler(400, 'Maximum limit of 10 websites reached'));
        }

        if (monitor.websites.some(w => w.url === normalizedUrl)) {
            return next(errorHandler(400, 'Website is already being monitored'));
        }


        const result = await prisma.$transaction(async (tx) => {
            const website = await tx.website.upsert({
                where: { url: normalizedUrl },
                update: {},
                create: { url: normalizedUrl }
            });

            await tx.monitor.update({
                where: { userId: req.user.id },
                data: {
                    websites: {
                        connect: { id: website.id }
                    }
                }
            });

            const cachedData = await redisClient.get(WEBSITE_CACHE_KEY);
            if (cachedData) {
                const websites: WebsiteData[] = await JSON.parse(cachedData);
                const websiteExists = websites.some(w => w.id === website.id);
                if (!websiteExists) {
                    websites.push({
                        id: website.id,
                        url: website.url,
                        monitor: { isActive: true }
                    });
                    await redisClient.setex(
                        WEBSITE_CACHE_KEY,
                        WEBSITE_CACHE_TTL,
                        JSON.stringify(websites)
                    );
                }
            }

            return website;
        });

        res.status(201).json({
            success: true,
            website: {
                id: result.id,
                url: result.url
            }
        });

    } catch (error) {
        next(error);
    }
};

const getWebsites = async (
    req: UserRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user.id;

        const monitor = await prisma.monitor.findFirst({
            where: {
                userId,
                isActive: true
            },
            include: {
                websites: {
                    select: {
                        id: true,
                        url: true,
                    }
                }
            }
        });

        if (!monitor) {
            return next(errorHandler(404, 'No active monitor found'));
        }

        res.status(200).json({
            success: true,
            data: {
                monitorId: monitor.id,
                websiteCount: monitor.websites.length,
                websites: monitor.websites
            }
        });

    } catch (error) {
        next(error);
    }
};

const removeWebsite = async (
    req: RemoveWebsiteRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const websiteId = req.params.websiteId;
        const userId = req.user.id;

        // if (!websiteId?.match(/^[0-9a-fA-F-]{36}$/)) {
        //     return next(errorHandler(400, 'Invalid website ID format'));
        // }

        await prisma.$transaction(async (tx) => {
            const monitor = await tx.monitor.findFirst({
                where: {
                    userId,
                    isActive: true,
                    websites: {
                        some: {
                            id: websiteId
                        }
                    }
                }
            });

            if (!monitor) {
                throw errorHandler(404, 'Website not found in your active monitor');
            }

            return await tx.monitor.update({
                where: { userId },
                data: {
                    websites: {
                        disconnect: { id: websiteId }
                    }
                }
            });
        });

        res.status(200).json({
            success: true,
            message: 'Website removed successfully'
        });

    } catch (error) {
        next(error);
    }
};

const getAnalytics = async (
    req: GetAnalyticsRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user.id;
        const websiteId = req.params.websiteId;
        const currentDate = new Date();

        const dateRanges = {
            daily: {
                start: startOfDay(subDays(currentDate, 1)),
                end: endOfDay(subDays(currentDate, 1))
            },
            monthly: {
                start: startOfMonth(subMonths(currentDate, 1)),
                end: endOfMonth(subMonths(currentDate, 1))
            },
            yearly: {
                start: startOfYear(subYears(currentDate, 1)),
                end: endOfYear(subYears(currentDate, 1))
            }
        };

        // Check if the website exists and belongs to the user's active monitor
        const website = await prisma.website.findFirst({
            where: {
                id: websiteId,
                monitors: {
                    some: {
                        userId,
                        isActive: true
                    }
                }
            },
            select: {
                id: true,
                url: true,
                monitors: {
                    where: {
                        userId,
                        isActive: true
                    },
                    select: {
                        id: true
                    },
                    take: 1
                }
            }
        });

        if (!website) {
            return next(errorHandler(404, 'Website not found or not associated with an active monitor'));
        }

        const monitorId = website.monitors[0]?.id;

        // Get analytics for the specific website
        const analyticsQueries = Object.entries(dateRanges).map(([period, { start, end }]) =>
            prisma.analytics.findFirst({
                where: {
                    websiteId,
                    periodType: period.toUpperCase() as AnalyticsPeriod,
                    date: {
                        gte: start,
                        lte: end
                    }
                },
                select: {
                    date: true,
                    avgResponseTime: true,
                    avgUptime: true,
                    avgDowntime: true,
                    avgDegradedTime: true
                }
            })
        );

        const [daily, monthly, yearly] = await Promise.all(analyticsQueries);

        const websiteAnalytics = {
            websiteId: website.id,
            url: website.url,
            analytics: {
                daily: daily ? {
                    date: daily.date,
                    ...formatMetrics(daily)
                } : null,
                monthly: monthly ? {
                    period: formatDate(monthly.date, 'YYYY-MM'),
                    ...formatMetrics(monthly)
                } : null,
                yearly: yearly ? {
                    year: formatDate(yearly.date, 'YYYY'),
                    ...formatMetrics(yearly)
                } : null
            }
        };

        res.status(200).json({
            success: true,
            data: {
                monitorId,
                website: websiteAnalytics
            }
        });
    } catch (error) {
        next(error);
    }
};


const getDailyReports = async (
    req: GetAnalyticsRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user.id;
        const websiteId = req.params.websiteId;
        const currentDate = new Date();

        // Calculate date range for the last month (30 days)
        const endDate = endOfDay(subDays(currentDate, 1)); // Yesterday end
        const startDate = startOfDay(subDays(currentDate, 5)); // 5 days ago start

        // Check if the website exists and belongs to the user's active monitor
        const website = await prisma.website.findFirst({
            where: {
                id: websiteId,
                monitors: {
                    some: {
                        userId,
                        isActive: true
                    }
                }
            },
            select: {
                id: true,
                url: true,
                monitors: {
                    where: {
                        userId,
                        isActive: true
                    },
                    select: {
                        id: true
                    },
                    take: 1
                }
            }
        });

        if (!website) {
            return next(errorHandler(404, 'Website not found or not associated with an active monitor'));
        }

        const monitorId = website.monitors[0]?.id;

        // Get daily analytics for the last month
        const dailyReports = await prisma.analytics.findMany({
            where: {
                websiteId,
                periodType: 'DAILY',
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                date: true,
                avgResponseTime: true,
                avgUptime: true,
                avgDowntime: true,
                avgDegradedTime: true
            },
            orderBy: {
                date: 'asc'
            }
        });

        // Format the results
        const formattedReports = dailyReports.map(report => ({
            date: report.date,
            ...formatMetrics(report)
        }));

        res.status(200).json({
            success: true,
            data: {
                monitorId,
                website: {
                    websiteId: website.id,
                    url: website.url,
                    timeframe: {
                        start: startDate,
                        end: endDate
                    },
                    dailyReports: formattedReports,
                }
            }
        });
    } catch (error) {
        next(error);
    }
};



export { addWebsite, removeWebsite, getAnalytics, getWebsites, getDailyReports};