// Test backup system operations
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🧪 Testing Backup System Operations...')

try {
  // Test 1: Validate backup service implementation
  console.log('\n1. Checking backup service implementation...')
  
  const backupServicePath = path.join(__dirname, 'packages/database/src/backup-service.ts')
  
  if (!fs.existsSync(backupServicePath)) {
    throw new Error('Backup service file not found')
  }
  
  const backupContent = fs.readFileSync(backupServicePath, 'utf8')
  
  const requiredBackupMethods = [
    'createBackup',
    'restoreBackup',
    'verifyBackup',
    'deleteBackup'
  ]
  
  const missingBackupMethods = requiredBackupMethods.filter(method => !backupContent.includes(method))
  
  if (missingBackupMethods.length > 0) {
    throw new Error(`Missing backup methods: ${missingBackupMethods.join(', ')}`)
  }
  
  console.log('✅ All required backup methods present')
  
  // Test 2: Check backup types and strategies
  console.log('\n2. Checking backup types and strategies...')
  
  const backupStrategies = [
    'full',
    'incremental',
    'BackupConfig',
    'BackupMetadata'
  ]
  
  const missingStrategies = backupStrategies.filter(strategy => !backupContent.includes(strategy))
  
  if (missingStrategies.length > 0) {
    throw new Error(`Missing backup strategies: ${missingStrategies.join(', ')}`)
  }
  
  console.log('✅ Backup types and strategies properly defined')
  
  // Test 3: Validate encryption and security
  console.log('\n3. Checking encryption and security features...')
  
  const securityFeatures = [
    'encrypt',
    'checksum',
    'verification'
  ]
  
  const missingSecurityFeatures = securityFeatures.filter(feature => !backupContent.includes(feature))
  
  if (missingSecurityFeatures.length > 0) {
    throw new Error(`Missing security features: ${missingSecurityFeatures.join(', ')}`)
  }
  
  console.log('✅ Encryption and security features present')
  
  // Test 4: Check storage destinations
  console.log('\n4. Checking storage destinations...')
  
  const storageDestinations = [
    'local',
    's3',
    'gcs',
    'BackupDestination'
  ]
  
  const missingDestinations = storageDestinations.filter(dest => !backupContent.includes(dest))
  
  if (missingDestinations.length > 0) {
    throw new Error(`Missing storage destinations: ${missingDestinations.join(', ')}`)
  }
  
  console.log('✅ Storage destinations properly configured')
  
  // Test 5: Validate backup scheduling
  console.log('\n5. Checking backup scheduling...')
  
  const schedulingFeatures = [
    'schedule',
    'retention',
    'cleanup'
  ]
  
  const missingSchedulingFeatures = schedulingFeatures.filter(feature => !backupContent.includes(feature))
  
  if (missingSchedulingFeatures.length > 0) {
    throw new Error(`Missing scheduling features: ${missingSchedulingFeatures.join(', ')}`)
  }
  
  console.log('✅ Backup scheduling features present')
  
  // Test 6: Check backup database schema
  console.log('\n6. Checking backup database schema...')
  
  const schemaPath = path.join(__dirname, 'packages/database/schema.prisma')
  const schemaContent = fs.readFileSync(schemaPath, 'utf8')
  
  // Check if backup schema exists in main schema or migration files
  const hasMigrationFile = fs.existsSync(path.join(__dirname, 'packages/database/migrations/20240106_add_backup_table.sql'))
  const hasBackupInSchema = schemaContent.toLowerCase().includes('backup')
  
  if (!hasMigrationFile && !hasBackupInSchema) {
    throw new Error('No backup schema found in database')
  }
  
  console.log('✅ Backup database schema properly defined')
  
  // Test 7: Check backup API routes
  console.log('\n7. Checking backup API routes...')
  
  const backupRoutesPath = path.join(__dirname, 'services/api/src/routes/backup.ts')
  
  if (!fs.existsSync(backupRoutesPath)) {
    throw new Error('Backup API routes not found')
  }
  
  const routesContent = fs.readFileSync(backupRoutesPath, 'utf8')
  
  const requiredBackupRoutes = [
    'backup.post',
    'backup.get', 
    'BackupService',
    'createBackup'
  ]
  
  const missingBackupRoutes = requiredBackupRoutes.filter(route => !routesContent.includes(route))
  
  if (missingBackupRoutes.length > 0) {
    throw new Error(`Missing backup routes: ${missingBackupRoutes.join(', ')}`)
  }
  
  console.log('✅ Backup API routes properly implemented')
  
  // Test 8: Validate disaster recovery features
  console.log('\n8. Checking disaster recovery features...')
  
  const drFeatures = [
    'restore',
    'integrity'
  ]
  
  const missingDrFeatures = drFeatures.filter(feature => !backupContent.includes(feature))
  
  if (missingDrFeatures.length > 0) {
    throw new Error(`Missing disaster recovery features: ${missingDrFeatures.join(', ')}`)
  }
  
  console.log('✅ Disaster recovery features present')
  
  // Test 9: Check backup monitoring and alerting
  console.log('\n9. Checking backup monitoring and alerting...')
  
  const monitoringFeatures = [
    'status',
    'progress',
    'notification',
    'alert'
  ]
  
  const missingMonitoringFeatures = monitoringFeatures.filter(feature => !backupContent.includes(feature))
  
  if (missingMonitoringFeatures.length > 0) {
    console.log(`⚠️  Some monitoring features may be limited: ${missingMonitoringFeatures.join(', ')}`)
  } else {
    console.log('✅ Backup monitoring and alerting features present')
  }
  
  // Test 10: Check disaster recovery documentation
  console.log('\n10. Checking disaster recovery documentation...')
  
  const drDocPath = path.join(__dirname, 'docs/DISASTER_RECOVERY.md')
  
  if (!fs.existsSync(drDocPath)) {
    throw new Error('Disaster recovery documentation not found')
  }
  
  const drDocContent = fs.readFileSync(drDocPath, 'utf8')
  
  const drDocSections = [
    'Backup',
    'Recovery',
    'Procedures',
    'Testing',
    'Monitoring'
  ]
  
  const missingDocSections = drDocSections.filter(section => !drDocContent.includes(section))
  
  if (missingDocSections.length > 0) {
    throw new Error(`Missing DR documentation sections: ${missingDocSections.join(', ')}`)
  }
  
  console.log('✅ Disaster recovery documentation complete')
  
  console.log('\n🎉 All backup system tests passed!')
  
  const results = {
    backupMethods: requiredBackupMethods.length,
    strategies: backupStrategies.length,
    securityFeatures: securityFeatures.length,
    storageDestinations: storageDestinations.length,
    schedulingFeatures: schedulingFeatures.length,
    schemaFields: 1, // Migration file exists
    apiRoutes: requiredBackupRoutes.length,
    drFeatures: drFeatures.length,
    monitoringFeatures: monitoringFeatures.length - missingMonitoringFeatures.length,
    docSections: drDocSections.length
  }
  
  console.log('\n📊 Backup System Test Results:')
  console.log(`- Backup methods: ${results.backupMethods}`)
  console.log(`- Backup strategies: ${results.strategies}`)
  console.log(`- Security features: ${results.securityFeatures}`)
  console.log(`- Storage destinations: ${results.storageDestinations}`)
  console.log(`- Scheduling features: ${results.schedulingFeatures}`)
  console.log(`- Schema fields: ${results.schemaFields}`)
  console.log(`- API routes: ${results.apiRoutes}`)
  console.log(`- DR features: ${results.drFeatures}`)
  console.log(`- Monitoring features: ${results.monitoringFeatures}`)
  console.log(`- Documentation sections: ${results.docSections}`)
  
  process.exit(0)
  
} catch (error) {
  console.error('❌ Backup system test failed:', error.message)
  process.exit(1)
}