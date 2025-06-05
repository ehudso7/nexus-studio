import Stripe from 'stripe'

export class StripeClient {
  private stripe: Stripe

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  }

  // Customer Management
  async createCustomer(params: {
    email: string
    name?: string
    metadata?: Record<string, string>
  }) {
    return this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata || {}
    })
  }

  async updateCustomer(customerId: string, params: {
    email?: string
    name?: string
    defaultPaymentMethod?: string
  }) {
    return this.stripe.customers.update(customerId, params)
  }

  async deleteCustomer(customerId: string) {
    return this.stripe.customers.del(customerId)
  }

  // Payment Methods
  async attachPaymentMethod(paymentMethodId: string, customerId: string) {
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    })
    
    // Set as default payment method
    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })
  }

  async listPaymentMethods(customerId: string) {
    return this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })
  }

  async createSetupIntent(customerId: string) {
    return this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    })
  }

  // Subscriptions
  async createSubscription(params: {
    customerId: string
    priceId: string
    trialDays?: number
    metadata?: Record<string, string>
  }) {
    return this.stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId }],
      trial_period_days: params.trialDays,
      metadata: params.metadata || {},
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent']
    })
  }

  async updateSubscription(subscriptionId: string, params: {
    priceId?: string
    quantity?: number
    metadata?: Record<string, string>
  }) {
    const updates: any = {
      metadata: params.metadata
    }

    if (params.priceId) {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
      updates.items = [{
        id: subscription.items.data[0].id,
        price: params.priceId,
        quantity: params.quantity
      }]
    }

    return this.stripe.subscriptions.update(subscriptionId, updates)
  }

  async cancelSubscription(subscriptionId: string, immediately = false) {
    if (immediately) {
      return this.stripe.subscriptions.cancel(subscriptionId)
    } else {
      return this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      })
    }
  }

  async resumeSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    })
  }

  async pauseSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: 'mark_uncollectible'
      }
    })
  }

  // Billing Portal
  async createBillingPortalSession(params: {
    customerId: string
    returnUrl: string
  }) {
    return this.stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    })
  }

  // Checkout Session
  async createCheckoutSession(params: {
    customerId: string
    priceId: string
    successUrl: string
    cancelUrl: string
    trialDays?: number
    metadata?: Record<string, string>
  }) {
    return this.stripe.checkout.sessions.create({
      customer: params.customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: params.priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      subscription_data: {
        trial_period_days: params.trialDays,
        metadata: params.metadata || {}
      }
    })
  }

  // Invoices
  async listInvoices(customerId: string, limit = 10) {
    return this.stripe.invoices.list({
      customer: customerId,
      limit,
    })
  }

  async retrieveInvoice(invoiceId: string) {
    return this.stripe.invoices.retrieve(invoiceId)
  }

  async retrieveUpcomingInvoice(customerId: string) {
    return this.stripe.invoices.retrieveUpcoming({
      customer: customerId,
    })
  }

  // Usage Records (for metered billing)
  async createUsageRecord(subscriptionItemId: string, quantity: number, timestamp?: number) {
    return this.stripe.subscriptionItems.createUsageRecord(
      subscriptionItemId,
      {
        quantity,
        timestamp: timestamp || Math.floor(Date.now() / 1000),
        action: 'increment',
      }
    )
  }

  // Products and Prices
  async createProduct(params: {
    name: string
    description?: string
    metadata?: Record<string, string>
  }) {
    return this.stripe.products.create({
      name: params.name,
      description: params.description,
      metadata: params.metadata || {}
    })
  }

  async createPrice(params: {
    productId: string
    unitAmount: number
    currency: string
    interval: 'month' | 'year'
    metadata?: Record<string, string>
  }) {
    return this.stripe.prices.create({
      product: params.productId,
      unit_amount: params.unitAmount,
      currency: params.currency,
      recurring: {
        interval: params.interval,
      },
      metadata: params.metadata || {}
    })
  }

  // Webhooks
  constructWebhookEvent(payload: string | Buffer, signature: string, secret: string) {
    return this.stripe.webhooks.constructEvent(payload, signature, secret)
  }

  // Stripe instance getter for advanced use cases
  getStripeInstance() {
    return this.stripe
  }
}