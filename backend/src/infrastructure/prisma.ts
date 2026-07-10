import { PrismaClient } from '@prisma/client';

// Cliente Prisma único (ADR-0005).
export const prisma = new PrismaClient();
