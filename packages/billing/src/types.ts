import { z } from 'zod'

export const PricingPlanSchema = z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE'])
export type PricingPlan = z.infer<typeof PricingPlanSchema>

export const BillingPeriodSchema = z.enum(['MONTHLY', 'YEARLY'])
export type BillingPeriod = z.infer<typeof BillingPeriodSchema>

export const SubscriptionStatusSchema = z.enum([
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'INCOMPLETE',
  'INCOMPLETE_EXPIRED',
  'TRIALING',
  'PAUSED'
])
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>

export interface PlanLimits {
  projects: number
  teamMembers: number
  storage: number // in GB
  deployments: number
  customDomains: number
  apiRequests: number // per month
  aiRequests: number // per month
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated'
  sla: number // uptime percentage
}

export const PLAN_LIMITS: Record<PricingPlan, PlanLimits> = {
  FREE: {
    projects: 3,
    teamMembers: 1,
    storage: 1,
    deployments: 10,
    customDomains: 0,
    apiRequests: 10000,
    aiRequests: 100,
    supportLevel: 'community',
    sla: 0
  },
  STARTER: {
    projects: 10,
    teamMembers: 5,
    storage: 10,
    deployments: 100,
    customDomains: 3,
    apiRequests: 100000,
    aiRequests: 1000,
    supportLevel: 'email',
    sla: 99
  },
  PRO: {
    projects: 50,
    teamMembers: 20,
    storage: 50,
    deployments: 500,
    customDomains: 10,
    apiRequests: 1000000,
    aiRequests: 10000,
    supportLevel: 'priority',
    sla: 99.9
  },
  ENTERPRISE: {
    projects: -1, // unlimited
    teamMembers: -1,
    storage: -1,
    deployments: -1,
    customDomains: -1,
    apiRequests: -1,
    aiRequests: -1,
    supportLevel: 'dedicated',
    sla: 99.99
  }
}

export const PLAN_PRICES = {
  FREE: {
    MONTHLY: 0,
    YEARLY: 0
  },
  STARTER: {
    MONTHLY: 29,
    YEARLY: 290 // ~17% discount
  },
  PRO: {
    MONTHLY: 99,
    YEARLY: 990 // ~17% discount
  },
  ENTERPRISE: {
    MONTHLY: -1, // custom pricing
    YEARLY: -1
  }
}

export interface SubscriptionData {
  id: string
  userId: string
  organizationId?: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string
  plan: PricingPlan
  billingPeriod: BillingPeriod
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  metadata: Record<string, any>
}

export interface UsageData {
  organizationId: string
  period: Date
  projects: number
  teamMembers: number
  storage: number
  deployments: number
  apiRequests: number
  aiRequests: number
}

export interface InvoiceData {
  id: string
  organizationId: string
  stripeInvoiceId: string
  amount: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
  dueDate: Date
  paidAt?: Date
  items: InvoiceItem[]
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitAmount: number
  amount: number
}