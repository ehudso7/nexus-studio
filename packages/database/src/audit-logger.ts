import { PrismaClient, AuditAction } from '@prisma/client'

export interface AuditContext {
  userId?: string
  organizationId?: string
  projectId?: string
  ipAddress?: string
  userAgent?: string
}

export interface AuditEvent {
  action: AuditAction
  resourceType: string
  resourceId: string
  metadata?: Record<string, any>
  context?: AuditContext
}

export class AuditLogger {
  constructor(private db: PrismaClient) {}

  async log(event: AuditEvent): Promise<void> {
    const { action, resourceType, resourceId, metadata, context } = event

    await this.db.auditLog.create({
      data: {
        userId: context?.userId,
        organizationId: context?.organizationId,
        projectId: context?.projectId,
        action,
        resourceType,
        resourceId,
        metadata: metadata || {},
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        timestamp: new Date()
      }
    })
  }

  async logBatch(events: AuditEvent[]): Promise<void> {
    const data = events.map(event => ({
      userId: event.context?.userId,
      organizationId: event.context?.organizationId,
      projectId: event.context?.projectId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      metadata: event.metadata || {},
      ipAddress: event.context?.ipAddress,
      userAgent: event.context?.userAgent,
      timestamp: new Date()
    }))

    await this.db.auditLog.createMany({ data })
  }

  // Convenience methods for common actions
  async logCreate(
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, any>,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      action: 'CREATE',
      resourceType,
      resourceId,
      metadata,
      context
    })
  }

  async logUpdate(
    resourceType: string,
    resourceId: string,
    changes?: Record<string, { old: any; new: any }>,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      action: 'UPDATE',
      resourceType,
      resourceId,
      metadata: { changes },
      context
    })
  }

  async logDelete(
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, any>,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      action: 'DELETE',
      resourceType,
      resourceId,
      metadata,
      context
    })
  }

  async logView(
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, any>,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      action: 'VIEW',
      resourceType,
      resourceId,
      metadata,
      context
    })
  }

  async logExport(
    resourceType: string,
    resourceId: string,
    format: string,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      action: 'EXPORT',
      resourceType,
      resourceId,
      metadata: { format },
      context
    })
  }

  async logImport(
    resourceType: string,
    resourceId: string,
    source: string,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      action: 'IMPORT',
      resourceType,
      resourceId,
      metadata: { source },
      context
    })
  }

  async logLogin(
    userId: string,
    method: string,
    context?: Omit<AuditContext, 'userId'>
  ): Promise<void> {
    await this.log({
      action: 'LOGIN',
      resourceType: 'user',
      resourceId: userId,
      metadata: { method },
      context: { ...context, userId }
    })
  }

  async logLogout(
    userId: string,
    context?: Omit<AuditContext, 'userId'>
  ): Promise<void> {
    await this.log({
      action: 'LOGOUT',
      resourceType: 'user',
      resourceId: userId,
      context: { ...context, userId }
    })
  }

  async logDeploy(
    projectId: string,
    deploymentId: string,
    environment: string,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      action: 'DEPLOY',
      resourceType: 'deployment',
      resourceId: deploymentId,
      metadata: { projectId, environment },
      context
    })
  }

  async logShare(
    resourceType: string,
    resourceId: string,
    sharedWith: string[],
    permissions: string[],
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      action: 'SHARE',
      resourceType,
      resourceId,
      metadata: { sharedWith, permissions },
      context
    })
  }

  // Query methods
  async getAuditLogs(filters: {
    userId?: string
    organizationId?: string
    projectId?: string
    resourceType?: string
    resourceId?: string
    action?: AuditAction
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }) {
    const where: any = {}

    if (filters.userId) where.userId = filters.userId
    if (filters.organizationId) where.organizationId = filters.organizationId
    if (filters.projectId) where.projectId = filters.projectId
    if (filters.resourceType) where.resourceType = filters.resourceType
    if (filters.resourceId) where.resourceId = filters.resourceId
    if (filters.action) where.action = filters.action

    if (filters.startDate || filters.endDate) {
      where.timestamp = {}
      if (filters.startDate) where.timestamp.gte = filters.startDate
      if (filters.endDate) where.timestamp.lte = filters.endDate
    }

    const [logs, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      }),
      this.db.auditLog.count({ where })
    ])

    return { logs, total }
  }

  async getResourceHistory(resourceType: string, resourceId: string) {
    return this.db.auditLog.findMany({
      where: {
        resourceType,
        resourceId
      },
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })
  }

  async getUserActivity(userId: string, limit = 50) {
    return this.db.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })
  }

  async getOrganizationActivity(organizationId: string, limit = 100) {
    return this.db.auditLog.findMany({
      where: { organizationId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })
  }

  // Analytics methods
  async getActivityStats(organizationId: string, days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const logs = await this.db.auditLog.findMany({
      where: {
        organizationId,
        timestamp: { gte: startDate }
      },
      select: {
        action: true,
        resourceType: true,
        timestamp: true,
        userId: true
      }
    })

    // Group by action
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Group by resource type
    const resourceCounts = logs.reduce((acc, log) => {
      acc[log.resourceType] = (acc[log.resourceType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Group by day
    const dailyActivity = logs.reduce((acc, log) => {
      const date = log.timestamp.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Get unique active users
    const activeUsers = new Set(logs.map(log => log.userId).filter(Boolean))

    return {
      totalEvents: logs.length,
      actionCounts,
      resourceCounts,
      dailyActivity,
      activeUsers: activeUsers.size
    }
  }

  // Compliance and retention
  async deleteOldLogs(retentionDays: number): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const result = await this.db.auditLog.deleteMany({
      where: {
        timestamp: { lt: cutoffDate }
      }
    })

    return result.count
  }

  async exportAuditLogs(filters: {
    organizationId: string
    startDate: Date
    endDate: Date
  }) {
    const logs = await this.db.auditLog.findMany({
      where: {
        organizationId: filters.organizationId,
        timestamp: {
          gte: filters.startDate,
          lte: filters.endDate
        }
      },
      orderBy: { timestamp: 'asc' },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    })

    return logs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      user: log.user?.email || 'system',
      userName: log.user?.name || 'System',
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      ipAddress: log.ipAddress || '',
      userAgent: log.userAgent || '',
      metadata: JSON.stringify(log.metadata)
    }))
  }
}