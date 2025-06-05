import { PrismaClient } from '@nexus-studio/database'
import { StripeClient } from './stripe-client'
import { SubscriptionManager } from './subscription-manager'
import { WebhookHandler } from './webhook-handler'
import { UsageTracker } from './usage-tracker'
import { InvoiceService } from './invoice-service'
import { PricingPlan, BillingPeriod } from './types'

export interface BillingServiceConfig {
  stripeApiKey: string
  stripeWebhookSecret: string
  database: PrismaClient
}

export class BillingService {
  private stripe: StripeClient
  private subscriptions: SubscriptionManager
  private webhooks: WebhookHandler
  private usage: UsageTracker
  private invoices: InvoiceService

  constructor(config: BillingServiceConfig) {
    this.stripe = new StripeClient(config.stripeApiKey)
    this.subscriptions = new SubscriptionManager(config.database, this.stripe)
    this.webhooks = new WebhookHandler(config.database, this.stripe, config.stripeWebhookSecret)
    this.usage = new UsageTracker(config.database)
    this.invoices = new InvoiceService(config.database, this.stripe)
  }

  // Subscription Management
  async createSubscription(params: {
    userId: string
    organizationId: string
    plan: PricingPlan
    billingPeriod: BillingPeriod
    paymentMethodId?: string
  }) {
    return this.subscriptions.createSubscription(params)
  }

  async updateSubscription(params: {
    organizationId: string
    plan: PricingPlan
    billingPeriod?: BillingPeriod
  }) {
    return this.subscriptions.updateSubscription(params)
  }

  async cancelSubscription(organizationId: string, immediately = false) {
    return this.subscriptions.cancelSubscription(organizationId, immediately)
  }

  async resumeSubscription(organizationId: string) {
    return this.subscriptions.resumeSubscription(organizationId)
  }

  // Payment Methods
  async addPaymentMethod(customerId: string, paymentMethodId: string) {
    return this.stripe.attachPaymentMethod(paymentMethodId, customerId)
  }

  async listPaymentMethods(customerId: string) {
    return this.stripe.listPaymentMethods(customerId)
  }

  async createSetupIntent(customerId: string) {
    return this.stripe.createSetupIntent(customerId)
  }

  // Billing Portal
  async createBillingPortalSession(customerId: string, returnUrl: string) {
    return this.stripe.createBillingPortalSession({ customerId, returnUrl })
  }

  // Checkout
  async createCheckoutSession(params: {
    customerId: string
    plan: PricingPlan
    billingPeriod: BillingPeriod
    successUrl: string
    cancelUrl: string
    organizationId: string
    userId: string
  }) {
    const priceId = await this.getPriceId(params.plan, params.billingPeriod)
    
    return this.stripe.createCheckoutSession({
      customerId: params.customerId,
      priceId,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      trialDays: params.plan === 'FREE' ? 0 : 14,
      metadata: {
        organizationId: params.organizationId,
        userId: params.userId,
        plan: params.plan,
        billingPeriod: params.billingPeriod
      }
    })
  }

  // Usage Tracking
  async trackUsage(organizationId: string, metric: string, quantity: number) {
    return this.usage.trackUsage(organizationId, metric, quantity)
  }

  async getUsage(organizationId: string, startDate?: Date, endDate?: Date) {
    return this.usage.getUsage(organizationId, startDate, endDate)
  }

  async checkLimit(organizationId: string, resource: string) {
    return this.subscriptions.checkSubscriptionLimits(organizationId, resource as any)
  }

  // Invoices
  async listInvoices(organizationId: string, limit = 10) {
    return this.invoices.listInvoices(organizationId, limit)
  }

  async downloadInvoice(invoiceId: string) {
    return this.invoices.downloadInvoice(invoiceId)
  }

  // Webhooks
  async handleWebhook(payload: string | Buffer, signature: string) {
    return this.webhooks.handleWebhook(payload, signature)
  }

  // Helper Methods
  private async getPriceId(plan: PricingPlan, period: BillingPeriod): Promise<string> {
    const priceMap = {
      'FREE_MONTHLY': process.env.STRIPE_PRICE_FREE_MONTHLY || 'price_free_monthly',
      'FREE_YEARLY': process.env.STRIPE_PRICE_FREE_YEARLY || 'price_free_yearly',
      'STARTER_MONTHLY': process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
      'STARTER_YEARLY': process.env.STRIPE_PRICE_STARTER_YEARLY || 'price_starter_yearly',
      'PRO_MONTHLY': process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
      'PRO_YEARLY': process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
      'ENTERPRISE_MONTHLY': process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',
      'ENTERPRISE_YEARLY': process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || 'price_enterprise_yearly'
    }

    return priceMap[`${plan}_${period}`]
  }

  // Admin Methods
  async createStripeProducts() {
    // This would be run once to set up Stripe products and prices
    const plans = [
      { name: 'Nexus Studio Free', plan: 'FREE' },
      { name: 'Nexus Studio Starter', plan: 'STARTER' },
      { name: 'Nexus Studio Pro', plan: 'PRO' },
      { name: 'Nexus Studio Enterprise', plan: 'ENTERPRISE' }
    ]

    for (const { name, plan } of plans) {
      const product = await this.stripe.createProduct({
        name,
        description: `${plan} plan for Nexus Studio`,
        metadata: { plan }
      })

      // Create monthly price
      if (plan !== 'FREE') {
        const monthlyPrice = await this.stripe.createPrice({
          productId: product.id,
          unitAmount: this.getPlanPrice(plan as PricingPlan, 'MONTHLY') * 100, // Convert to cents
          currency: 'usd',
          interval: 'month',
          metadata: { plan, period: 'MONTHLY' }
        })

        console.log(`Created monthly price for ${plan}: ${monthlyPrice.id}`)
      }

      // Create yearly price
      if (plan !== 'FREE') {
        const yearlyPrice = await this.stripe.createPrice({
          productId: product.id,
          unitAmount: this.getPlanPrice(plan as PricingPlan, 'YEARLY') * 100,
          currency: 'usd',
          interval: 'year',
          metadata: { plan, period: 'YEARLY' }
        })

        console.log(`Created yearly price for ${plan}: ${yearlyPrice.id}`)
      }
    }
  }

  private getPlanPrice(plan: PricingPlan, period: BillingPeriod): number {
    const prices = {
      FREE: { MONTHLY: 0, YEARLY: 0 },
      STARTER: { MONTHLY: 29, YEARLY: 290 },
      PRO: { MONTHLY: 99, YEARLY: 990 },
      ENTERPRISE: { MONTHLY: 499, YEARLY: 4990 }
    }

    return prices[plan][period]
  }
}