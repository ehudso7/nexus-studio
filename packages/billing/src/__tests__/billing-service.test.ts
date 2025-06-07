import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BillingService } from '../billing-service'
import { PrismaClient } from '@nexus/database'

// Mock the entire StripeClient module
vi.mock('../stripe-client', () => ({
  StripeClient: vi.fn().mockImplementation(() => ({
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
  }))
}))

// Mock SubscriptionManager
vi.mock('../subscription-manager', () => ({
  SubscriptionManager: vi.fn().mockImplementation(() => ({
    createSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
    resumeSubscription: vi.fn(),
    checkSubscriptionLimits: vi.fn()
  }))
}))

// Mock WebhookHandler  
vi.mock('../webhook-handler', () => ({
  WebhookHandler: vi.fn().mockImplementation(() => ({
    handleWebhook: vi.fn()
  }))
}))

// Mock UsageTracker
vi.mock('../usage-tracker', () => ({
  UsageTracker: vi.fn().mockImplementation(() => ({
    trackUsage: vi.fn(),
    getUsage: vi.fn()
  }))
}))

// Mock InvoiceService
vi.mock('../invoice-service', () => ({
  InvoiceService: vi.fn().mockImplementation(() => ({
    listInvoices: vi.fn(),
    downloadInvoice: vi.fn()
  }))
}))

// Mock Prisma
vi.mock('@nexus/database', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({}))
}))

