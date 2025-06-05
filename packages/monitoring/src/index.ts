import * as Sentry from '@sentry/node'
import { ProfilingIntegration } from '@sentry/profiling-node'
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

// Initialize Sentry
export function initializeSentry(dsn?: string) {
  if (!dsn && !process.env.SENTRY_DSN) {
    console.log('Sentry DSN not provided, skipping initialization')
    return
  }

  Sentry.init({
    dsn: dsn || process.env.SENTRY_DSN,
    integrations: [
      new ProfilingIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    environment: process.env.NODE_ENV || 'development',
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies
      }
      if (event.request?.headers?.authorization) {
        event.request.headers.authorization = '[REDACTED]'
      }
      return event
    }
  })
}

// Prometheus metrics
export const metrics = {
  // HTTP metrics
  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code']
  }),
  
  httpRequestsTotal: new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  }),

  // Business metrics
  usersTotal: new Gauge({
    name: 'users_total',
    help: 'Total number of users'
  }),

  projectsTotal: new Gauge({
    name: 'projects_total',
    help: 'Total number of projects'
  }),

  deploymentsTotal: new Counter({
    name: 'deployments_total',
    help: 'Total number of deployments',
    labelNames: ['status', 'environment']
  }),

  subscriptionsActive: new Gauge({
    name: 'subscriptions_active',
    help: 'Number of active subscriptions',
    labelNames: ['plan']
  }),

  // Performance metrics
  databaseQueryDuration: new Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries',
    labelNames: ['operation', 'table']
  }),

  cacheHitRate: new Gauge({
    name: 'cache_hit_rate',
    help: 'Cache hit rate percentage'
  }),

  // Error metrics
  errorsTotal: new Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'severity']
  }),

  // Resource metrics
  memoryUsage: new Gauge({
    name: 'memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['type']
  }),

  cpuUsage: new Gauge({
    name: 'cpu_usage_percent',
    help: 'CPU usage percentage'
  })
}

// Collect default metrics
collectDefaultMetrics({ register })

