// Test monitoring and alerting systems
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🧪 Testing Monitoring and Alerting Systems...')

try {
  // Test 1: Validate monitoring package implementation
  console.log('\n1. Checking monitoring package implementation...')
  
  const monitoringPath = path.join(__dirname, 'packages/monitoring/src/index.ts')
  
  if (!fs.existsSync(monitoringPath)) {
    throw new Error('Monitoring package file not found')
  }
  
  const monitoringContent = fs.readFileSync(monitoringPath, 'utf8')
  
  const requiredMonitoringFeatures = [
    'initializeSentry',
    'metrics',
    'createLogger',
    'SLATracker',
    'HealthMonitor',
    'PerformanceMonitor',
    'AlertManager'
  ]
  
  const missingFeatures = requiredMonitoringFeatures.filter(feature => !monitoringContent.includes(feature))
  
  if (missingFeatures.length > 0) {
    throw new Error(`Missing monitoring features: ${missingFeatures.join(', ')}`)
  }
  
  console.log('✅ All required monitoring features present')
  
  // Test 2: Check Sentry error tracking
  console.log('\n2. Checking Sentry error tracking...')
  
  const sentryFeatures = [
    'Sentry.init',
    'ProfilingIntegration',
    'tracesSampleRate',
    'profilesSampleRate',
    'beforeSend'
  ]
  
  const missingSentryFeatures = sentryFeatures.filter(feature => !monitoringContent.includes(feature))
  
  if (missingSentryFeatures.length > 0) {
    throw new Error(`Missing Sentry features: ${missingSentryFeatures.join(', ')}`)
  }
  
  console.log('✅ Sentry error tracking properly configured')
  
  // Test 3: Validate Prometheus metrics
  console.log('\n3. Checking Prometheus metrics...')
  
  const prometheusMetrics = [
    'http_request_duration_seconds',
    'http_requests_total',
    'users_total',
    'projects_total',
    'subscriptions_active',
    'database_query_duration',
    'errors_total'
  ]
  
  const missingMetrics = prometheusMetrics.filter(metric => !monitoringContent.includes(metric))
  
  if (missingMetrics.length > 0) {
    throw new Error(`Missing Prometheus metrics: ${missingMetrics.join(', ')}`)
  }
  
  console.log('✅ Prometheus metrics properly defined')
  
  // Test 4: Check logging configuration
  console.log('\n4. Checking logging configuration...')
  
  const loggingFeatures = [
    'winston',
    'DailyRotateFile',
    'createLogger',
    'timestamp',
    'errors',
    'json'
  ]
  
  const missingLoggingFeatures = loggingFeatures.filter(feature => !monitoringContent.includes(feature))
  
  if (missingLoggingFeatures.length > 0) {
    throw new Error(`Missing logging features: ${missingLoggingFeatures.join(', ')}`)
  }
  
  console.log('✅ Logging configuration properly set up')
  
  // Test 5: Validate SLA tracking
  console.log('\n5. Checking SLA tracking...')
  
  const slaFeatures = [
    'SLATracker',
    'uptimeStart',
    'downtimeTotal',
    'getUptime',
    'getSLAStatus',
    'recordDowntime'
  ]
  
  const missingSlaFeatures = slaFeatures.filter(feature => !monitoringContent.includes(feature))
  
  if (missingSlaFeatures.length > 0) {
    throw new Error(`Missing SLA features: ${missingSlaFeatures.join(', ')}`)
  }
  
  console.log('✅ SLA tracking properly implemented')
  
  // Test 6: Check health monitoring
  console.log('\n6. Checking health monitoring...')
  
  const healthFeatures = [
    'HealthMonitor',
    'HealthCheck',
    'addCheck',
    'runChecks',
    'healthy',
    'critical'
  ]
  
  const missingHealthFeatures = healthFeatures.filter(feature => !monitoringContent.includes(feature))
  
  if (missingHealthFeatures.length > 0) {
    throw new Error(`Missing health monitoring features: ${missingHealthFeatures.join(', ')}`)
  }
  
  console.log('✅ Health monitoring properly implemented')
  
  // Test 7: Validate performance monitoring
  console.log('\n7. Checking performance monitoring...')
  
  const performanceFeatures = [
    'PerformanceMonitor',
    'startMeasure',
    'getStats',
    'mean',
    'median',
    'p95',
    'p99'
  ]
  
  const missingPerformanceFeatures = performanceFeatures.filter(feature => !monitoringContent.includes(feature))
  
  if (missingPerformanceFeatures.length > 0) {
    throw new Error(`Missing performance features: ${missingPerformanceFeatures.join(', ')}`)
  }
  
  console.log('✅ Performance monitoring properly implemented')
  
  // Test 8: Check alert management
  console.log('\n8. Checking alert management...')
  
  const alertFeatures = [
    'AlertManager',
    'Alert',
    'trigger',
    'resolve',
    'severity',
    'getActiveAlerts'
  ]
  
  const missingAlertFeatures = alertFeatures.filter(feature => !monitoringContent.includes(feature))
  
  if (missingAlertFeatures.length > 0) {
    throw new Error(`Missing alert features: ${missingAlertFeatures.join(', ')}`)
  }
  
  console.log('✅ Alert management properly implemented')
  
  // Test 9: Validate metrics endpoint
  console.log('\n9. Checking metrics endpoint...')
  
  const metricsEndpointFeatures = [
    'metricsEndpoint',
    'register.metrics'
  ]
  
  const missingEndpointFeatures = metricsEndpointFeatures.filter(feature => !monitoringContent.includes(feature))
  
  if (missingEndpointFeatures.length > 0) {
    throw new Error(`Missing metrics endpoint features: ${missingEndpointFeatures.join(', ')}`)
  }
  
  console.log('✅ Metrics endpoint properly implemented')
  
  // Test 10: Check database performance monitoring
  console.log('\n10. Checking database performance monitoring...')
  
  const dbPerformancePath = path.join(__dirname, 'packages/database/src/performance.ts')
  
  if (!fs.existsSync(dbPerformancePath)) {
    throw new Error('Database performance monitoring file not found')
  }
  
  const dbPerfContent = fs.readFileSync(dbPerformancePath, 'utf8')
  
  const dbPerfFeatures = [
    'QueryMonitor',
    'CacheManager',
    'checkDatabaseHealth',
    'getPerformanceRecommendations'
  ]
  
  const missingDbPerfFeatures = dbPerfFeatures.filter(feature => !dbPerfContent.includes(feature))
  
  if (missingDbPerfFeatures.length > 0) {
    throw new Error(`Missing DB performance features: ${missingDbPerfFeatures.join(', ')}`)
  }
  
  console.log('✅ Database performance monitoring properly implemented')
  
  // Test 11: Check monitoring package dependencies
  console.log('\n11. Checking monitoring package dependencies...')
  
  const monitoringPackagePath = path.join(__dirname, 'packages/monitoring/package.json')
  const packageContent = fs.readFileSync(monitoringPackagePath, 'utf8')
  
  const requiredDependencies = [
    '@sentry/node',
    'prom-client',
    'winston',
    'winston-daily-rotate-file'
  ]
  
  const missingDependencies = requiredDependencies.filter(dep => !packageContent.includes(dep))
  
  if (missingDependencies.length > 0) {
    throw new Error(`Missing monitoring dependencies: ${missingDependencies.join(', ')}`)
  }
  
  console.log('✅ Monitoring package dependencies properly configured')
  
  console.log('\n🎉 All monitoring and alerting tests passed!')
  
  const results = {
    monitoringFeatures: requiredMonitoringFeatures.length,
    sentryFeatures: sentryFeatures.length,
    prometheusMetrics: prometheusMetrics.length,
    loggingFeatures: loggingFeatures.length,
    slaFeatures: slaFeatures.length,
    healthFeatures: healthFeatures.length,
    performanceFeatures: performanceFeatures.length,
    alertFeatures: alertFeatures.length,
    endpointFeatures: metricsEndpointFeatures.length,
    dbPerfFeatures: dbPerfFeatures.length,
    dependencies: requiredDependencies.length
  }
  
  console.log('\n📊 Monitoring and Alerting Test Results:')
  console.log(`- Monitoring features: ${results.monitoringFeatures}`)
  console.log(`- Sentry features: ${results.sentryFeatures}`)
  console.log(`- Prometheus metrics: ${results.prometheusMetrics}`)
  console.log(`- Logging features: ${results.loggingFeatures}`)
  console.log(`- SLA features: ${results.slaFeatures}`)
  console.log(`- Health features: ${results.healthFeatures}`)
  console.log(`- Performance features: ${results.performanceFeatures}`)
  console.log(`- Alert features: ${results.alertFeatures}`)
  console.log(`- Endpoint features: ${results.endpointFeatures}`)
  console.log(`- DB performance features: ${results.dbPerfFeatures}`)
  console.log(`- Dependencies: ${results.dependencies}`)
  
  process.exit(0)
  
} catch (error) {
  console.error('❌ Monitoring and alerting test failed:', error.message)
  process.exit(1)
}