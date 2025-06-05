import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { billing } from '../billing'
import { prisma } from '@nexus-studio/database'

// Mock dependencies
vi.mock('@nexus-studio/database', () => ({
  prisma: {
    organizationMember: {
      findFirst: vi.fn()
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    subscription: {
      findUnique: vi.fn()
    }
  }
}))

vi.mock('@nexus-studio/billing', () => ({
  BillingService: vi.fn().mockImplementation(() => ({
    createSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
    addPaymentMethod: vi.fn(),
    listPaymentMethods: vi.fn(),
    createSetupIntent: vi.fn(),
    createCheckoutSession: vi.fn(),
    createBillingPortalSession: vi.fn(),
    getUsage: vi.fn(),
    checkLimit: vi.fn(),
    listInvoices: vi.fn(),
    downloadInvoice: vi.fn(),
    handleWebhook: vi.fn()
  }))
}))

// Mock auth middleware
vi.mock('../../middleware/auth', () => ({
  requireAuth: vi.fn().mockImplementation(async (c: any, next: any) => {
    c.set('user', {
      id: 'user123',
      email: 'test@example.com',
      stripeCustomerId: 'cus_test123'
    })
    await next()
  })
}))

describe('Billing Routes', () => {
  let app: Hono
  let mockBillingService: any

  beforeEach(() => {
    app = new Hono()
    app.route('/billing', billing)
    
    // Get the mocked billing service instance
    const BillingService = require('@nexus-studio/billing').BillingService
    mockBillingService = new BillingService()
    
    vi.clearAllMocks()
  })

  describe('POST /billing/subscription', () => {
    it('should create a subscription for authorized user', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member123',
        role: 'OWNER'
      })

      mockBillingService.createSubscription.mockResolvedValue({
        id: 'sub_test123',
        status: 'active'
      })

      const response = await app.request('/billing/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'org123',
          plan: 'STARTER',
          billingPeriod: 'MONTHLY'
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.subscription.id).toBe('sub_test123')
      expect(mockBillingService.createSubscription).toHaveBeenCalledWith({
        userId: 'user123',
        organizationId: 'org123',
        plan: 'STARTER',
        billingPeriod: 'MONTHLY'
      })
    })

    it('should reject unauthorized user', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue(null)

      const response = await app.request('/billing/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'org123',
          plan: 'STARTER',
          billingPeriod: 'MONTHLY'
        })
      })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should validate request body', async () => {
      const response = await app.request('/billing/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'org123',
          plan: 'INVALID_PLAN',
          billingPeriod: 'MONTHLY'
        })
      })

      expect(response.status).toBe(400)
    })
  })

  describe('PATCH /billing/subscription/:organizationId', () => {
    it('should update subscription plan', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member123',
        role: 'ADMIN'
      })

      mockBillingService.updateSubscription.mockResolvedValue({
        id: 'sub_test123',
        plan: 'PRO'
      })

      const response = await app.request('/billing/subscription/org123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'PRO',
          billingPeriod: 'YEARLY'
        })
      })

      expect(response.status).toBe(200)
      expect(mockBillingService.updateSubscription).toHaveBeenCalledWith({
        organizationId: 'org123',
        plan: 'PRO',
        billingPeriod: 'YEARLY'
      })
    })
  })

  describe('DELETE /billing/subscription/:organizationId', () => {
    it('should cancel subscription', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member123',
        role: 'OWNER'
      })

      mockBillingService.cancelSubscription.mockResolvedValue({
        id: 'sub_test123',
        cancel_at_period_end: true
      })

      const response = await app.request('/billing/subscription/org123', {
        method: 'DELETE'
      })

      expect(response.status).toBe(200)
      expect(mockBillingService.cancelSubscription).toHaveBeenCalledWith('org123', false)
    })

    it('should cancel immediately with query param', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member123',
        role: 'OWNER'
      })

      mockBillingService.cancelSubscription.mockResolvedValue({
        id: 'sub_test123',
        status: 'canceled'
      })

      const response = await app.request('/billing/subscription/org123?immediately=true', {
        method: 'DELETE'
      })

      expect(response.status).toBe(200)
      expect(mockBillingService.cancelSubscription).toHaveBeenCalledWith('org123', true)
    })

    it('should require OWNER role to cancel', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member123',
        role: 'ADMIN'
      })

      const response = await app.request('/billing/subscription/org123', {
        method: 'DELETE'
      })

      expect(response.status).toBe(403)
    })
  })

  describe('POST /billing/checkout', () => {
    it('should create checkout session', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member123',
        role: 'OWNER'
      })

      mockBillingService.createCheckoutSession.mockResolvedValue({
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/session/cs_test123'
      })

      const response = await app.request('/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'org123',
          plan: 'PRO',
          billingPeriod: 'YEARLY',
          successUrl: 'https://app.example.com/success',
          cancelUrl: 'https://app.example.com/cancel'
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.checkoutUrl).toBe('https://checkout.stripe.com/session/cs_test123')
    })

    it('should create Stripe customer if not exists', async () => {
      // Override the user to not have stripeCustomerId
      const requireAuth = require('../../middleware/auth').requireAuth
      requireAuth.mockImplementationOnce(async (c: any, next: any) => {
        c.set('user', {
          id: 'user123',
          email: 'test@example.com',
          stripeCustomerId: null
        })
        await next()
      })

      prisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member123',
        role: 'OWNER'
      })

      // Mock the billing service stripe client
      mockBillingService.stripe = {
        createCustomer: vi.fn().mockResolvedValue({ id: 'cus_new123' })
      }

      mockBillingService.createCheckoutSession.mockResolvedValue({
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/session/cs_test123'
      })

      const response = await app.request('/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'org123',
          plan: 'STARTER',
          billingPeriod: 'MONTHLY',
          successUrl: 'https://app.example.com/success',
          cancelUrl: 'https://app.example.com/cancel'
        })
      })

      expect(response.status).toBe(200)
      expect(mockBillingService.stripe.createCustomer).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: undefined,
        metadata: {
          userId: 'user123',
          organizationId: 'org123'
        }
      })
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: { stripeCustomerId: 'cus_new123' }
      })
    })
  })

  describe('GET /billing/usage/:organizationId', () => {
    it('should return usage data', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member123',
        role: 'MEMBER'
      })

      mockBillingService.getUsage.mockResolvedValue({
        records: [],
        totals: {
          projects: 5,
          teamMembers: 3,
          storage: 2.5,
          deployments: 25,
          apiRequests: 50000,
          aiRequests: 500,
          bandwidth: 10
        },
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      })

      const response = await app.request('/billing/usage/org123')

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.usage.totals.projects).toBe(5)
    })

    it('should support date range filters', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member123',
        role: 'MEMBER'
      })

      mockBillingService.getUsage.mockResolvedValue({
        records: [],
        totals: {},
        period: {}
      })

      const response = await app.request(
        '/billing/usage/org123?startDate=2024-01-01&endDate=2024-01-31'
      )

      expect(response.status).toBe(200)
      expect(mockBillingService.getUsage).toHaveBeenCalledWith(
        'org123',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )
    })
  })

  describe('GET /billing/limits/:organizationId', () => {
    it('should check resource limits', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member123',
        role: 'MEMBER'
      })

      mockBillingService.checkLimit.mockResolvedValue({
        allowed: true,
        limit: 10,
        current: 3,
        remaining: 7
      })

      const response = await app.request('/billing/limits/org123?resource=projects')

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.limit.allowed).toBe(true)
      expect(data.limit.remaining).toBe(7)
    })

    it('should require resource parameter', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member123',
        role: 'MEMBER'
      })

      const response = await app.request('/billing/limits/org123')

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Resource parameter required')
    })
  })

  describe('POST /billing/webhook', () => {
    it('should process webhook events', async () => {
      mockBillingService.handleWebhook.mockResolvedValue(undefined)

      const response = await app.request('/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test_signature'
        },
        body: JSON.stringify({ type: 'invoice.payment_succeeded' })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.received).toBe(true)
    })

    it('should reject webhook without signature', async () => {
      const response = await app.request('/billing/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invoice.payment_succeeded' })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Missing signature')
    })

    it('should handle webhook processing errors', async () => {
      mockBillingService.handleWebhook.mockRejectedValue(new Error('Invalid signature'))

      const response = await app.request('/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'invalid_signature'
        },
        body: JSON.stringify({ type: 'invoice.payment_succeeded' })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Webhook processing failed')
    })
  })
})