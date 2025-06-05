import { PrismaClient } from '@prisma/client'
import { createWriteStream, createReadStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Transform } from 'stream'
import archiver from 'archiver'
import { parse } from 'csv-parse'
import { stringify } from 'csv-stringify'

export type ExportFormat = 'json' | 'csv' | 'zip'
export type ExportType = 'project' | 'organization' | 'user_data' | 'analytics' | 'audit_logs'

export interface ExportOptions {
  type: ExportType
  format: ExportFormat
  filters?: Record<string, any>
  includeRelations?: boolean
}

export class DataExporter {
  constructor(private db: PrismaClient) {}

  async exportData(
    resourceId: string,
    options: ExportOptions
  ): Promise<{ filePath: string; size: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `export-${options.type}-${resourceId}-${timestamp}`
    const filePath = `/tmp/${fileName}.${options.format}`

    switch (options.type) {
      case 'project':
        return this.exportProject(resourceId, filePath, options)
      case 'organization':
        return this.exportOrganization(resourceId, filePath, options)
      case 'user_data':
        return this.exportUserData(resourceId, filePath, options)
      case 'analytics':
        return this.exportAnalytics(resourceId, filePath, options)
      case 'audit_logs':
        return this.exportAuditLogs(resourceId, filePath, options)
      default:
        throw new Error(`Unsupported export type: ${options.type}`)
    }
  }

  private async exportProject(
    projectId: string,
    filePath: string,
    options: ExportOptions
  ): Promise<{ filePath: string; size: number }> {
    const project = await this.db.project.findUnique({
      where: { id: projectId },
      include: options.includeRelations ? {
        pages: {
          include: {
            seo: true
          }
        },
        components: true,
        assets: true,
        apis: true,
        databases: {
          include: {
            tables: true
          }
        },
        workflows: true,
        versions: true
      } : undefined
    })

    if (!project) {
      throw new Error('Project not found')
    }

    if (options.format === 'zip') {
      return this.createZipArchive(filePath, {
        'project.json': JSON.stringify(project, null, 2),
        'pages/': await this.exportPages(projectId),
        'components/': await this.exportComponents(projectId),
        'assets/': await this.exportAssets(projectId),
        'metadata.json': JSON.stringify({
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
          type: 'project'
        }, null, 2)
      })
    } else {
      return this.writeToFile(filePath, project, options.format)
    }
  }

