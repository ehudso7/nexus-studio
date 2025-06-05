import { Hono } from 'hono'
import { z } from 'zod'
import { BillingService } from '@nexus-studio/billing'
import { requireAuth } from '../middleware/auth'
import { prisma } from '@nexus-studio/database'

const billing = new Hono()

// Initialize billing service
const billingService = new BillingService({
  stripeApiKey: process.env.STRIPE_API_KEY!,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  database: prisma
})

// Subscription endpoints
billing.post('/subscription', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  
  const schema = z.object({
    organizationId: z.string(),
    plan: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']),
    billingPeriod: z.enum(['MONTHLY', 'YEARLY']),
    paymentMethodId: z.string().optional()
  })

  const data = schema.parse(body)

  // Verify user has access to organization
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: data.organizationId,
      userId: user.id,
      role: { in: ['OWNER', 'ADMIN'] }
    }
  })

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const subscription = await billingService.createSubscription({
    userId: user.id,
    ...data
  })

  return c.json({ subscription })
})

billing.patch('/subscription/:organizationId', requireAuth, async (c) => {
  const user = c.get('user')
  const organizationId = c.req.param('organizationId')
  const body = await c.req.json()

  const schema = z.object({
    plan: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']),
    billingPeriod: z.enum(['MONTHLY', 'YEARLY']).optional()
  })

  const data = schema.parse(body)

  // Verify user has access
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId: user.id,
      role: { in: ['OWNER', 'ADMIN'] }
    }
  })

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const subscription = await billingService.updateSubscription({
    organizationId,
    ...data
  })

  return c.json({ subscription })
})

billing.delete('/subscription/:organizationId', requireAuth, async (c) => {
  const user = c.get('user')
  const organizationId = c.req.param('organizationId')
  const immediately = c.req.query('immediately') === 'true'

  // Verify user has access
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId: user.id,
      role: 'OWNER'
    }
  })

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const subscription = await billingService.cancelSubscription(organizationId, immediately)

  return c.json({ subscription })
})

// Payment methods
billing.post('/payment-methods', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()

  const schema = z.object({
    paymentMethodId: z.string()
  })

  const data = schema.parse(body)

  if (!user.stripeCustomerId) {
    return c.json({ error: 'No Stripe customer found' }, 400)
  }

  await billingService.addPaymentMethod(user.stripeCustomerId, data.paymentMethodId)

  return c.json({ success: true })
})

billing.get('/payment-methods', requireAuth, async (c) => {
  const user = c.get('user')

  if (!user.stripeCustomerId) {
    return c.json({ paymentMethods: [] })
  }

  const paymentMethods = await billingService.listPaymentMethods(user.stripeCustomerId)

  return c.json({ paymentMethods: paymentMethods.data })
})

billing.post('/setup-intent', requireAuth, async (c) => {
  const user = c.get('user')

  if (!user.stripeCustomerId) {
    return c.json({ error: 'No Stripe customer found' }, 400)
  }

  const setupIntent = await billingService.createSetupIntent(user.stripeCustomerId)

  return c.json({ 
    clientSecret: setupIntent.client_secret 
  })
})

// Checkout session
billing.post('/checkout', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()

  const schema = z.object({
    organizationId: z.string(),
    plan: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']),
    billingPeriod: z.enum(['MONTHLY', 'YEARLY']),
    successUrl: z.string().url(),
    cancelUrl: z.string().url()
  })

  const data = schema.parse(body)

  // Verify user has access
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: data.organizationId,
      userId: user.id,
      role: { in: ['OWNER', 'ADMIN'] }
    }
  })

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  // Ensure user has Stripe customer
  if (!user.stripeCustomerId) {
    const customer = await billingService.stripe.createCustomer({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: user.id,
        organizationId: data.organizationId
      }
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id }
    })

    user.stripeCustomerId = customer.id
  }

  const session = await billingService.createCheckoutSession({
    customerId: user.stripeCustomerId,
    userId: user.id,
    ...data
  })

  return c.json({ 
    checkoutUrl: session.url 
  })
})

// Billing portal
billing.post('/portal', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()

  const schema = z.object({
    returnUrl: z.string().url()
  })

  const data = schema.parse(body)

  if (!user.stripeCustomerId) {
    return c.json({ error: 'No billing account found' }, 400)
  }

  const session = await billingService.createBillingPortalSession(
    user.stripeCustomerId,
    data.returnUrl
  )

  return c.json({ 
    portalUrl: session.url 
  })
})

// Usage tracking
billing.get('/usage/:organizationId', requireAuth, async (c) => {
  const user = c.get('user')
  const organizationId = c.req.param('organizationId')
  const startDate = c.req.query('startDate')
  const endDate = c.req.query('endDate')

  // Verify user has access
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId: user.id
    }
  })

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const usage = await billingService.getUsage(
    organizationId,
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined
  )

  return c.json({ usage })
})

billing.get('/limits/:organizationId', requireAuth, async (c) => {
  const user = c.get('user')
  const organizationId = c.req.param('organizationId')
  const resource = c.req.query('resource')

  // Verify user has access
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId: user.id
    }
  })

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  if (!resource) {
    return c.json({ error: 'Resource parameter required' }, 400)
  }

  const limit = await billingService.checkLimit(organizationId, resource)

  return c.json({ limit })
})

// Invoices
billing.get('/invoices/:organizationId', requireAuth, async (c) => {
  const user = c.get('user')
  const organizationId = c.req.param('organizationId')
  const limit = parseInt(c.req.query('limit') || '10')

  // Verify user has access
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId: user.id,
      role: { in: ['OWNER', 'ADMIN'] }
    }
  })

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const invoices = await billingService.listInvoices(organizationId, limit)

  return c.json({ invoices })
})

billing.get('/invoice/:invoiceId/download', requireAuth, async (c) => {
  const invoiceId = c.req.param('invoiceId')

  // TODO: Verify user has access to this invoice

  const invoice = await billingService.downloadInvoice(invoiceId)

  return c.json({ 
    downloadUrl: invoice.url,
    filename: invoice.filename 
  })
})

// Webhook endpoint (no auth required)
billing.post('/webhook', async (c) => {
  const signature = c.req.header('stripe-signature')
  
  if (!signature) {
    return c.json({ error: 'Missing signature' }, 400)
  }

  const body = await c.req.text()

  try {
    await billingService.handleWebhook(body, signature)
    return c.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return c.json({ error: 'Webhook processing failed' }, 400)
  }
})

export { billing }