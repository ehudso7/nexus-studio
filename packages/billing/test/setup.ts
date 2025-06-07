import { vi } from 'vitest'

// Mock environment variables
process.env.STRIPE_API_KEY = 'sk_test_mock'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock'

// Global test setup
vi.mock('@nexus/database', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    },
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    },
    subscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    usage: {
      create: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn()
    },
    invoice: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    $transaction: vi.fn(),
    $disconnect: vi.fn()
  }))
}))