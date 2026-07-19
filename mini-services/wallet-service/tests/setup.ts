import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Optionnel: Reset db or run migrations if in memory
});

afterAll(async () => {
  await prisma.$disconnect();
});
