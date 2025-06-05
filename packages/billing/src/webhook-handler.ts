import { PrismaClient } from '@nexus-studio/database'
import { StripeClient } from './stripe-client'
import Stripe from 'stripe'

export class WebhookHandler {
  constructor(
    private db: PrismaClient,
    private stripe: StripeClient,
    private webhookSecret: string
  ) {}

  async handleWebhook(payload: string | Buffer, signature: string) {
    let event: Stripe.Event

    try {
      event = this.stripe.constructWebhookEvent(payload, signature, this.webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      throw new Error('Invalid webhook signature')
    }

    console.log(`Processing webhook event: ${event.type}`)

    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription)
          break

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
          break

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
          break

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
          break

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object as Stripe.Subscription)
          break

        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod)
          break

        case 'payment_method.detached':
          await this.handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod)
          break

        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
          break

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      // Log webhook event
      await this.db.webhookEvent.create({
        data: {
          stripeEventId: event.id,
          type: event.type,
          processed: true,
          data: event.data.object as any
        }
      })
    } catch (error) {
      console.error(`Error processing webhook ${event.type}:`, error)
      
      // Log failed webhook
      await this.db.webhookEvent.create({
        data: {
          stripeEventId: event.id,
          type: event.type,
          processed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: event.data.object as any
        }
      })

      throw error
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const organizationId = subscription.metadata.organizationId
    if (!organizationId) return

    await this.db.subscription.upsert({
      where: { stripeSubscriptionId: subscription.id },
      create: {
        organizationId,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        plan: subscription.metadata.plan as any,
        billingPeriod: subscription.metadata.billingPeriod as any,
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
      },
      update: {
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    })
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const dbSubscription = await this.db.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id }
    })

    if (!dbSubscription) return

    await this.db.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        stripePriceId: subscription.items.data[0].price.id,
        plan: subscription.metadata.plan as any || dbSubscription.plan,
        billingPeriod: subscription.metadata.billingPeriod as any || dbSubscription.billingPeriod
      }
    })

    // Update organization plan if changed
    if (subscription.metadata.plan && subscription.metadata.plan !== dbSubscription.plan) {
      await this.db.organization.update({
        where: { id: dbSubscription.organizationId },
        data: { plan: subscription.metadata.plan as any }
      })
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const dbSubscription = await this.db.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id }
    })

    if (!dbSubscription) return

    await this.db.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date()
      }
    })

    // Downgrade to free plan
    await this.db.organization.update({
      where: { id: dbSubscription.organizationId },
      data: { plan: 'FREE' }
    })

    // TODO: Send cancellation email
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return

    const subscription = await this.db.subscription.findUnique({
      where: { stripeSubscriptionId: invoice.subscription as string }
    })

    if (!subscription) return

    // Record payment
    await this.db.payment.create({
      data: {
        organizationId: subscription.organizationId,
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: invoice.payment_intent as string,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'SUCCEEDED',
        description: `Payment for ${subscription.plan} plan`,
        metadata: {
          invoiceNumber: invoice.number,
          billingPeriod: subscription.billingPeriod
        }
      }
    })

    // Update subscription status if needed
    if (subscription.status === 'PAST_DUE') {
      await this.db.subscription.update({
        where: { id: subscription.id },
        data: { status: 'ACTIVE' }
      })
    }

    // TODO: Send payment confirmation email
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return

    const subscription = await this.db.subscription.findUnique({
      where: { stripeSubscriptionId: invoice.subscription as string }
    })

    if (!subscription) return

    // Record failed payment
    await this.db.payment.create({
      data: {
        organizationId: subscription.organizationId,
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: invoice.payment_intent as string,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: 'FAILED',
        description: `Failed payment for ${subscription.plan} plan`,
        metadata: {
          invoiceNumber: invoice.number,
          billingPeriod: subscription.billingPeriod,
          failureReason: invoice.last_finalization_error?.message
        }
      }
    })

    // Update subscription status
    await this.db.subscription.update({
      where: { id: subscription.id },
      data: { status: 'PAST_DUE' }
    })

    // TODO: Send payment failure notification
  }

  private async handleTrialWillEnd(subscription: Stripe.Subscription) {
    const dbSubscription = await this.db.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      include: {
        organization: {
          include: {
            members: {
              where: { role: 'OWNER' },
              include: { user: true }
            }
          }
        }
      }
    })

    if (!dbSubscription) return

    // TODO: Send trial ending reminder email
    console.log(`Trial ending soon for organization ${dbSubscription.organizationId}`)
  }

  private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
    if (!paymentMethod.customer) return

    await this.db.paymentMethod.create({
      data: {
        stripePaymentMethodId: paymentMethod.id,
        stripeCustomerId: paymentMethod.customer as string,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year
        } : undefined,
        isDefault: false
      }
    })
  }

  private async handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod) {
    await this.db.paymentMethod.delete({
      where: { stripePaymentMethodId: paymentMethod.id }
    }).catch(() => {
      // Payment method might not exist in our database
    })
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (session.mode !== 'subscription') return

    const organizationId = session.metadata?.organizationId
    if (!organizationId) return

    // Subscription will be created/updated by subscription webhooks
    // This is mainly for tracking conversion
    await this.db.analyticsEvent.create({
      data: {
        organizationId,
        userId: session.metadata?.userId,
        eventType: 'checkout_completed',
        eventData: {
          sessionId: session.id,
          plan: session.metadata?.plan,
          billingPeriod: session.metadata?.billingPeriod,
          amount: session.amount_total
        }
      }
    })
  }

  private mapStripeStatus(stripeStatus: string): any {
    const statusMap: Record<string, string> = {
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