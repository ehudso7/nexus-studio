import { Context, Next } from 'hono'
import { AuditLogger } from '@nexus/database/src/audit-logger'
import { prisma } from '@nexus/database'

const auditLogger = new AuditLogger(prisma)

// Map HTTP methods and paths to audit actions
const AUDIT_MAPPINGS: Record<string, { action: any; resourceType: string }> = {
  'POST /projects': { action: 'CREATE', resourceType: 'project' },
  'PUT /projects/:id': { action: 'UPDATE', resourceType: 'project' },
  'PATCH /projects/:id': { action: 'UPDATE', resourceType: 'project' },
  'DELETE /projects/:id': { action: 'DELETE', resourceType: 'project' },
  
  'POST /deployments': { action: 'DEPLOY', resourceType: 'deployment' },
  'POST /projects/:id/publish': { action: 'PUBLISH', resourceType: 'project' },
  'POST /projects/:id/share': { action: 'SHARE', resourceType: 'project' },
  
  'POST /auth/login': { action: 'LOGIN', resourceType: 'user' },
  'POST /auth/logout': { action: 'LOGOUT', resourceType: 'user' },
  
  'POST /billing/subscription': { action: 'SUBSCRIPTION_CREATED', resourceType: 'subscription' },
  'DELETE /billing/subscription/:id': { action: 'SUBSCRIPTION_CANCELLED', resourceType: 'subscription' },
  
  'GET /projects/:id/export': { action: 'EXPORT', resourceType: 'project' },
  'POST /projects/import': { action: 'IMPORT', resourceType: 'project' },
}

export async function auditMiddleware(c: Context, next: Next) {
  const startTime = Date.now()
  const method = c.req.method
  const path = c.req.path
  const user = c.get('user')

  // Store original response
  await next()

  // Only audit successful requests
  if (c.res.status >= 200 && c.res.status < 300) {
    try {
      // Find matching audit mapping
      const mappingKey = `${method} ${path.replace(/\/[^\/]+$/, '/:id')}`
      const mapping = AUDIT_MAPPINGS[mappingKey]

      if (mapping) {
        const resourceId = extractResourceId(path, c.req.param())
        
        await auditLogger.log({
          action: mapping.action,
          resourceType: mapping.resourceType,
          resourceId: resourceId || 'unknown',
          metadata: {
            method,
            path,
            duration: Date.now() - startTime,
            statusCode: c.res.status
          },
          context: {
            userId: user?.id,
            organizationId: c.get('organizationId'),
            projectId: c.get('projectId'),
            ipAddress: getClientIp(c),
            userAgent: c.req.header('User-Agent')
          }
        })
      }
    } catch (error) {
      console.error('Audit logging failed:', error)
      // Don't fail the request if audit logging fails
    }
  }
}

// Specialized audit middleware for sensitive operations
export async function auditSensitiveOperation(
  operation: string,
  resourceType: string,
  resourceId: string
) {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    const startTime = Date.now()

    await next()

    if (c.res.status >= 200 && c.res.status < 300) {
      await auditLogger.log({
        action: 'VIEW', // Or another appropriate action
        resourceType,
        resourceId,
        metadata: {
          operation,
          duration: Date.now() - startTime
        },
        context: {
          userId: user?.id,
          organizationId: c.get('organizationId'),
          ipAddress: getClientIp(c),
          userAgent: c.req.header('User-Agent')
        }
      })
    }
  }
}

// Helper to extract resource ID from path
function extractResourceId(path: string, params: Record<string, string>): string | null {
  // Try to get ID from params
  if (params.id) return params.id
  if (params.projectId) return params.projectId
  if (params.organizationId) return params.organizationId

  // Try to extract from path
  const segments = path.split('/')
  const idPattern = /^[a-zA-Z0-9-_]+$/

  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i] && idPattern.test(segments[i])) {
      return segments[i]
    }
  }

  return null
}

// Helper to get client IP
function getClientIp(c: Context): string {
  return c.req.header('X-Forwarded-For')?.split(',')[0].trim() ||
         c.req.header('X-Real-IP') ||
         c.req.header('CF-Connecting-IP') ||
         'unknown'
}

// Audit log API endpoints
export function createAuditRoutes() {
  const { Hono } = require('hono')
  const audit = new Hono()

  // Get audit logs
  audit.get('/organizations/:orgId/audit-logs', async (c) => {
    const user = c.get('user')
    const orgId = c.req.param('orgId')
    
    // Check permissions
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
        role: { in: ['OWNER', 'ADMIN'] }
      }
    })

    if (!member) {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    const query = c.req.query()
    const filters = {
      organizationId: orgId,
      userId: query.userId,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      action: query.action as any,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0
    }

    const result = await auditLogger.getAuditLogs(filters)
    
    return c.json(result)
  })

  // Get resource history
  audit.get('/resources/:type/:id/history', async (c) => {
    const user = c.get('user')
    const resourceType = c.req.param('type')
    const resourceId = c.req.param('id')

    // TODO: Check if user has access to this resource
    
    const history = await auditLogger.getResourceHistory(resourceType, resourceId)
    
    return c.json({ history })
  })

  // Get user activity
  audit.get('/users/:userId/activity', async (c) => {
    const user = c.get('user')
    const userId = c.req.param('userId')
    
    // Users can view their own activity, admins can view any
    if (user.id !== userId && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50
    const activity = await auditLogger.getUserActivity(userId, limit)
    
    return c.json({ activity })
  })

  // Get organization activity stats
  audit.get('/organizations/:orgId/activity-stats', async (c) => {
    const user = c.get('user')
    const orgId = c.req.param('orgId')
    
    // Check permissions
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
        role: { in: ['OWNER', 'ADMIN'] }
      }
    })

    if (!member) {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    const days = c.req.query('days') ? parseInt(c.req.query('days')!) : 30
    const stats = await auditLogger.getActivityStats(orgId, days)
    
    return c.json(stats)
  })

  // Export audit logs
  audit.get('/organizations/:orgId/audit-logs/export', async (c) => {
    const user = c.get('user')
    const orgId = c.req.param('orgId')
    
    // Check permissions - only owners can export
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
        role: 'OWNER'
      }
    })

    if (!member) {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    const query = c.req.query()
    const logs = await auditLogger.exportAuditLogs({
      organizationId: orgId,
      startDate: new Date(query.startDate!),
      endDate: new Date(query.endDate!)
    })

    // Log the export action
    await auditLogger.logExport('audit_logs', orgId, 'csv', {
      userId: user.id,
      organizationId: orgId,
      ipAddress: getClientIp(c),
      userAgent: c.req.header('User-Agent')
    })

    // Convert to CSV
    const csv = convertToCSV(logs)
    
    c.header('Content-Type', 'text/csv')
    c.header('Content-Disposition', `attachment; filename="audit-logs-${orgId}-${Date.now()}.csv"`)
    
    return c.body(csv)
  })

  return audit
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header]
      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }).join(',')
  )
  
  return [headers.join(','), ...rows].join('\n')
}