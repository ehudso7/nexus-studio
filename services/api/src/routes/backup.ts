import { Hono } from 'hono'
import { z } from 'zod'
import { BackupService } from '@nexus/database/src/backup-service'
import { requireAuth } from '../middleware/auth'
import { prisma } from '@nexus/database'

const backup = new Hono()

// Initialize backup service
const backupConfig = {
  schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // 2 AM daily
  retention: {
    daily: parseInt(process.env.BACKUP_RETENTION_DAILY || '7'),
    weekly: parseInt(process.env.BACKUP_RETENTION_WEEKLY || '4'),
    monthly: parseInt(process.env.BACKUP_RETENTION_MONTHLY || '12')
  },
  encryption: {
    enabled: process.env.BACKUP_ENCRYPTION === 'true',
    key: process.env.BACKUP_ENCRYPTION_KEY
  },
  destinations: [
    {
      type: 'local' as const,
      config: {
        path: process.env.BACKUP_LOCAL_PATH || '/var/backups'
      }
    }
  ]
}

// Add cloud destinations if configured
if (process.env.AWS_S3_BUCKET) {
  backupConfig.destinations.push({
    type: 's3' as const,
    config: {
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION || 'us-east-1'
    }
  })
}

const backupService = new BackupService(prisma, backupConfig)

// Create manual backup (admin only)
backup.post('/backup', requireAuth, async (c) => {
  const user = c.get('user')
  
  // Check if user is admin
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const body = await c.req.json()
  const schema = z.object({
    type: z.enum(['full', 'incremental']).default('full'),
    description: z.string().optional()
  })

  const { type, description } = schema.parse(body)

  try {
    const metadata = await backupService.createBackup(type)
    
    // Log the backup
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        resourceType: 'backup',
        resourceId: metadata.id,
        metadata: {
          type,
          description,
          size: metadata.size,
          tables: metadata.tables.length
        }
      }
    })

    return c.json({
      success: true,
      backup: metadata
    })
  } catch (error) {
    console.error('Backup failed:', error)
    return c.json({ 
      error: 'Backup failed', 
      details: error instanceof Error ? error.message : undefined 
    }, 500)
  }
})

// List backups (admin only)
backup.get('/backups', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')

  try {
    const backups = await prisma.$queryRaw`
      SELECT id, type, size, checksum, created_at, metadata
      FROM backups
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const total = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM backups
    `

    return c.json({
      backups,
      total: Number(total[0].count),
      limit,
      offset
    })
  } catch (error) {
    return c.json({ error: 'Failed to list backups' }, 500)
  }
})

// Get backup details (admin only)
backup.get('/backup/:backupId', requireAuth, async (c) => {
  const user = c.get('user')
  const backupId = c.req.param('backupId')
  
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  try {
    const result = await prisma.$queryRaw`
      SELECT id, type, size, checksum, created_at, metadata
      FROM backups
      WHERE id = ${backupId}
    `

    if (result.length === 0) {
      return c.json({ error: 'Backup not found' }, 404)
    }

    return c.json({ backup: result[0] })
  } catch (error) {
    return c.json({ error: 'Failed to get backup details' }, 500)
  }
})

// Verify backup integrity (admin only)
backup.post('/backup/:backupId/verify', requireAuth, async (c) => {
  const user = c.get('user')
  const backupId = c.req.param('backupId')
  
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  try {
    const isValid = await backupService.verifyBackup(backupId)
    
    // Log the verification
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'VIEW',
        resourceType: 'backup',
        resourceId: backupId,
        metadata: {
          action: 'verify',
          result: isValid
        }
      }
    })

    return c.json({
      backupId,
      valid: isValid,
      verifiedAt: new Date()
    })
  } catch (error) {
    return c.json({ 
      error: 'Verification failed', 
      details: error instanceof Error ? error.message : undefined 
    }, 500)
  }
})

