import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // In development or CI/build step, we can default to a dummy URL to avoid build failures,
    // but in runtime we want to throw or handle it properly.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is not set in environment variables');
    }
  }

  const pool = new pg.Pool({
    connectionString: connectionString || 'postgresql://dummy:dummy@localhost:5432/dummy',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
