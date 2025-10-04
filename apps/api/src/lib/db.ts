import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function connect(): Promise<void> {
  await prisma.$connect();
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
