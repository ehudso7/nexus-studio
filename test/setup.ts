import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/nexus_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Global test utilities
global.testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

global.testRedis = new Redis(process.env.REDIS_URL);

// Setup hooks
beforeAll(async () => {
  // Clear test database
  await global.testPrisma.$executeRawUnsafe(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
  
  // Clear Redis
  await global.testRedis.flushdb();
});

beforeEach(async () => {
  // Start transaction for each test
  await global.testPrisma.$executeRaw`BEGIN`;
});

afterEach(async () => {
  // Rollback transaction after each test
  await global.testPrisma.$executeRaw`ROLLBACK`;
  
  // Clear Redis keys created during test
  const keys = await global.testRedis.keys('test:*');
  if (keys.length > 0) {
    await global.testRedis.del(...keys);
  }
});

afterAll(async () => {
  // Cleanup connections
  await global.testPrisma.$disconnect();
  global.testRedis.disconnect();
});

// Mock fetch for API tests
global.fetch = vi.fn();

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Helper functions
export async function createTestUser(data = {}) {
  return global.testPrisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
      ...data,
    },
  });
}

export async function createTestProject(userId: string, data = {}) {
  return global.testPrisma.project.create({
    data: {
      name: 'Test Project',
      type: 'web',
      framework: 'nextjs',
      userId,
      ...data,
    },
  });
}

export function generateAuthToken(userId: string) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// API test helpers
export function createMockContext(overrides = {}) {
  return {
    req: {
      header: vi.fn(),
      json: vi.fn(),
      query: vi.fn(() => ({})),
      param: vi.fn(),
      method: 'GET',
      path: '/',
    },
    res: {
      status: 200,
    },
    header: vi.fn(),
    json: vi.fn(),
    text: vi.fn(),
    html: vi.fn(),
    redirect: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    ...overrides,
  };
}