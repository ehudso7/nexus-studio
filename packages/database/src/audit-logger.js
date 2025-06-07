export class AuditLogger {
    db;
    constructor(db) {
        this.db = db;
    }
    async log(event) {
        const { action, resourceType, resourceId, metadata, context } = event;
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
        });
    }
    async logBatch(events) {
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
        }));
        await this.db.auditLog.createMany({ data });
    }
    // Convenience methods for common actions
    async logCreate(resourceType, resourceId, metadata, context) {
        await this.log({
            action: 'CREATE',
            resourceType,
            resourceId,
            metadata,
            context
        });
    }
    async logUpdate(resourceType, resourceId, changes, context) {
        await this.log({
            action: 'UPDATE',
            resourceType,
            resourceId,
            metadata: { changes },
            context
        });
    }
    async logDelete(resourceType, resourceId, metadata, context) {
        await this.log({
            action: 'DELETE',
            resourceType,
            resourceId,
            metadata,
            context
        });
    }
    async logView(resourceType, resourceId, metadata, context) {
        await this.log({
            action: 'VIEW',
            resourceType,
            resourceId,
            metadata,
            context
        });
    }
    async logExport(resourceType, resourceId, format, context) {
        await this.log({
            action: 'EXPORT',
            resourceType,
            resourceId,
            metadata: { format },
            context
        });
    }
    async logImport(resourceType, resourceId, source, context) {
        await this.log({
            action: 'IMPORT',
            resourceType,
            resourceId,
            metadata: { source },
            context
        });
    }
    async logLogin(userId, method, context) {
        await this.log({
            action: 'LOGIN',
            resourceType: 'user',
            resourceId: userId,
            metadata: { method },
            context: { ...context, userId }
        });
    }
    async logLogout(userId, context) {
        await this.log({
            action: 'LOGOUT',
            resourceType: 'user',
            resourceId: userId,
            context: { ...context, userId }
        });
    }
    async logDeploy(projectId, deploymentId, environment, context) {
        await this.log({
            action: 'DEPLOY',
            resourceType: 'deployment',
            resourceId: deploymentId,
            metadata: { projectId, environment },
            context
        });
    }
    async logShare(resourceType, resourceId, sharedWith, permissions, context) {
        await this.log({
            action: 'SHARE',
            resourceType,
            resourceId,
            metadata: { sharedWith, permissions },
            context
        });
    }
    // Query methods
    async getAuditLogs(filters) {
        const where = {};
        if (filters.userId)
            where.userId = filters.userId;
        if (filters.organizationId)
            where.organizationId = filters.organizationId;
        if (filters.projectId)
            where.projectId = filters.projectId;
        if (filters.resourceType)
            where.resourceType = filters.resourceType;
        if (filters.resourceId)
            where.resourceId = filters.resourceId;
        if (filters.action)
            where.action = filters.action;
        if (filters.startDate || filters.endDate) {
            where.timestamp = {};
            if (filters.startDate)
                where.timestamp.gte = filters.startDate;
            if (filters.endDate)
                where.timestamp.lte = filters.endDate;
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
        ]);
        return { logs, total };
    }
    async getResourceHistory(resourceType, resourceId) {
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
        });
    }
    async getUserActivity(userId, limit = 50) {
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
        });
    }
    async getOrganizationActivity(organizationId, limit = 100) {
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
        });
    }
    // Analytics methods
    async getActivityStats(organizationId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
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
        });
        // Group by action
        const actionCounts = logs.reduce((acc, log) => {
            acc[log.action] = (acc[log.action] || 0) + 1;
            return acc;
        }, {});
        // Group by resource type
        const resourceCounts = logs.reduce((acc, log) => {
            acc[log.resourceType] = (acc[log.resourceType] || 0) + 1;
            return acc;
        }, {});
        // Group by day
        const dailyActivity = logs.reduce((acc, log) => {
            const date = log.timestamp.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});
        // Get unique active users
        const activeUsers = new Set(logs.map(log => log.userId).filter(Boolean));
        return {
            totalEvents: logs.length,
            actionCounts,
            resourceCounts,
            dailyActivity,
            activeUsers: activeUsers.size
        };
    }
    // Compliance and retention
    async deleteOldLogs(retentionDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const result = await this.db.auditLog.deleteMany({
            where: {
                timestamp: { lt: cutoffDate }
            }
        });
        return result.count;
    }
    async exportAuditLogs(filters) {
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
        });
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
        }));
    }
}