// Logger configuration
export function createLogger(service: string) {
  const logDir = process.env.LOG_DIR || './logs'

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      
      // File transport for errors
      new winston.transports.File({
        filename: `${logDir}/error.log`,
        level: 'error'
      }),

      // Daily rotate file for all logs
      new DailyRotateFile({
        filename: `${logDir}/${service}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        auditFile: `${logDir}/${service}-audit.json`
      })
    ]
  })

  // Add Sentry transport if configured
  if (process.env.SENTRY_DSN) {
    logger.add(new winston.transports.Http({
      host: 'sentry.io',
      path: '/api/embed/error-page/',
      ssl: true
    }))
  }

  return logger
}

// SLA Tracker
export class SLATracker {
  private uptimeStart = Date.now()
  private downtimeTotal = 0
  private lastDowntime?: number

  recordDowntime(duration: number) {
    this.downtimeTotal += duration
  }

  startDowntime() {
    this.lastDowntime = Date.now()
  }

  endDowntime() {
    if (this.lastDowntime) {
      this.downtimeTotal += Date.now() - this.lastDowntime
      this.lastDowntime = undefined
    }
  }

  getUptime() {
    const totalTime = Date.now() - this.uptimeStart
    const uptime = ((totalTime - this.downtimeTotal) / totalTime) * 100
    
    return {
      percentage: uptime,
      totalTime,
      downtimeTotal: this.downtimeTotal,
      isDown: !!this.lastDowntime
    }
  }

  getSLAStatus(targetSLA = 99.9) {
    const uptime = this.getUptime()
    return {
      target: targetSLA,
      current: uptime.percentage,
      meeting: uptime.percentage >= targetSLA,
      allowedDowntime: this.calculateAllowedDowntime(targetSLA),
      remainingDowntime: Math.max(0, this.calculateAllowedDowntime(targetSLA) - this.downtimeTotal)
    }
  }

  private calculateAllowedDowntime(sla: number) {
    const totalTime = Date.now() - this.uptimeStart
    return totalTime * ((100 - sla) / 100)
  }
}

// Health check system
export interface HealthCheck {
  name: string
  check: () => Promise<{ healthy: boolean; message?: string; details?: any }>
  critical: boolean
  timeout?: number
}

export class HealthMonitor {
  private checks: HealthCheck[] = []
  private logger: winston.Logger

  constructor(logger: winston.Logger) {
    this.logger = logger
  }

  addCheck(check: HealthCheck) {
    this.checks.push(check)
  }

  async runChecks() {
    const results = await Promise.all(
      this.checks.map(async (check) => {
        const start = Date.now()
        try {
          const result = await Promise.race([
            check.check(),
            new Promise<any>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), check.timeout || 5000)
            )
          ])
          
          return {
            name: check.name,
            healthy: result.healthy,
            message: result.message,
            details: result.details,
            duration: Date.now() - start,
            critical: check.critical
          }
        } catch (error) {
          this.logger.error(`Health check failed: ${check.name}`, error)
          return {
            name: check.name,
            healthy: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - start,
            critical: check.critical
          }
        }
      })
    )

    const healthy = results.filter(r => !r.critical || r.healthy).length === results.filter(r => r.critical).length
    const status = healthy ? 'healthy' : 'unhealthy'

    return {
      status,
      timestamp: new Date(),
      checks: results,
      summary: {
        total: results.length,
        healthy: results.filter(r => r.healthy).length,
        unhealthy: results.filter(r => !r.healthy).length,
        critical: results.filter(r => r.critical && !r.healthy).length
      }
    }
  }
}

// Performance monitor
export class PerformanceMonitor {
  private measurements = new Map<string, number[]>()

  startMeasure(name: string): () => void {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      const existing = this.measurements.get(name) || []
      existing.push(duration)
      
      // Keep only last 1000 measurements
      if (existing.length > 1000) {
        existing.shift()
      }
      
      this.measurements.set(name, existing)
      
      // Update Prometheus metrics
      if (name.startsWith('db.')) {
        const [, operation, table] = name.split('.')
        metrics.databaseQueryDuration.observe({ operation, table }, duration / 1000)
      }
    }
  }

  getStats(name: string) {
    const measurements = this.measurements.get(name) || []
    if (measurements.length === 0) {
      return null
    }

    const sorted = [...measurements].sort((a, b) => a - b)
    const sum = measurements.reduce((acc, val) => acc + val, 0)

    return {
      count: measurements.length,
      mean: sum / measurements.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      min: sorted[0],
      max: sorted[sorted.length - 1]
    }
  }

  getAllStats() {
    const stats: Record<string, any> = {}
    
    for (const [name, measurements] of this.measurements) {
      stats[name] = this.getStats(name)
    }

    return stats
  }
}

// Alert manager
export interface Alert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  timestamp: Date
  resolved?: Date
  metadata?: any
}

export class AlertManager {
  private alerts = new Map<string, Alert>()
  private handlers: ((alert: Alert) => void)[] = []

  onAlert(handler: (alert: Alert) => void) {
    this.handlers.push(handler)
  }

  trigger(alert: Omit<Alert, 'id' | 'timestamp'>) {
    const id = `${alert.severity}-${alert.title}-${Date.now()}`
    const fullAlert: Alert = {
      ...alert,
      id,
      timestamp: new Date()
    }

    this.alerts.set(id, fullAlert)
    this.handlers.forEach(handler => handler(fullAlert))

    // Auto-resolve info alerts after 1 hour
    if (alert.severity === 'info') {
      setTimeout(() => this.resolve(id), 3600000)
    }

    return id
  }

  resolve(id: string) {
    const alert = this.alerts.get(id)
    if (alert && !alert.resolved) {
      alert.resolved = new Date()
    }
  }

  getActiveAlerts() {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  getAlertHistory(limit = 100) {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }
}

// Export metrics endpoint
export function metricsEndpoint() {
  return register.metrics()
}

// Export all monitoring tools
export const monitoring = {
  sentry: Sentry,
  metrics,
  createLogger,
  SLATracker,
  HealthMonitor,
  PerformanceMonitor,
  AlertManager,
  metricsEndpoint
}