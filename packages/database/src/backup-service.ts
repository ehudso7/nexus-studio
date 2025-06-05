import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import { createWriteStream, createReadStream } from 'fs'
import { pipeline } from 'stream/promises'
import archiver from 'archiver'
import crypto from 'crypto'

const execAsync = promisify(exec)

export interface BackupConfig {
  schedule: string // Cron expression
  retention: {
    daily: number
    weekly: number
    monthly: number
  }
  encryption: {
    enabled: boolean
    key?: string
  }
  destinations: BackupDestination[]
}

export interface BackupDestination {
  type: 'local' | 's3' | 'gcs' | 'azure'
  config: Record<string, any>
}

export interface BackupMetadata {
  id: string
  timestamp: Date
  type: 'full' | 'incremental'
  size: number
  checksum: string
  encrypted: boolean
  tables: string[]
  recordCount: Record<string, number>
}

export class BackupService {
  constructor(
    private db: PrismaClient,
    private config: BackupConfig
  ) {}

  async createBackup(type: 'full' | 'incremental' = 'full'): Promise<BackupMetadata> {
    const backupId = `backup-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    const timestamp = new Date()
    
    console.log(`Starting ${type} backup ${backupId}`)

    try {
      // Create backup directory
      const backupDir = `/tmp/${backupId}`
      await execAsync(`mkdir -p ${backupDir}`)

      // Get database connection info
      const dbUrl = process.env.DATABASE_URL!
      const dbConfig = this.parseDbUrl(dbUrl)

      // Dump database
      const dumpFile = `${backupDir}/database.sql`
      await this.dumpDatabase(dbConfig, dumpFile)

      // Get table statistics
      const tableStats = await this.getTableStatistics()

      // Create metadata file
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        type,
        size: 0,
        checksum: '',
        encrypted: this.config.encryption.enabled,
        tables: Object.keys(tableStats),
        recordCount: tableStats
      }

      // Write metadata
      await this.writeFile(
        `${backupDir}/metadata.json`,
        JSON.stringify(metadata, null, 2)
      )

      // Export file assets if needed
      await this.exportFileAssets(backupDir)

      // Create archive
      const archivePath = `${backupDir}.tar.gz`
      await this.createArchive(backupDir, archivePath)

      // Encrypt if enabled
      if (this.config.encryption.enabled) {
        await this.encryptFile(archivePath, `${archivePath}.enc`)
        await execAsync(`rm ${archivePath}`)
        metadata.encrypted = true
      }

      // Calculate checksum
      const finalPath = this.config.encryption.enabled ? `${archivePath}.enc` : archivePath
      metadata.checksum = await this.calculateChecksum(finalPath)
      metadata.size = await this.getFileSize(finalPath)

      // Upload to destinations
      for (const destination of this.config.destinations) {
        await this.uploadToDestination(finalPath, backupId, destination)
      }

      // Clean up temporary files
      await execAsync(`rm -rf ${backupDir} ${finalPath}`)

      // Record backup in database
      await this.recordBackup(metadata)

      // Clean up old backups based on retention policy
      await this.cleanupOldBackups()

      console.log(`Backup ${backupId} completed successfully`)

      return metadata
    } catch (error) {
      console.error(`Backup ${backupId} failed:`, error)
      throw error
    }
  }

  async restoreBackup(backupId: string, targetDb?: string): Promise<void> {
    console.log(`Starting restore of backup ${backupId}`)

    try {
      // Download backup from storage
      const backupPath = await this.downloadBackup(backupId)

      // Decrypt if needed
      let archivePath = backupPath
      if (backupPath.endsWith('.enc')) {
        archivePath = backupPath.replace('.enc', '')
        await this.decryptFile(backupPath, archivePath)
      }

      // Extract archive
      const extractDir = `/tmp/restore-${Date.now()}`
      await execAsync(`mkdir -p ${extractDir}`)
      await execAsync(`tar -xzf ${archivePath} -C ${extractDir}`)

      // Read metadata
      const metadataStr = await this.readFile(`${extractDir}/metadata.json`)
      const metadata: BackupMetadata = JSON.parse(metadataStr)

      // Verify checksum
      const currentChecksum = await this.calculateChecksum(archivePath)
      if (currentChecksum !== metadata.checksum) {
        throw new Error('Backup checksum verification failed')
      }

      // Restore database
      const dbConfig = targetDb ? this.parseDbUrl(targetDb) : this.parseDbUrl(process.env.DATABASE_URL!)
      await this.restoreDatabase(dbConfig, `${extractDir}/database.sql`)

      // Restore file assets
      await this.restoreFileAssets(extractDir)

      // Clean up
      await execAsync(`rm -rf ${extractDir} ${backupPath} ${archivePath}`)

      console.log(`Restore of backup ${backupId} completed successfully`)
    } catch (error) {
      console.error(`Restore of backup ${backupId} failed:`, error)
      throw error
    }
  }

  async verifyBackup(backupId: string): Promise<boolean> {
    try {
      const backupPath = await this.downloadBackup(backupId)
      
      // Verify file integrity
      const metadata = await this.getBackupMetadata(backupId)
      const checksum = await this.calculateChecksum(backupPath)
      
      await execAsync(`rm ${backupPath}`)
      
      return checksum === metadata.checksum
    } catch (error) {
      console.error(`Verification of backup ${backupId} failed:`, error)
      return false
    }
  }

  private async dumpDatabase(dbConfig: any, outputFile: string): Promise<void> {
    const command = `PGPASSWORD=${dbConfig.password} pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f ${outputFile}`
    
    await execAsync(command)
  }

  private async restoreDatabase(dbConfig: any, inputFile: string): Promise<void> {
    // Create a new database if restoring to different target
    const command = `PGPASSWORD=${dbConfig.password} psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f ${inputFile}`
    
    await execAsync(command)
  }

  private async getTableStatistics(): Promise<Record<string, number>> {
    const tables = await this.db.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `

    const stats: Record<string, number> = {}

    for (const { table_name } of tables) {
      const count = await this.db.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM "${table_name}"`
      )
      stats[table_name] = Number(count[0].count)
    }

    return stats
  }

  private async exportFileAssets(backupDir: string): Promise<void> {
    // Export uploaded files, images, etc.
    const assetsDir = `${backupDir}/assets`
    await execAsync(`mkdir -p ${assetsDir}`)
    
    // Copy assets from storage
    if (process.env.ASSETS_PATH) {
      await execAsync(`cp -r ${process.env.ASSETS_PATH}/* ${assetsDir}/`)
    }
  }

  private async restoreFileAssets(restoreDir: string): Promise<void> {
    const assetsDir = `${restoreDir}/assets`
    
    if (process.env.ASSETS_PATH) {
      await execAsync(`cp -r ${assetsDir}/* ${process.env.ASSETS_PATH}/`)
    }
  }

  private async createArchive(sourceDir: string, outputFile: string): Promise<void> {
    await execAsync(`tar -czf ${outputFile} -C ${sourceDir} .`)
  }

  private async encryptFile(inputFile: string, outputFile: string): Promise<void> {
    const key = this.config.encryption.key || process.env.BACKUP_ENCRYPTION_KEY
    if (!key) throw new Error('Encryption key not provided')

    const algorithm = 'aes-256-cbc'
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv)

    const input = createReadStream(inputFile)
    const output = createWriteStream(outputFile)

    // Write IV to the beginning of the file
    output.write(iv)

    await pipeline(input, cipher, output)
  }

  private async decryptFile(inputFile: string, outputFile: string): Promise<void> {
    const key = this.config.encryption.key || process.env.BACKUP_ENCRYPTION_KEY
    if (!key) throw new Error('Encryption key not provided')

    const algorithm = 'aes-256-cbc'
    const input = createReadStream(inputFile)
    const output = createWriteStream(outputFile)

    // Read IV from the beginning of the file
    const iv = Buffer.alloc(16)
    const fd = require('fs').openSync(inputFile, 'r')
    require('fs').readSync(fd, iv, 0, 16, 0)
    require('fs').closeSync(fd)

    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv)

    // Skip the IV when reading
    input.read(16)

    await pipeline(input, decipher, output)
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256')
    const stream = createReadStream(filePath)
    
    return new Promise((resolve, reject) => {
      stream.on('data', data => hash.update(data))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }

  private async getFileSize(filePath: string): Promise<number> {
    const stats = require('fs').statSync(filePath)
    return stats.size
  }

  private async uploadToDestination(
    filePath: string,
    backupId: string,
    destination: BackupDestination
  ): Promise<void> {
    switch (destination.type) {
      case 'local':
        const localPath = `${destination.config.path}/${backupId}.backup`
        await execAsync(`cp ${filePath} ${localPath}`)
        break

      case 's3':
        // AWS S3 upload
        const s3Key = `backups/${backupId}.backup`
        await execAsync(`aws s3 cp ${filePath} s3://${destination.config.bucket}/${s3Key}`)
        break

      case 'gcs':
        // Google Cloud Storage upload
        const gcsPath = `gs://${destination.config.bucket}/backups/${backupId}.backup`
        await execAsync(`gsutil cp ${filePath} ${gcsPath}`)
        break

      case 'azure':
        // Azure Blob Storage upload
        const azurePath = `https://${destination.config.account}.blob.core.windows.net/${destination.config.container}/backups/${backupId}.backup`
        await execAsync(`az storage blob upload --file ${filePath} --name backups/${backupId}.backup --container-name ${destination.config.container}`)
        break

      default:
        throw new Error(`Unsupported destination type: ${destination.type}`)
    }
  }

  private async downloadBackup(backupId: string): Promise<string> {
    const localPath = `/tmp/${backupId}.backup`
    
    // Try each destination until successful
    for (const destination of this.config.destinations) {
      try {
        switch (destination.type) {
          case 'local':
            await execAsync(`cp ${destination.config.path}/${backupId}.backup ${localPath}`)
            return localPath

          case 's3':
            await execAsync(`aws s3 cp s3://${destination.config.bucket}/backups/${backupId}.backup ${localPath}`)
            return localPath

          case 'gcs':
            await execAsync(`gsutil cp gs://${destination.config.bucket}/backups/${backupId}.backup ${localPath}`)
            return localPath

          case 'azure':
            await execAsync(`az storage blob download --name backups/${backupId}.backup --file ${localPath} --container-name ${destination.config.container}`)
            return localPath
        }
      } catch (error) {
        console.warn(`Failed to download from ${destination.type}:`, error)
      }
    }

    throw new Error(`Backup ${backupId} not found in any destination`)
  }

  private async recordBackup(metadata: BackupMetadata): Promise<void> {
    // Store backup metadata in database
    await this.db.$executeRaw`
      INSERT INTO backups (id, type, size, checksum, created_at, metadata)
      VALUES (${metadata.id}, ${metadata.type}, ${metadata.size}, ${metadata.checksum}, ${metadata.timestamp}, ${JSON.stringify(metadata)})
    `
  }

  private async getBackupMetadata(backupId: string): Promise<BackupMetadata> {
    const result = await this.db.$queryRaw<Array<{ metadata: any }>>`
      SELECT metadata FROM backups WHERE id = ${backupId}
    `
    
    if (result.length === 0) {
      throw new Error(`Backup ${backupId} not found`)
    }

    return result[0].metadata
  }

  private async cleanupOldBackups(): Promise<void> {
    const now = new Date()
    const retention = this.config.retention

    // Get all backups
    const backups = await this.db.$queryRaw<Array<{ id: string; created_at: Date; type: string }>>`
      SELECT id, created_at, type FROM backups ORDER BY created_at DESC
    `

    const toDelete: string[] = []

    // Group backups by period
    const dailyBackups = backups.filter(b => {
      const age = (now.getTime() - b.created_at.getTime()) / (1000 * 60 * 60 * 24)
      return age <= 7
    })

    const weeklyBackups = backups.filter(b => {
      const age = (now.getTime() - b.created_at.getTime()) / (1000 * 60 * 60 * 24)
      return age > 7 && age <= 30
    })

    const monthlyBackups = backups.filter(b => {
      const age = (now.getTime() - b.created_at.getTime()) / (1000 * 60 * 60 * 24)
      return age > 30
    })

    // Apply retention policies
    if (dailyBackups.length > retention.daily) {
      toDelete.push(...dailyBackups.slice(retention.daily).map(b => b.id))
    }

    if (weeklyBackups.length > retention.weekly) {
      toDelete.push(...weeklyBackups.slice(retention.weekly).map(b => b.id))
    }

    if (monthlyBackups.length > retention.monthly) {
      toDelete.push(...monthlyBackups.slice(retention.monthly).map(b => b.id))
    }

    // Delete old backups
    for (const backupId of toDelete) {
      await this.deleteBackup(backupId)
    }
  }

  private async deleteBackup(backupId: string): Promise<void> {
    // Delete from all destinations
    for (const destination of this.config.destinations) {
      try {
        switch (destination.type) {
          case 'local':
            await execAsync(`rm -f ${destination.config.path}/${backupId}.backup`)
            break

          case 's3':
            await execAsync(`aws s3 rm s3://${destination.config.bucket}/backups/${backupId}.backup`)
            break

          case 'gcs':
            await execAsync(`gsutil rm gs://${destination.config.bucket}/backups/${backupId}.backup`)
            break

          case 'azure':
            await execAsync(`az storage blob delete --name backups/${backupId}.backup --container-name ${destination.config.container}`)
            break
        }
      } catch (error) {
        console.warn(`Failed to delete from ${destination.type}:`, error)
      }
    }

    // Delete from database
    await this.db.$executeRaw`DELETE FROM backups WHERE id = ${backupId}`
  }

  private parseDbUrl(url: string): any {
    const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
    if (!match) throw new Error('Invalid database URL')

    return {
      user: match[1],
      password: match[2],
      host: match[3],
      port: match[4],
      database: match[5]
    }
  }

  private async writeFile(path: string, content: string): Promise<void> {
    require('fs').writeFileSync(path, content)
  }

  private async readFile(path: string): Promise<string> {
    return require('fs').readFileSync(path, 'utf-8')
  }
}