import { prisma } from './client';

export const getActiveWebsites = async () => {
    return prisma.website.findMany({
        where: {
            monitors: {
                some: { isActive: true },
            },
        },
        select: {
            id: true,
            url: true,
        },
    });
};

export const getActiveWebsitesWithMonitors = async () => {
    return prisma.website.findMany({
        where: {
            monitors: {
                some: { isActive: true },
            },
        },
        select: {
            id: true,
            url: true,
            monitors: {
                select: { isActive: true },
            },
        },
    });
};

export const getActiveMonitorsWithWebsitesAndUsers = async () => {
    return prisma.monitor.findMany({
        where: { isActive: true },
        select: {
            userId: true,
            user: {
                select: { email: true },
            },
            websites: {
                select: { id: true, url: true },
            },
        },
    });
};
