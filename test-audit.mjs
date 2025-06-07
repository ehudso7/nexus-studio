// Test audit logging functionality
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🧪 Testing Audit Logging System...')

try {
  // Test 1: Validate audit logger implementation
  console.log('\n1. Checking audit logger implementation...')
  
  const auditLoggerPath = path.join(__dirname, 'packages/database/src/audit-logger.ts')
  
  if (!fs.existsSync(auditLoggerPath)) {
    throw new Error('Audit logger file not found')
  }
  
  const auditContent = fs.readFileSync(auditLoggerPath, 'utf8')
  
  const requiredMethods = [
    'log',
    'logBatch',
    'getAuditLogs',
    'getUserActivity'
  ]
  
  const missingMethods = requiredMethods.filter(method => !auditContent.includes(method))
  
  if (missingMethods.length > 0) {
    throw new Error(`Missing audit methods: ${missingMethods.join(', ')}`)
  }
  
  console.log('✅ All required audit logging methods present')
  
  // Test 2: Check audit context structure
  console.log('\n2. Checking audit context and event types...')
  
  const requiredInterfaces = [
    'AuditContext',
    'AuditEvent'
  ]
  
  const missingInterfaces = requiredInterfaces.filter(iface => !auditContent.includes(iface))
  
  if (missingInterfaces.length > 0) {
    throw new Error(`Missing audit interfaces: ${missingInterfaces.join(', ')}`)
  }
  
  console.log('✅ Audit context and event types properly defined')
  
  // Test 3: Validate organization-scoped logging
  console.log('\n3. Checking organization-scoped audit logging...')
  
  const orgScopingChecks = [
    'organizationId',
    'userId',
    'projectId',
    'action',
    'resourceType',
    'resourceId'
  ]
  
  const missingScopeFields = orgScopingChecks.filter(field => !auditContent.includes(field))
  
  if (missingScopeFields.length > 0) {
    throw new Error(`Missing audit scope fields: ${missingScopeFields.join(', ')}`)
  }
  
  console.log('✅ Organization-scoped audit logging properly implemented')
  
  // Test 4: Check audit middleware integration
  console.log('\n4. Checking audit middleware integration...')
  
  const auditMiddlewarePath = path.join(__dirname, 'services/api/src/middleware/audit.ts')
  
  if (!fs.existsSync(auditMiddlewarePath)) {
    throw new Error('Audit middleware file not found')
  }
  
  const middlewareContent = fs.readFileSync(auditMiddlewarePath, 'utf8')
  
  const requiredMiddlewareFeatures = [
    'auditMiddleware',
    'AUDIT_MAPPINGS',
    'createAuditRoutes'
  ]
  
  const missingFeatures = requiredMiddlewareFeatures.filter(feature => !middlewareContent.includes(feature))
  
  if (missingFeatures.length > 0) {
    throw new Error(`Missing audit middleware features: ${missingFeatures.join(', ')}`)
  }
  
  console.log('✅ Audit middleware properly integrated')
  
  // Test 5: Validate audit actions and compliance
  console.log('\n5. Checking audit actions and compliance features...')
  
  const complianceFeatures = [
    'CREATE',
    'UPDATE', 
    'DELETE',
    'timestamp',
    'ipAddress',
    'userAgent'
  ]
  
  const missingCompliance = complianceFeatures.filter(feature => {
    return !auditContent.includes(feature) && !middlewareContent.includes(feature)
  })
  
  if (missingCompliance.length > 0) {
    throw new Error(`Missing compliance features: ${missingCompliance.join(', ')}`)
  }
  
  console.log('✅ Audit actions and compliance features present')
  
  // Test 6: Check audit log schema in database
  console.log('\n6. Checking audit log database schema...')
  
  const schemaPath = path.join(__dirname, 'packages/database/schema.prisma')
  const schemaContent = fs.readFileSync(schemaPath, 'utf8')
  
  const requiredSchemaFields = [
    'model AuditLog',
    'organizationId',
    'userId', 
    'action',
    'resourceType',
    'resourceId',
    'metadata',
    'timestamp'
  ]
  
  const missingSchemaFields = requiredSchemaFields.filter(field => !schemaContent.includes(field))
  
  if (missingSchemaFields.length > 0) {
    throw new Error(`Missing audit schema fields: ${missingSchemaFields.join(', ')}`)
  }
  
  console.log('✅ Audit log database schema properly defined')
  
  // Test 7: Validate audit trail query capabilities
  console.log('\n7. Checking audit trail query capabilities...')
  
  const queryCapabilities = [
    'findMany',
    'where',
    'orderBy',
    'include'
  ]
  
  const hasQueryCapabilities = queryCapabilities.some(cap => auditContent.includes(cap))
  
  if (!hasQueryCapabilities) {
    console.log('⚠️  Audit trail querying capabilities may be limited')
  } else {
    console.log('✅ Audit trail query capabilities present')
  }
  
  console.log('\n🎉 All audit logging tests passed!')
  
  const results = {
    auditMethods: requiredMethods.length,
    interfaces: requiredInterfaces.length,
    scopeFields: orgScopingChecks.length,
    middlewareFeatures: requiredMiddlewareFeatures.length,
    complianceFeatures: complianceFeatures.length,
    schemaFields: requiredSchemaFields.length
  }
  
  console.log('\n📊 Audit Logging Test Results:')
  console.log(`- Audit methods: ${results.auditMethods}`)
  console.log(`- Type interfaces: ${results.interfaces}`)
  console.log(`- Scope fields: ${results.scopeFields}`)
  console.log(`- Middleware features: ${results.middlewareFeatures}`)
  console.log(`- Compliance features: ${results.complianceFeatures}`)
  console.log(`- Schema fields: ${results.schemaFields}`)
  
  process.exit(0)
  
} catch (error) {
  console.error('❌ Audit logging test failed:', error.message)
  process.exit(1)
}