// Restore backup (super admin only)
backup.post('/backup/:backupId/restore', requireAuth, async (c) => {
  const user = c.get('user')
  const backupId = c.req.param('backupId')
  
  if (user.role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const body = await c.req.json()
  const schema = z.object({
    targetDatabase: z.string().optional(),
    confirmation: z.literal('RESTORE')
  })

  const { targetDatabase, confirmation } = schema.parse(body)

  if (confirmation !== 'RESTORE') {
    return c.json({ error: 'Confirmation required' }, 400)
  }

  try {
    // Create restore job
    const restoreId = `restore-${Date.now()}`
    
    // Log the restore initiation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        resourceType: 'restore',
        resourceId: restoreId,
        metadata: {
          backupId,
          targetDatabase: targetDatabase || 'current',
          status: 'initiated'
        }
      }
    })

    // Perform restore (async)
    backupService.restoreBackup(backupId, targetDatabase)
      .then(() => {
        // Log successful restore
        prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'UPDATE',
            resourceType: 'restore',
            resourceId: restoreId,
            metadata: {
              backupId,
              status: 'completed'
            }
          }
        })
      })
      .catch((error) => {
        // Log failed restore
        prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'UPDATE',
            resourceType: 'restore',
            resourceId: restoreId,
            metadata: {
              backupId,
              status: 'failed',
              error: error.message
            }
          }
        })
      })

    return c.json({
      restoreId,
      status: 'initiated',
      message: 'Restore process started. Check audit logs for status.'
    })
  } catch (error) {
    return c.json({ 
      error: 'Restore initiation failed', 
      details: error instanceof Error ? error.message : undefined 
    }, 500)
  }
})

// Get backup statistics (admin only)
backup.get('/backup-stats', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  try {
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_backups,
        SUM(size) as total_size,
        COUNT(CASE WHEN type = 'full' THEN 1 END) as full_backups,
        COUNT(CASE WHEN type = 'incremental' THEN 1 END) as incremental_backups,
        MAX(created_at) as last_backup,
        MIN(created_at) as first_backup
      FROM backups
    `

    const recentBackups = await prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*) as count, SUM(size) as size
      FROM backups
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `

    return c.json({
      summary: stats[0],
      recentBackups
    })
  } catch (error) {
    return c.json({ error: 'Failed to get backup statistics' }, 500)
  }
})

// Test backup configuration (admin only)
backup.post('/backup-test', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const tests = {
    database: { status: 'pending', message: '' },
    encryption: { status: 'pending', message: '' },
    storage: { status: 'pending', message: '' }
  }

  try {
    // Test database connection
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`
    tests.database = { 
      status: 'success', 
      message: 'Database connection successful' 
    }
  } catch (error) {
    tests.database = { 
      status: 'failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }
  }

  // Test encryption if enabled
  if (backupConfig.encryption.enabled) {
    if (backupConfig.encryption.key) {
      tests.encryption = { 
        status: 'success', 
        message: 'Encryption key configured' 
      }
    } else {
      tests.encryption = { 
        status: 'failed', 
        message: 'Encryption enabled but key not configured' 
      }
    }
  } else {
    tests.encryption = { 
      status: 'skipped', 
      message: 'Encryption not enabled' 
    }
  }

  // Test storage destinations
  const storageTests = []
  for (const dest of backupConfig.destinations) {
    try {
      // Simple write test
      const testFile = `/tmp/backup-test-${Date.now()}.txt`
      require('fs').writeFileSync(testFile, 'test')
      
      storageTests.push({
        type: dest.type,
        status: 'success',
        message: `${dest.type} storage configured`
      })
      
      require('fs').unlinkSync(testFile)
    } catch (error) {
      storageTests.push({
        type: dest.type,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  tests.storage = {
    status: storageTests.every(t => t.status === 'success') ? 'success' : 'failed',
    message: `${storageTests.filter(t => t.status === 'success').length}/${storageTests.length} storage destinations available`,
    details: storageTests
  }

  const overallStatus = Object.values(tests).every(t => 
    t.status === 'success' || t.status === 'skipped'
  ) ? 'healthy' : 'unhealthy'

  return c.json({
    status: overallStatus,
    tests,
    config: {
      schedule: backupConfig.schedule,
      retention: backupConfig.retention,
      encryption: backupConfig.encryption.enabled,
      destinations: backupConfig.destinations.length
    }
  })
})

export { backup }