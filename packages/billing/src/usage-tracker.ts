import { PrismaClient } from '@nexus-studio/database'
import { PLAN_LIMITS } from './types'

export class UsageTracker {
  constructor(private db: PrismaClient) {}

  async trackUsage(organizationId: string, metric: string, quantity: number) {
    const currentPeriod = this.getCurrentPeriod()

    // Upsert usage record for current period
    const usage = await this.db.usage.upsert({
      where: {
        organizationId_period: {
          organizationId,
          period: currentPeriod
        }
      },
      create: {
        organizationId,
        period: currentPeriod,
        [metric]: quantity
      },
      update: {
        [metric]: {
          increment: quantity
        }
      }
    })

    // Check if usage exceeds limits
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId }
    })

    if (organization) {
      const limits = PLAN_LIMITS[organization.plan]
      const currentValue = usage[metric as keyof typeof usage] as number

      if (limits[metric as keyof typeof limits] !== -1 && 
          currentValue > limits[metric as keyof typeof limits]) {
        // Send usage alert
        await this.sendUsageAlert(organizationId, metric, currentValue, limits[metric as keyof typeof limits] as number)
      }
    }

    return usage
  }

  async getUsage(organizationId: string, startDate?: Date, endDate?: Date) {
    const where: any = { organizationId }

    if (startDate || endDate) {
      where.period = {}
      if (startDate) where.period.gte = startDate
      if (endDate) where.period.lte = endDate
    }

    const usage = await this.db.usage.findMany({
      where,
      orderBy: { period: 'desc' }
    })

    // Calculate totals
    const totals = usage.reduce((acc, record) => {
      return {
        projects: acc.projects + (record.projects || 0),
        teamMembers: acc.teamMembers + (record.teamMembers || 0),
        storage: acc.storage + (record.storage || 0),
        deployments: acc.deployments + (record.deployments || 0),
        apiRequests: acc.apiRequests + (record.apiRequests || 0),
        aiRequests: acc.aiRequests + (record.aiRequests || 0),
        bandwidth: acc.bandwidth + (record.bandwidth || 0)
      }
    }, {
      projects: 0,
      teamMembers: 0,
      storage: 0,
      deployments: 0,
      apiRequests: 0,
      aiRequests: 0,
      bandwidth: 0
    })

    return {
      records: usage,
      totals,
      period: {
        start: startDate || (usage.length > 0 ? usage[usage.length - 1].period : new Date()),
        end: endDate || (usage.length > 0 ? usage[0].period : new Date())
      }
    }
  }

  async resetUsage(organizationId: string, metric?: string) {
    const currentPeriod = this.getCurrentPeriod()

    if (metric) {
      await this.db.usage.update({
        where: {
          organizationId_period: {
            organizationId,
            period: currentPeriod
          }
        },
        data: {
          [metric]: 0
        }
      })
    } else {
      // Reset all metrics
      await this.db.usage.update({
        where: {
          organizationId_period: {
            organizationId,
            period: currentPeriod
          }
        },
        data: {
          projects: 0,
          teamMembers: 0,
          storage: 0,
          deployments: 0,
          apiRequests: 0,
          aiRequests: 0,
          bandwidth: 0
        }
      })
    }
  }

  async getUsagePercentage(organizationId: string) {
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId }
    })

    if (!organization) {
      throw new Error('Organization not found')
    }

    const currentUsage = await this.getUsage(organizationId)
    const limits = PLAN_LIMITS[organization.plan]

    const percentages: Record<string, number> = {}

    for (const [metric, limit] of Object.entries(limits)) {
      if (typeof limit === 'number' && limit > 0) {
        const used = currentUsage.totals[metric as keyof typeof currentUsage.totals] || 0
        percentages[metric] = Math.round((used / limit) * 100)
      }
    }

    return percentages
  }

  private getCurrentPeriod(): Date {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }

  private async sendUsageAlert(organizationId: string, metric: string, current: number, limit: number) {
    // Get organization owners
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
          where: { role: 'OWNER' },
          include: { user: true }
        }
      }
    })

    if (!organization) return

    // Create notification
    for (const member of organization.members) {
      await this.db.notification.create({
        data: {
          userId: member.userId,
          type: 'USAGE_LIMIT',
          title: 'Usage Limit Alert',
          message: `Your organization has exceeded the ${metric} limit (${current}/${limit})`,
          data: {
            organizationId,
            metric,
            current,
            limit,
            percentage: Math.round((current / limit) * 100)
          }
        }
      })
    }

    // TODO: Send email notifications
  }

  // Usage metrics calculation helpers
  async calculateStorageUsage(organizationId: string): Promise<number> {
    // Calculate total storage used by organization's projects
    const projects = await this.db.project.findMany({
      where: { organizationId },
      include: {
        assets: true,
        deployments: true
      }
    })

    let totalStorage = 0

    for (const project of projects) {
      // Add assets storage
      totalStorage += project.assets.reduce((acc, asset) => acc + (asset.size || 0), 0)
      
      // Add deployment storage
      totalStorage += project.deployments.reduce((acc, deployment) => acc + (deployment.size || 0), 0)
    }

    // Convert bytes to GB
    return totalStorage / (1024 * 1024 * 1024)
  }

  async calculateBandwidthUsage(organizationId: string): Promise<number> {
    const currentPeriod = this.getCurrentPeriod()
    
    // Get bandwidth from CDN logs or analytics
    const analytics = await this.db.analyticsEvent.findMany({
      where: {
        organizationId,
        eventType: 'bandwidth',
        createdAt: {
          gte: currentPeriod
        }
      }
    })

    const totalBandwidth = analytics.reduce((acc, event) => {
      return acc + (event.eventData?.bytes || 0)
    }, 0)

    // Convert bytes to GB
    return totalBandwidth / (1024 * 1024 * 1024)
  }
}