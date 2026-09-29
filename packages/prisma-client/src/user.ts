import { User } from '@prisma/client';
import { prisma } from './client';

export const userExists = async (email: string): Promise<User | null> => {
    return prisma.user.findUnique({
        where: { email },
    });
};

export const createUser = async (username: string, password: string, email: string) => {
    return prisma.user.create({
        data: { username, email, password },
        select: { id: true },
    });
};

export const createMonitor = async (userId: string): Promise<void> => {
    await prisma.monitor.create({
        data: {
            userId,
            isActive: false,
        },
    });
};
