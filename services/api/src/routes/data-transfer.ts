import { Hono } from 'hono'
import { z } from 'zod'
import { DataExporter, DataImporter } from '@nexus-studio/database/src/data-export'
import { AuditLogger } from '@nexus-studio/database'
import { requireAuth } from '../middleware/auth'
import { prisma } from '@nexus-studio/database'
import { createReadStream, unlink } from 'fs'
import { promisify } from 'util'

const dataTransfer = new Hono()
const exporter = new DataExporter(prisma)
const importer = new DataImporter(prisma)
const auditLogger = new AuditLogger(prisma)
const unlinkAsync = promisify(unlink)

// Export project
dataTransfer.post('/export/project/:projectId', requireAuth, async (c) => {
  const user = c.get('user')
  const projectId = c.req.param('projectId')
  const body = await c.req.json()

  const schema = z.object({
    format: z.enum(['json', 'csv', 'zip']).default('zip'),
    includeRelations: z.boolean().default(true)
  })

  const options = schema.parse(body)

  // Check user has access to project
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } }
      ]
    }
  })

  if (!project) {
    return c.json({ error: 'Project not found or unauthorized' }, 404)
  }

  try {
    // Create export job
    const exportJob = await prisma.dataExport.create({
      data: {
        organizationId: project.organizationId!,
        userId: user.id,
        type: 'PROJECT',
        status: 'PROCESSING',
        format: options.format.toUpperCase() as any
      }
    })

    // Perform export
    const result = await exporter.exportData(projectId, {
      type: 'project',
      format: options.format,
      includeRelations: options.includeRelations
    })

    // Upload to S3 or store temporarily
    const downloadUrl = await uploadToStorage(result.filePath, `exports/${exportJob.id}`)

    // Update export job
    await prisma.dataExport.update({
      where: { id: exportJob.id },
      data: {
        status: 'COMPLETED',
        fileUrl: downloadUrl,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

    // Log the export
    await auditLogger.logExport('project', projectId, options.format, {
      userId: user.id,
      organizationId: project.organizationId!,
      projectId
    })

    // Clean up temp file
    await unlinkAsync(result.filePath).catch(() => {})

    return c.json({
      exportId: exportJob.id,
      downloadUrl,
      size: result.size,
      expiresAt: exportJob.expiresAt
    })
  } catch (error) {
    return c.json({ 
      error: 'Export failed', 
      details: error instanceof Error ? error.message : undefined 
    }, 500)
  }
})

// Export organization data
dataTransfer.post('/export/organization/:orgId', requireAuth, async (c) => {
  const user = c.get('user')
  const orgId = c.req.param('orgId')
  const body = await c.req.json()

  const schema = z.object({
    format: z.enum(['json', 'csv']).default('json'),
    includeProjects: z.boolean().default(false)
  })

  const options = schema.parse(body)

  // Check user has admin access
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

  try {
    const exportJob = await prisma.dataExport.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        type: 'ORGANIZATION',
        status: 'PROCESSING',
        format: options.format.toUpperCase() as any
      }
    })

    const result = await exporter.exportData(orgId, {
      type: 'organization',
      format: options.format,
      includeRelations: options.includeProjects
    })

    const downloadUrl = await uploadToStorage(result.filePath, `exports/${exportJob.id}`)

    await prisma.dataExport.update({
      where: { id: exportJob.id },
      data: {
        status: 'COMPLETED',
        fileUrl: downloadUrl,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    await auditLogger.logExport('organization', orgId, options.format, {
      userId: user.id,
      organizationId: orgId
    })

    await unlinkAsync(result.filePath).catch(() => {})

    return c.json({
      exportId: exportJob.id,
      downloadUrl,
      size: result.size,
      expiresAt: exportJob.expiresAt
    })
  } catch (error) {
    return c.json({ 
      error: 'Export failed', 
      details: error instanceof Error ? error.message : undefined 
    }, 500)
  }
})

// Export user data (GDPR compliance)
dataTransfer.post('/export/user-data', requireAuth, async (c) => {
  const user = c.get('user')

  try {
    const exportJob = await prisma.dataExport.create({
      data: {
        organizationId: user.organizations?.[0]?.organizationId || '',
        userId: user.id,
        type: 'USER_DATA',
        status: 'PROCESSING',
        format: 'JSON'
      }
    })

    const result = await exporter.exportData(user.id, {
      type: 'user_data',
      format: 'json',
      includeRelations: true
    })

    const downloadUrl = await uploadToStorage(result.filePath, `exports/${exportJob.id}`)

    await prisma.dataExport.update({
      where: { id: exportJob.id },
      data: {
        status: 'COMPLETED',
        fileUrl: downloadUrl,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for GDPR
      }
    })

    await auditLogger.logExport('user', user.id, 'json', {
      userId: user.id
    })

    await unlinkAsync(result.filePath).catch(() => {})

    return c.json({
      exportId: exportJob.id,
      downloadUrl,
      size: result.size,
      expiresAt: exportJob.expiresAt
    })
  } catch (error) {
    return c.json({ 
      error: 'Export failed', 
      details: error instanceof Error ? error.message : undefined 
    }, 500)
  }
})

// Export analytics data
dataTransfer.post('/export/analytics/:projectId', requireAuth, async (c) => {
  const user = c.get('user')
  const projectId = c.req.param('projectId')
  const body = await c.req.json()

  const schema = z.object({
    format: z.enum(['json', 'csv']).default('csv'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  })

  const options = schema.parse(body)

  // Check user has access
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id, role: { in: ['OWNER', 'ADMIN'] } } } }
      ]
    }
  })

  if (!project) {
    return c.json({ error: 'Project not found or unauthorized' }, 404)
  }

  try {
    const result = await exporter.exportData(projectId, {
      type: 'analytics',
      format: options.format,
      filters: {
        startDate: options.startDate ? new Date(options.startDate) : undefined,
        endDate: options.endDate ? new Date(options.endDate) : undefined
      }
    })

    await auditLogger.logExport('analytics', projectId, options.format, {
      userId: user.id,
      projectId
    })

    // For analytics, stream directly without storing
    c.header('Content-Type', options.format === 'csv' ? 'text/csv' : 'application/json')
    c.header('Content-Disposition', `attachment; filename="analytics-${projectId}-${Date.now()}.${options.format}"`)
    
    const stream = createReadStream(result.filePath)
    await unlinkAsync(result.filePath).catch(() => {})
    
    return c.stream(async (stream) => {
      await stream.pipe(stream)
    })
  } catch (error) {
    return c.json({ 
      error: 'Export failed', 
      details: error instanceof Error ? error.message : undefined 
    }, 500)
  }
})