  private async exportOrganization(
    organizationId: string,
    filePath: string,
    options: ExportOptions
  ): Promise<{ filePath: string; size: number }> {
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId },
      include: options.includeRelations ? {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        },
        projects: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true
          }
        },
        subscription: true,
        usage: {
          orderBy: { period: 'desc' },
          take: 12 // Last 12 months
        }
      } : undefined
    })

    if (!organization) {
      throw new Error('Organization not found')
    }

    return this.writeToFile(filePath, organization, options.format)
  }

  private async exportUserData(
    userId: string,
    filePath: string,
    options: ExportOptions
  ): Promise<{ filePath: string; size: number }> {
    const userData = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true
          }
        },
        organizations: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },
        sessions: {
          select: {
            createdAt: true,
            expiresAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 100
        }
      }
    })

    if (!userData) {
      throw new Error('User not found')
    }

    // Remove sensitive data
    const sanitizedData = {
      ...userData,
      password: undefined,
      twoFactorSecret: undefined,
      sessions: userData.sessions.map(s => ({
        createdAt: s.createdAt,
        expiresAt: s.expiresAt
      }))
    }

    return this.writeToFile(filePath, sanitizedData, options.format)
  }

  private async exportAnalytics(
    resourceId: string,
    filePath: string,
    options: ExportOptions
  ): Promise<{ filePath: string; size: number }> {
    const where: any = {}
    
    if (options.filters?.startDate || options.filters?.endDate) {
      where.timestamp = {}
      if (options.filters.startDate) where.timestamp.gte = options.filters.startDate
      if (options.filters.endDate) where.timestamp.lte = options.filters.endDate
    }

    if (options.filters?.projectId) {
      where.projectId = options.filters.projectId
    } else {
      where.projectId = resourceId
    }

    const analytics = await this.db.analytics.findMany({
      where,
      orderBy: { timestamp: 'asc' }
    })

    return this.writeToFile(filePath, analytics, options.format)
  }

  private async exportAuditLogs(
    organizationId: string,
    filePath: string,
    options: ExportOptions
  ): Promise<{ filePath: string; size: number }> {
    const where: any = { organizationId }
    
    if (options.filters?.startDate || options.filters?.endDate) {
      where.timestamp = {}
      if (options.filters.startDate) where.timestamp.gte = options.filters.startDate
      if (options.filters.endDate) where.timestamp.lte = options.filters.endDate
    }

    const logs = await this.db.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      orderBy: { timestamp: 'asc' }
    })

    const formattedLogs = logs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      user: log.user?.email || 'system',
      userName: log.user?.name || 'System',
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      ipAddress: log.ipAddress || '',
      metadata: log.metadata
    }))

    return this.writeToFile(filePath, formattedLogs, options.format)
  }

  private async exportPages(projectId: string) {
    const pages = await this.db.page.findMany({
      where: { projectId },
      include: { seo: true }
    })

    const files: Record<string, string> = {}
    for (const page of pages) {
      files[`${page.path}.json`] = JSON.stringify(page, null, 2)
    }
    return files
  }

  private async exportComponents(projectId: string) {
    const components = await this.db.component.findMany({
      where: { projectId }
    })

    const files: Record<string, string> = {}
    for (const component of components) {
      files[`${component.name}.json`] = JSON.stringify(component, null, 2)
    }
    return files
  }

  private async exportAssets(projectId: string) {
    const assets = await this.db.asset.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        type: true,
        url: true,
        mimeType: true,
        metadata: true
      }
    })

    return {
      'assets.json': JSON.stringify(assets, null, 2)
    }
  }

  private async writeToFile(
    filePath: string,
    data: any,
    format: ExportFormat
  ): Promise<{ filePath: string; size: number }> {
    const writeStream = createWriteStream(filePath)

    if (format === 'json') {
      writeStream.write(JSON.stringify(data, null, 2))
    } else if (format === 'csv') {
      const csvData = await this.convertToCSV(data)
      writeStream.write(csvData)
    } else {
      throw new Error(`Unsupported format: ${format}`)
    }

    writeStream.end()

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        const stats = require('fs').statSync(filePath)
        resolve({ filePath, size: stats.size })
      })
      writeStream.on('error', reject)
    })
  }

  private async convertToCSV(data: any): Promise<string> {
    if (!Array.isArray(data)) {
      data = [data]
    }

    if (data.length === 0) return ''

    // Flatten nested objects
    const flatData = data.map(item => this.flattenObject(item))
    
    const stringifier = stringify({
      header: true,
      columns: Object.keys(flatData[0])
    })

    let csv = ''
    stringifier.on('readable', function() {
      let row
      while ((row = stringifier.read()) !== null) {
        csv += row
      }
    })

    for (const row of flatData) {
      stringifier.write(row)
    }
    stringifier.end()

    return new Promise((resolve) => {
      stringifier.on('finish', () => resolve(csv))
    })
  }

  private flattenObject(obj: any, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {}

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key

      if (value === null || value === undefined) {
        flattened[newKey] = ''
      } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, this.flattenObject(value, newKey))
      } else if (Array.isArray(value)) {
        flattened[newKey] = value.join(', ')
      } else if (value instanceof Date) {
        flattened[newKey] = value.toISOString()
      } else {
        flattened[newKey] = value
      }
    }

    return flattened
  }

  private async createZipArchive(
    filePath: string,
    files: Record<string, string | Record<string, string>>
  ): Promise<{ filePath: string; size: number }> {
    const output = createWriteStream(filePath)
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })

    archive.pipe(output)

    for (const [path, content] of Object.entries(files)) {
      if (typeof content === 'string') {
        archive.append(content, { name: path })
      } else {
        // It's a directory
        for (const [fileName, fileContent] of Object.entries(content)) {
          archive.append(fileContent, { name: `${path}${fileName}` })
        }
      }
    }

    await archive.finalize()

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        resolve({ filePath, size: archive.pointer() })
      })
      archive.on('error', reject)
    })
  }
}

export class DataImporter {
  constructor(private db: PrismaClient) {}

  async importData(
    filePath: string,
    type: ExportType,
    organizationId?: string
  ): Promise<{ success: boolean; imported: number; errors: string[] }> {
    const format = this.detectFormat(filePath)
    
    switch (type) {
      case 'project':
        return this.importProject(filePath, format, organizationId)
      case 'organization':
        throw new Error('Organization import not supported')
      case 'user_data':
        throw new Error('User data import not supported')
      case 'analytics':
        return this.importAnalytics(filePath, format)
      case 'audit_logs':
        throw new Error('Audit log import not supported')
      default:
        throw new Error(`Unsupported import type: ${type}`)
    }
  }

