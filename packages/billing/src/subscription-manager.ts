import { PrismaClient } from '@nexus/database'
import { StripeClient } from './stripe-client'
import { 
  PricingPlan, 
  BillingPeriod, 
  SubscriptionStatus,
  PLAN_LIMITS,
  PLAN_PRICES
} from './types'

export class SubscriptionManager {
  constructor(
    private db: PrismaClient,
    private stripe: StripeClient
  ) {}

  async createSubscription(params: {
    userId: string
    organizationId: string
    plan: PricingPlan
    billingPeriod: BillingPeriod
    paymentMethodId?: string
  }) {
    const { userId, organizationId, plan, billingPeriod, paymentMethodId } = params

    // Get or create Stripe customer
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { organizations: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    let stripeCustomerId = user.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await this.stripe.createCustomer({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
          organizationId
        }
      })
      
      stripeCustomerId = customer.id
      
      await this.db.user.update({
        where: { id: userId },
        data: { stripeCustomerId }
      })
    }

    // Attach payment method if provided
    if (paymentMethodId) {
      await this.stripe.attachPaymentMethod(paymentMethodId, stripeCustomerId)
    }

    // Get the appropriate price ID
    const priceId = await this.getPriceId(plan, billingPeriod)

    // Create Stripe subscription
    const subscription = await this.stripe.createSubscription({
      customerId: stripeCustomerId,
      priceId,
      trialDays: plan === 'FREE' ? 0 : 14, // 14-day trial for paid plans
      metadata: {
        userId,
        organizationId,
        plan,
        billingPeriod
      }
    })

    // Store subscription in database
    await this.db.subscription.create({
      data: {
        organizationId,
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        plan,
        billingPeriod,
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
      }
    })

    // Update organization with new plan
    await this.db.organization.update({
      where: { id: organizationId },
      data: { 
        plan,
        planLimits: PLAN_LIMITS[plan]
      }
    })

    return subscription
  }

  async updateSubscription(params: {
    organizationId: string
    plan: PricingPlan
    billingPeriod?: BillingPeriod
  }) {
    const subscription = await this.db.subscription.findUnique({
      where: { organizationId: params.organizationId }
    })

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    const newPriceId = await this.getPriceId(
      params.plan, 
      params.billingPeriod || subscription.billingPeriod
    )

    // Update Stripe subscription
    const updatedSubscription = await this.stripe.updateSubscription(
      subscription.stripeSubscriptionId,
      {
        priceId: newPriceId,
        metadata: {
          plan: params.plan,
          billingPeriod: params.billingPeriod || subscription.billingPeriod
        }
      }
    )

    // Update database
    await this.db.subscription.update({
      where: { id: subscription.id },
      data: {
        plan: params.plan,
        billingPeriod: params.billingPeriod || subscription.billingPeriod,
        stripePriceId: newPriceId,
        status: this.mapStripeStatus(updatedSubscription.status)
      }
    })

    // Update organization plan
    await this.db.organization.update({
      where: { id: params.organizationId },
      data: { 
        plan: params.plan,
        planLimits: PLAN_LIMITS[params.plan]
      }
    })

    return updatedSubscription
  }

  async cancelSubscription(organizationId: string, immediately = false) {
    const subscription = await this.db.subscription.findUnique({
      where: { organizationId }
    })

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    const canceledSubscription = await this.stripe.cancelSubscription(
      subscription.stripeSubscriptionId,
      immediately
    )

    await this.db.subscription.update({
      where: { id: subscription.id },
      data: {
        status: this.mapStripeStatus(canceledSubscription.status),
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
        canceledAt: new Date()
      }
    })

    if (immediately) {
      await this.db.organization.update({
        where: { id: organizationId },
        data: { 
          plan: 'FREE',
          planLimits: PLAN_LIMITS.FREE
        }
      })
    }

    return canceledSubscription
  }

  async resumeSubscription(organizationId: string) {
    const subscription = await this.db.subscription.findUnique({
      where: { organizationId }
    })

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    const resumedSubscription = await this.stripe.resumeSubscription(
      subscription.stripeSubscriptionId
    )

    await this.db.subscription.update({
      where: { id: subscription.id },
      data: {
        status: this.mapStripeStatus(resumedSubscription.status),
        cancelAtPeriodEnd: false,
        canceledAt: null
      }
    })

    return resumedSubscription
  }

  async checkSubscriptionLimits(organizationId: string, resource: keyof PlanLimits) {
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId },
      include: {
        projects: true,
        members: true,
        usage: {
          where: {
            period: {
              gte: new Date(new Date().setDate(1)) // Current month
            }
          }
        }
      }
    })

    if (!organization) {
      throw new Error('Organization not found')
    }

    const limits = PLAN_LIMITS[organization.plan]
    const currentUsage = await this.getCurrentUsage(organization)

    if (limits[resource] === -1) {
      return { allowed: true, limit: -1, current: currentUsage[resource] }
    }

    const allowed = currentUsage[resource] < limits[resource]
    
    return {
      allowed,
      limit: limits[resource],
      current: currentUsage[resource],
      remaining: Math.max(0, limits[resource] - currentUsage[resource])
    }
  }

  private async getCurrentUsage(organization: any) {
    const currentMonth = organization.usage[0]

    return {
      projects: organization.projects.length,
      teamMembers: organization.members.length,
      storage: currentMonth?.storage || 0,
      deployments: currentMonth?.deployments || 0,
      customDomains: organization.projects.reduce(
        (acc: number, p: any) => acc + (p.customDomains?.length || 0), 
        0
      ),
      apiRequests: currentMonth?.apiRequests || 0,
      aiRequests: currentMonth?.aiRequests || 0,
      supportLevel: PLAN_LIMITS[organization.plan].supportLevel,
      sla: PLAN_LIMITS[organization.plan].sla
    }
  }

  private async getPriceId(plan: PricingPlan, period: BillingPeriod): Promise<string> {
    // In production, these would be actual Stripe Price IDs
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

  private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      'active': 'ACTIVE',
      'past_due': 'PAST_DUE',
      'canceled': 'CANCELED',
      'incomplete': 'INCOMPLETE',
      'incomplete_expired': 'INCOMPLETE_EXPIRED',
      'trialing': 'TRIALING',
      'paused': 'PAUSED'
    }

    return statusMap[stripeStatus] || 'INCOMPLETE'
  }
}