describe('BillingService', () => {
  let billingService: BillingService
  let mockDb: any
  let mockStripeClient: any
  let mockSubscriptionManager: any
  let mockWebhookHandler: any
  let mockUsageTracker: any
  let mockInvoiceService: any

  beforeEach(() => {
    mockDb = new PrismaClient()
    billingService = new BillingService({
      stripeApiKey: 'test_stripe_key',
      stripeWebhookSecret: 'test_webhook_secret',
      database: mockDb
    })
    
    // Get the mocked instances
    mockStripeClient = (billingService as any).stripe
    mockSubscriptionManager = (billingService as any).subscriptions
    mockWebhookHandler = (billingService as any).webhooks
    mockUsageTracker = (billingService as any).usage
    mockInvoiceService = (billingService as any).invoices
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  describe('createSubscription', () => {
    it('should delegate to subscription manager', async () => {
      const params = {
        userId: 'user123',
        organizationId: 'org123',
        plan: 'STARTER' as const,
        billingPeriod: 'MONTHLY' as const
      }

      const mockResult = { id: 'sub_test123', status: 'active' }
      mockSubscriptionManager.createSubscription.mockResolvedValue(mockResult)

      const result = await billingService.createSubscription(params)

      expect(mockSubscriptionManager.createSubscription).toHaveBeenCalledWith(params)
      expect(result).toBe(mockResult)
    })
  })

  describe('updateSubscription', () => {
    it('should delegate to subscription manager', async () => {
      const params = {
        organizationId: 'org123',
        plan: 'PRO' as const,
        billingPeriod: 'MONTHLY' as const
      }

      const mockResult = { id: 'sub_test123', status: 'active' }
      mockSubscriptionManager.updateSubscription.mockResolvedValue(mockResult)

      const result = await billingService.updateSubscription(params)

      expect(mockSubscriptionManager.updateSubscription).toHaveBeenCalledWith(params)
      expect(result).toBe(mockResult)
    })
  })

  describe('cancelSubscription', () => {
    it('should delegate to subscription manager with default parameters', async () => {
      const organizationId = 'org123'
      const mockResult = { id: 'sub_test123', status: 'canceled' }
      mockSubscriptionManager.cancelSubscription.mockResolvedValue(mockResult)

      const result = await billingService.cancelSubscription(organizationId)

      expect(mockSubscriptionManager.cancelSubscription).toHaveBeenCalledWith(organizationId, false)
      expect(result).toBe(mockResult)
    })

    it('should delegate to subscription manager with immediate cancellation', async () => {
      const organizationId = 'org123'
      const mockResult = { id: 'sub_test123', status: 'canceled' }
      mockSubscriptionManager.cancelSubscription.mockResolvedValue(mockResult)

      const result = await billingService.cancelSubscription(organizationId, true)

      expect(mockSubscriptionManager.cancelSubscription).toHaveBeenCalledWith(organizationId, true)
      expect(result).toBe(mockResult)
    })
  })

  describe('handleWebhook', () => {
    it('should delegate to webhook handler', async () => {
      const payload = 'webhook_payload'
      const signature = 'webhook_signature'
      
      mockWebhookHandler.handleWebhook.mockResolvedValue(undefined)

      await billingService.handleWebhook(payload, signature)

      expect(mockWebhookHandler.handleWebhook).toHaveBeenCalledWith(payload, signature)
    })
  })

  describe('getUsage', () => {
    it('should delegate to usage tracker', async () => {
      const organizationId = 'org123'
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-02-01')
      
      const mockResult = {
        records: [],
        totals: {
          projects: 10,
          teamMembers: 5,
          storage: 2.5,
          deployments: 20,
          apiRequests: 1500,
          aiRequests: 100,
          bandwidth: 1000
        },
        period: { start: startDate, end: endDate }
      }

      mockUsageTracker.getUsage.mockResolvedValue(mockResult)

      const result = await billingService.getUsage(organizationId, startDate, endDate)

      expect(mockUsageTracker.getUsage).toHaveBeenCalledWith(organizationId, startDate, endDate)
      expect(result).toBe(mockResult)
    })
  })

  describe('createCheckoutSession', () => {
    it('should create checkout session with correct parameters', async () => {
      const params = {
        customerId: 'cus_test123',
        plan: 'STARTER' as const,
        billingPeriod: 'MONTHLY' as const,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        organizationId: 'org123',
        userId: 'user123'
      }
      
      const mockResult = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/pay/cs_test123'
      }

      mockStripeClient.createCheckoutSession.mockResolvedValue(mockResult)

      const result = await billingService.createCheckoutSession(params)

      expect(mockStripeClient.createCheckoutSession).toHaveBeenCalledWith({
        customerId: params.customerId,
        priceId: 'price_starter_monthly',
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
        trialDays: 14,
        metadata: {
          organizationId: params.organizationId,
          userId: params.userId,
          plan: params.plan,
          billingPeriod: params.billingPeriod
        }
      })

      expect(result).toBe(mockResult)
    })
  })

  describe('trackUsage', () => {
    it('should delegate to usage tracker', async () => {
      const organizationId = 'org123'
      const metric = 'api_requests'
      const quantity = 100

      mockUsageTracker.trackUsage.mockResolvedValue(undefined)

      await billingService.trackUsage(organizationId, metric, quantity)

      expect(mockUsageTracker.trackUsage).toHaveBeenCalledWith(organizationId, metric, quantity)
    })
  })

  describe('listInvoices', () => {
    it('should delegate to invoice service', async () => {
      const organizationId = 'org123'
      const limit = 10
      const mockResult = [{ id: 'inv_123', status: 'paid' }]

      mockInvoiceService.listInvoices.mockResolvedValue(mockResult)

      const result = await billingService.listInvoices(organizationId, limit)

      expect(mockInvoiceService.listInvoices).toHaveBeenCalledWith(organizationId, limit)
      expect(result).toBe(mockResult)
    })
  })

  describe('addPaymentMethod', () => {
    it('should delegate to stripe client', async () => {
      const customerId = 'cus_test123'
      const paymentMethodId = 'pm_test123'

      mockStripeClient.attachPaymentMethod.mockResolvedValue(undefined)

      await billingService.addPaymentMethod(customerId, paymentMethodId)

      expect(mockStripeClient.attachPaymentMethod).toHaveBeenCalledWith(paymentMethodId, customerId)
    })
  })

  describe('createSetupIntent', () => {
    it('should delegate to stripe client', async () => {
      const customerId = 'cus_test123'
      const mockResult = { id: 'seti_test123', client_secret: 'secret123' }

      mockStripeClient.createSetupIntent.mockResolvedValue(mockResult)

      const result = await billingService.createSetupIntent(customerId)

      expect(mockStripeClient.createSetupIntent).toHaveBeenCalledWith(customerId)
      expect(result).toBe(mockResult)
    })
  })
})