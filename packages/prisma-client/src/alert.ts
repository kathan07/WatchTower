import { AlertType, AlertStatus } from '@prisma/client';
import { prisma } from './client';

export const createAlert = async (
    websiteId: string,
    type: AlertType,
    status: AlertStatus,
    message: string
) => {
    return prisma.alert.create({
        data: {
            websiteId,
            type,
            message,
            status,
        },
    });
};