  private detectFormat(filePath: string): ExportFormat {
    if (filePath.endsWith('.json')) return 'json'
    if (filePath.endsWith('.csv')) return 'csv'
    if (filePath.endsWith('.zip')) return 'zip'
    throw new Error('Unsupported file format')
  }

  private async importProject(
    filePath: string,
    format: ExportFormat,
    organizationId?: string
  ): Promise<{ success: boolean; imported: number; errors: string[] }> {
    const errors: string[] = []
    let imported = 0

    try {
      if (format === 'zip') {
        // Extract zip and process files
        const unzipper = require('unzipper')
        const directory = await unzipper.Open.file(filePath)
        
        // Read project.json
        const projectFile = directory.files.find((f: any) => f.path === 'project.json')
        if (!projectFile) {
          throw new Error('project.json not found in archive')
        }

        const projectData = JSON.parse(await projectFile.buffer())
        
        // Create new project
        const newProject = await this.db.project.create({
          data: {
            name: `${projectData.name} (Imported)`,
            slug: `${projectData.slug}-${Date.now()}`,
            description: projectData.description,
            type: projectData.type,
            ownerId: projectData.ownerId,
            organizationId: organizationId || projectData.organizationId,
            settings: projectData.settings,
            metadata: {
              ...projectData.metadata,
              importedAt: new Date().toISOString(),
              originalId: projectData.id
            }
          }
        })

        imported++

        // Import pages
        const pagesDir = directory.files.filter((f: any) => f.path.startsWith('pages/'))
        for (const pageFile of pagesDir) {
          try {
            const pageData = JSON.parse(await pageFile.buffer())
            await this.db.page.create({
              data: {
                ...pageData,
                id: undefined,
                projectId: newProject.id
              }
            })
            imported++
          } catch (err) {
            errors.push(`Failed to import page ${pageFile.path}: ${err}`)
          }
        }

        // Import components
        const componentsDir = directory.files.filter((f: any) => f.path.startsWith('components/'))
        for (const componentFile of componentsDir) {
          try {
            const componentData = JSON.parse(await componentFile.buffer())
            await this.db.component.create({
              data: {
                ...componentData,
                id: undefined,
                projectId: newProject.id
              }
            })
            imported++
          } catch (err) {
            errors.push(`Failed to import component ${componentFile.path}: ${err}`)
          }
        }

      } else if (format === 'json') {
        const data = JSON.parse(require('fs').readFileSync(filePath, 'utf-8'))
        
        const newProject = await this.db.project.create({
          data: {
            name: `${data.name} (Imported)`,
            slug: `${data.slug}-${Date.now()}`,
            description: data.description,
            type: data.type,
            ownerId: data.ownerId,
            organizationId: organizationId || data.organizationId,
            settings: data.settings,
            metadata: {
              ...data.metadata,
              importedAt: new Date().toISOString(),
              originalId: data.id
            }
          }
        })

        imported = 1
      }

      return { success: true, imported, errors }
    } catch (error) {
      return {
        success: false,
        imported,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  private async importAnalytics(
    filePath: string,
    format: ExportFormat
  ): Promise<{ success: boolean; imported: number; errors: string[] }> {
    const errors: string[] = []
    let imported = 0

    try {
      let data: any[]

      if (format === 'json') {
        data = JSON.parse(require('fs').readFileSync(filePath, 'utf-8'))
      } else if (format === 'csv') {
        data = await this.parseCSV(filePath)
      } else {
        throw new Error('Unsupported format for analytics import')
      }

      // Batch insert analytics data
      const batchSize = 1000
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)
        
        try {
          await this.db.analytics.createMany({
            data: batch.map(item => ({
              ...item,
              timestamp: new Date(item.timestamp),
              data: typeof item.data === 'string' ? JSON.parse(item.data) : item.data
            }))
          })
          imported += batch.length
        } catch (err) {
          errors.push(`Failed to import batch ${i / batchSize + 1}: ${err}`)
        }
      }

      return { success: true, imported, errors }
    } catch (error) {
      return {
        success: false,
        imported,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  private async parseCSV(filePath: string): Promise<any[]> {
    const records: any[] = []
    const parser = createReadStream(filePath).pipe(
      parse({
        columns: true,
        skip_empty_lines: true
      })
    )

    for await (const record of parser) {
      records.push(record)
    }

    return records
  }
}