// Import project
dataTransfer.post('/import/project', requireAuth, async (c) => {
  const user = c.get('user')
  const formData = await c.req.formData()
  
  const file = formData.get('file') as File
  const organizationId = formData.get('organizationId') as string

  if (!file) {
    return c.json({ error: 'No file provided' }, 400)
  }

  // Check user has access to organization
  if (organizationId) {
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
  }

  try {
    // Save uploaded file temporarily
    const tempPath = `/tmp/import-${Date.now()}-${file.name}`
    const buffer = await file.arrayBuffer()
    require('fs').writeFileSync(tempPath, Buffer.from(buffer))

    // Perform import
    const result = await importer.importData(tempPath, 'project', organizationId)

    // Log the import
    await auditLogger.logImport('project', 'imported', file.name, {
      userId: user.id,
      organizationId
    })

    // Clean up temp file
    await unlinkAsync(tempPath).catch(() => {})

    return c.json({
      success: result.success,
      imported: result.imported,
      errors: result.errors
    })
  } catch (error) {
    return c.json({ 
      error: 'Import failed', 
      details: error instanceof Error ? error.message : undefined 
    }, 500)
  }
})

// Get export status
dataTransfer.get('/exports/:exportId', requireAuth, async (c) => {
  const user = c.get('user')
  const exportId = c.req.param('exportId')

  const exportJob = await prisma.dataExport.findFirst({
    where: {
      id: exportId,
      userId: user.id
    }
  })

  if (!exportJob) {
    return c.json({ error: 'Export not found' }, 404)
  }

  return c.json({
    id: exportJob.id,
    type: exportJob.type,
    status: exportJob.status,
    format: exportJob.format,
    fileUrl: exportJob.fileUrl,
    createdAt: exportJob.startedAt,
    completedAt: exportJob.completedAt,
    expiresAt: exportJob.expiresAt,
    error: exportJob.error
  })
})

// List user's exports
dataTransfer.get('/exports', requireAuth, async (c) => {
  const user = c.get('user')
  const limit = parseInt(c.req.query('limit') || '10')
  const offset = parseInt(c.req.query('offset') || '0')

  const [exports, total] = await Promise.all([
    prisma.dataExport.findMany({
      where: { 
        userId: user.id,
        expiresAt: { gt: new Date() } // Only show non-expired
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.dataExport.count({
      where: { 
        userId: user.id,
        expiresAt: { gt: new Date() }
      }
    })
  ])

  return c.json({
    exports,
    total,
    limit,
    offset
  })
})

// Helper function to upload to storage (S3, GCS, etc)
async function uploadToStorage(filePath: string, key: string): Promise<string> {
  // In production, upload to S3/GCS
  // For now, return a temporary URL
  const baseUrl = process.env.STORAGE_URL || 'http://localhost:3001/storage'
  return `${baseUrl}/${key}`
}

export { dataTransfer }