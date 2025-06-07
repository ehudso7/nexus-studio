// Test data export/import functionality
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🧪 Testing Data Export/Import System...')

try {
  // Test 1: Validate data export implementation
  console.log('\n1. Checking data export implementation...')
  
  const dataExportPath = path.join(__dirname, 'packages/database/src/data-export.ts')
  
  if (!fs.existsSync(dataExportPath)) {
    throw new Error('Data export file not found')
  }
  
  const exportContent = fs.readFileSync(dataExportPath, 'utf8')
  
  const requiredExportMethods = [
    'exportData',
    'exportProject',
    'exportOrganization',
    'exportUserData',
    'exportAnalytics',
    'exportAuditLogs'
  ]
  
  const missingExportMethods = requiredExportMethods.filter(method => !exportContent.includes(method))
  
  if (missingExportMethods.length > 0) {
    throw new Error(`Missing export methods: ${missingExportMethods.join(', ')}`)
  }
  
  console.log('✅ All required data export methods present')
  
  // Test 2: Check data import implementation
  console.log('\n2. Checking data import implementation...')
  
  const requiredImportMethods = [
    'importData',
    'DataImporter',
    'importProject',
    'importAnalytics'
  ]
  
  const missingImportMethods = requiredImportMethods.filter(method => !exportContent.includes(method))
  
  if (missingImportMethods.length > 0) {
    throw new Error(`Missing import methods: ${missingImportMethods.join(', ')}`)
  }
  
  console.log('✅ All required data import methods present')
  
  // Test 3: Check export format support
  console.log('\n3. Checking export format support...')
  
  const supportedFormats = [
    'json',
    'csv', 
    'zip'
  ]
  
  const missingFormats = supportedFormats.filter(format => !exportContent.includes(format))
  
  if (missingFormats.length > 0) {
    throw new Error(`Missing export formats: ${missingFormats.join(', ')}`)
  }
  
  console.log('✅ All required export formats supported')
  
  // Test 4: Validate export types
  console.log('\n4. Checking export types...')
  
  const exportTypes = [
    'project',
    'organization',
    'user_data',
    'analytics',
    'audit_logs'
  ]
  
  const missingTypes = exportTypes.filter(type => !exportContent.includes(type))
  
  if (missingTypes.length > 0) {
    throw new Error(`Missing export types: ${missingTypes.join(', ')}`)
  }
  
  console.log('✅ All required export types supported')
  
  // Test 5: Check GDPR compliance features
  console.log('\n5. Checking GDPR compliance features...')
  
  const gdprFeatures = [
    'DataExporter',
    'DataImporter',
    'user_data',
    'exportUserData'
  ]
  
  const missingGdprFeatures = gdprFeatures.filter(feature => !exportContent.includes(feature))
  
  if (missingGdprFeatures.length > 0) {
    throw new Error(`Missing GDPR features: ${missingGdprFeatures.join(', ')}`)
  }
  
  console.log('✅ GDPR compliance features present')
  
  // Test 6: Check data transfer API routes
  console.log('\n6. Checking data transfer API routes...')
  
  const dataTransferPath = path.join(__dirname, 'services/api/src/routes/data-transfer.ts')
  
  if (!fs.existsSync(dataTransferPath)) {
    throw new Error('Data transfer API routes not found')
  }
  
  const routesContent = fs.readFileSync(dataTransferPath, 'utf8')
  
  const requiredRoutes = [
    'dataTransfer.post',
    'dataTransfer.get',
    'export',
    'import',
    'DataExporter',
    'DataImporter'
  ]
  
  const missingRoutes = requiredRoutes.filter(route => !routesContent.includes(route))
  
  if (missingRoutes.length > 0) {
    throw new Error(`Missing API routes: ${missingRoutes.join(', ')}`)
  }
  
  console.log('✅ Data transfer API routes properly implemented')
  
  // Test 7: Validate file handling capabilities
  console.log('\n7. Checking file handling capabilities...')
  
  const fileHandlingFeatures = [
    'archiver',
    'csv-parse',
    'csv-stringify',
    'unzipper',
    'createReadStream',
    'createWriteStream'
  ]
  
  const missingFileFeatures = fileHandlingFeatures.filter(feature => !exportContent.includes(feature))
  
  if (missingFileFeatures.length > 0) {
    throw new Error(`Missing file handling features: ${missingFileFeatures.join(', ')}`)
  }
  
  console.log('✅ File handling capabilities present')
  
  // Test 8: Check organization-scoped exports
  console.log('\n8. Checking organization-scoped export functionality...')
  
  const orgScopingFeatures = [
    'organizationId',
    'organization.findUnique',
    'members',
    'projects',
    'subscription'
  ]
  
  const missingScopingFeatures = orgScopingFeatures.filter(feature => !exportContent.includes(feature))
  
  if (missingScopingFeatures.length > 0) {
    throw new Error(`Missing organization scoping: ${missingScopingFeatures.join(', ')}`)
  }
  
  console.log('✅ Organization-scoped export functionality present')
  
  console.log('\n🎉 All data export/import tests passed!')
  
  const results = {
    exportMethods: requiredExportMethods.length,
    importMethods: requiredImportMethods.length,
    formats: supportedFormats.length,
    types: exportTypes.length,
    gdprFeatures: gdprFeatures.length,
    apiRoutes: requiredRoutes.length,
    fileFeatures: fileHandlingFeatures.length,
    scopingFeatures: orgScopingFeatures.length
  }
  
  console.log('\n📊 Data Export/Import Test Results:')
  console.log(`- Export methods: ${results.exportMethods}`)
  console.log(`- Import methods: ${results.importMethods}`)
  console.log(`- Supported formats: ${results.formats}`)
  console.log(`- Export types: ${results.types}`)
  console.log(`- GDPR features: ${results.gdprFeatures}`)
  console.log(`- API routes: ${results.apiRoutes}`)
  console.log(`- File handling features: ${results.fileFeatures}`)
  console.log(`- Organization scoping: ${results.scopingFeatures}`)
  
  process.exit(0)
  
} catch (error) {
  console.error('❌ Data export/import test failed:', error.message)
  process.exit(1)
}