import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const connectDb = async (): Promise<void> => {
    await prisma.$connect();
};

export const disconnectDb = async (): Promise<void> => {
    await prisma.$disconnect();
};
