import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BillingService } from '../billing-service'
import { PrismaClient } from '@nexus-studio/database'
import type { StripeClient } from '../stripe-client'

// Mock Prisma
vi.mock('@nexus-studio/database', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    organization: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    subscription: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn()
    },
    organizationMember: {
      findFirst: vi.fn()
    },
    usage: {
      findMany: vi.fn(),
      upsert: vi.fn()
    },
    payment: {
      create: vi.fn()
    },
    webhookEvent: {
      create: vi.fn()
    }
  }))
}))

// Mock Stripe Client
const mockStripeClient = {
  createCustomer: vi.fn(),
  createSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  resumeSubscription: vi.fn(),
  attachPaymentMethod: vi.fn(),
  listPaymentMethods: vi.fn(),
  createSetupIntent: vi.fn(),
  createBillingPortalSession: vi.fn(),
  createCheckoutSession: vi.fn(),
  listInvoices: vi.fn(),
  retrieveInvoice: vi.fn(),
  retrieveUpcomingInvoice: vi.fn(),
  constructWebhookEvent: vi.fn(),
  getStripeInstance: vi.fn()
}

describe('BillingService', () => {
  let billingService: BillingService
  let mockDb: any

  beforeEach(() => {
    mockDb = new PrismaClient()
    billingService = new BillingService({
      stripeApiKey: 'test_stripe_key',
      stripeWebhookSecret: 'test_webhook_secret',
      database: mockDb
    })
    
    // Replace the stripe client with our mock
    ;(billingService as any).stripe = mockStripeClient
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  describe('createSubscription', () => {
    it('should create a subscription for a new customer', async () => {
      const userId = 'user123'
      const organizationId = 'org123'
      
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        stripeCustomerId: null
      })

      mockStripeClient.createCustomer.mockResolvedValue({
        id: 'cus_test123'
      })

      mockStripeClient.createSubscription.mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        current_period_start: 1704067200,
        current_period_end: 1706745600,
        cancel_at_period_end: false,
        trial_end: null
      })

      mockDb.subscription.create.mockResolvedValue({
        id: 'dbsub123',
        organizationId,
        stripeSubscriptionId: 'sub_test123'
      })

      mockDb.organization.update.mockResolvedValue({
        id: organizationId,
        plan: 'STARTER'
      })

      const result = await billingService.createSubscription({
        userId,
        organizationId,
        plan: 'STARTER',
        billingPeriod: 'MONTHLY'
      })

      expect(mockStripeClient.createCustomer).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: { userId, organizationId }
      })

      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { stripeCustomerId: 'cus_test123' }
      })

      expect(result.id).toBe('sub_test123')
    })

    it('should use existing Stripe customer if available', async () => {
      const userId = 'user123'
      const organizationId = 'org123'
      const existingCustomerId = 'cus_existing'
      
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        stripeCustomerId: existingCustomerId
      })

      mockStripeClient.createSubscription.mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        current_period_start: 1704067200,
        current_period_end: 1706745600,
        cancel_at_period_end: false
      })

      await billingService.createSubscription({
        userId,
        organizationId,
        plan: 'PRO',
        billingPeriod: 'YEARLY'
      })

      expect(mockStripeClient.createCustomer).not.toHaveBeenCalled()
      expect(mockStripeClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: existingCustomerId
        })
      )
    })

    it('should attach payment method if provided', async () => {
      const userId = 'user123'
      const organizationId = 'org123'
      const paymentMethodId = 'pm_test123'
      
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        stripeCustomerId: 'cus_test123'
      })

      mockStripeClient.createSubscription.mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        current_period_start: 1704067200,
        current_period_end: 1706745600,
        cancel_at_period_end: false
      })

      await billingService.createSubscription({
        userId,
        organizationId,
        plan: 'STARTER',
        billingPeriod: 'MONTHLY',
        paymentMethodId
      })

      expect(mockStripeClient.attachPaymentMethod).toHaveBeenCalledWith(
        paymentMethodId,
        'cus_test123'
      )
    })
  })

  describe('updateSubscription', () => {
    it('should update subscription plan', async () => {
      const organizationId = 'org123'
      
      mockDb.subscription.findUnique.mockResolvedValue({
        id: 'sub123',
        organizationId,
        stripeSubscriptionId: 'sub_stripe123',
        plan: 'STARTER',
        billingPeriod: 'MONTHLY'
      })

      mockStripeClient.updateSubscription.mockResolvedValue({
        id: 'sub_stripe123',
        status: 'active'
      })

      const result = await billingService.updateSubscription({
        organizationId,
        plan: 'PRO'
      })

      expect(mockStripeClient.updateSubscription).toHaveBeenCalled()
      expect(mockDb.subscription.update).toHaveBeenCalled()
      expect(mockDb.organization.update).toHaveBeenCalledWith({
        where: { id: organizationId },
        data: expect.objectContaining({ plan: 'PRO' })
      })
    })

    it('should throw error if subscription not found', async () => {
      mockDb.subscription.findUnique.mockResolvedValue(null)

      await expect(
        billingService.updateSubscription({
          organizationId: 'org123',
          plan: 'PRO'
        })
      ).rejects.toThrow('Subscription not found')
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end by default', async () => {
      const organizationId = 'org123'
      
      mockDb.subscription.findUnique.mockResolvedValue({
        id: 'sub123',
        organizationId,
        stripeSubscriptionId: 'sub_stripe123'
      })

      mockStripeClient.cancelSubscription.mockResolvedValue({
        id: 'sub_stripe123',
        status: 'active',
        cancel_at_period_end: true
      })

      await billingService.cancelSubscription(organizationId)

      expect(mockStripeClient.cancelSubscription).toHaveBeenCalledWith(
        'sub_stripe123',
        false
      )
      
      expect(mockDb.organization.update).not.toHaveBeenCalled()
    })

    it('should cancel subscription immediately if requested', async () => {
      const organizationId = 'org123'
      
      mockDb.subscription.findUnique.mockResolvedValue({
        id: 'sub123',
        organizationId,
        stripeSubscriptionId: 'sub_stripe123'
      })

      mockStripeClient.cancelSubscription.mockResolvedValue({
        id: 'sub_stripe123',
        status: 'canceled',
        cancel_at_period_end: false
      })

      await billingService.cancelSubscription(organizationId, true)

      expect(mockStripeClient.cancelSubscription).toHaveBeenCalledWith(
        'sub_stripe123',
        true
      )
      
      expect(mockDb.organization.update).toHaveBeenCalledWith({
        where: { id: organizationId },
        data: expect.objectContaining({ plan: 'FREE' })
      })
    })
  })

  describe('checkLimit', () => {
    it('should check usage limits correctly', async () => {
      const organizationId = 'org123'
      
      mockDb.organization.findUnique.mockResolvedValue({
        id: organizationId,
        plan: 'STARTER',
        projects: [{ id: '1' }, { id: '2' }],
        members: [{ id: '1' }, { id: '2' }, { id: '3' }],
        usage: [{
          storage: 5,
          deployments: 50,
          apiRequests: 50000,
          aiRequests: 500
        }]
      })

      const result = await billingService.checkLimit(organizationId, 'projects')

      expect(result.allowed).toBe(true)
      expect(result.current).toBe(2)
      expect(result.limit).toBe(10) // STARTER plan limit
      expect(result.remaining).toBe(8)
    })

    it('should return unlimited for enterprise plan', async () => {
      const organizationId = 'org123'
      
      mockDb.organization.findUnique.mockResolvedValue({
        id: organizationId,
        plan: 'ENTERPRISE',
        projects: Array(100).fill({ id: '1' }),
        members: [],
        usage: [{}]
      })

      const result = await billingService.checkLimit(organizationId, 'projects')

      expect(result.allowed).toBe(true)
      expect(result.limit).toBe(-1)
      expect(result.current).toBe(100)
    })
  })

  describe('handleWebhook', () => {
    it('should process subscription created webhook', async () => {
      const event = {
        id: 'evt_test123',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'active',
            metadata: {
              organizationId: 'org123',
              plan: 'STARTER',
              billingPeriod: 'MONTHLY'
            },
            current_period_start: 1704067200,
            current_period_end: 1706745600,
            cancel_at_period_end: false,
            trial_end: null,
            items: {
              data: [{
                price: { id: 'price_test123' }
              }]
            }
          }
        }
      }

      mockStripeClient.constructWebhookEvent.mockReturnValue(event)
      
      await billingService.handleWebhook('payload', 'signature')

      expect(mockDb.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: 'sub_test123' },
          create: expect.objectContaining({
            organizationId: 'org123',
            stripeCustomerId: 'cus_test123',
            stripeSubscriptionId: 'sub_test123'
          })
        })
      )

      expect(mockDb.webhookEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          stripeEventId: 'evt_test123',
          type: 'customer.subscription.created',
          processed: true
        })
      })
    })

    it('should handle webhook signature verification failure', async () => {
      mockStripeClient.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      await expect(
        billingService.handleWebhook('payload', 'invalid-signature')
      ).rejects.toThrow('Invalid webhook signature')
    })
  })

  describe('trackUsage', () => {
    it('should track usage metrics', async () => {
      const organizationId = 'org123'
      
      mockDb.usage.upsert.mockResolvedValue({
        id: 'usage123',
        organizationId,
        apiRequests: 1000
      })

      mockDb.organization.findUnique.mockResolvedValue({
        id: organizationId,
        plan: 'STARTER'
      })

      await billingService.trackUsage(organizationId, 'apiRequests', 100)

      expect(mockDb.usage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            organizationId,
            apiRequests: 100
          }),
          update: expect.objectContaining({
            apiRequests: { increment: 100 }
          })
        })
      )
    })

    it('should send usage alert when limit exceeded', async () => {
      const organizationId = 'org123'
      
      mockDb.usage.upsert.mockResolvedValue({
        id: 'usage123',
        organizationId,
        apiRequests: 150000 // Exceeds STARTER limit of 100000
      })

      mockDb.organization.findUnique.mockResolvedValue({
        id: organizationId,
        plan: 'STARTER',
        members: [{
          role: 'OWNER',
          userId: 'user123',
          user: { id: 'user123', email: 'owner@example.com' }
        }]
      })

      mockDb.notification = { create: vi.fn() }

      await billingService.trackUsage(organizationId, 'apiRequests', 50000)

      expect(mockDb.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          type: 'USAGE_LIMIT',
          title: 'Usage Limit Alert'
        })
      })
    })
  })
})