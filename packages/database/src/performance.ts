// Performance optimizations for Prisma
export const performanceMiddleware = {
  // Connection pooling configuration
  connectionPool: {
    connection_limit: parseInt(process.env.DB_POOL_SIZE || '10'),
    pool_timeout: parseInt(process.env.DB_POOL_TIMEOUT || '30'),
    idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '60'),
    max_lifetime: parseInt(process.env.DB_MAX_LIFETIME || '1800')
  },

  // Query optimization
  queryOptimization: {
    // Batch similar queries
    batchQueries: true,
    // Cache frequently accessed data
    cacheStrategy: 'aggressive',
    // Limit default query size
    defaultLimit: 100,
    maxLimit: 1000
  },

  // Indexes for common queries
  recommendedIndexes: [
    'CREATE INDEX CONCURRENTLY idx_projects_org_status ON projects(organization_id, status)',
    'CREATE INDEX CONCURRENTLY idx_projects_owner_updated ON projects(owner_id, updated_at DESC)',
    'CREATE INDEX CONCURRENTLY idx_audit_logs_org_timestamp ON audit_logs(organization_id, timestamp DESC)',
    'CREATE INDEX CONCURRENTLY idx_deployments_project_status ON deployments(project_id, status)',
    'CREATE INDEX CONCURRENTLY idx_analytics_project_event_time ON analytics(project_id, event, timestamp)',
    'CREATE INDEX CONCURRENTLY idx_components_project_type ON components(project_id, type)',
    'CREATE INDEX CONCURRENTLY idx_users_email_verified ON users(email, email_verified)',
    'CREATE INDEX CONCURRENTLY idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id)',
    'CREATE INDEX CONCURRENTLY idx_usage_org_period ON usage(organization_id, period DESC)'
  ]
}

// Query performance monitoring
export class QueryMonitor {
  private slowQueryThreshold = 1000 // ms
  private queryMetrics = new Map<string, { count: number; totalTime: number; maxTime: number }>()

  logQuery(query: string, duration: number) {
    const key = this.normalizeQuery(query)
    const existing = this.queryMetrics.get(key) || { count: 0, totalTime: 0, maxTime: 0 }
    
    this.queryMetrics.set(key, {
      count: existing.count + 1,
      totalTime: existing.totalTime + duration,
      maxTime: Math.max(existing.maxTime, duration)
    })

    if (duration > this.slowQueryThreshold) {
      console.warn(`Slow query detected (${duration}ms):`, query)
    }
  }

  getMetrics() {
    const metrics = Array.from(this.queryMetrics.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
        maxTime: stats.maxTime,
        totalTime: stats.totalTime
      }))
      .sort((a, b) => b.totalTime - a.totalTime)

    return {
      totalQueries: metrics.reduce((sum, m) => sum + m.count, 0),
      uniqueQueries: metrics.length,
      slowQueries: metrics.filter(m => m.avgTime > this.slowQueryThreshold).length,
      topQueries: metrics.slice(0, 10)
    }
  }

  private normalizeQuery(query: string): string {
    // Remove specific values to group similar queries
    return query
      .replace(/\b\d+\b/g, '?')
      .replace(/'[^']*'/g, '?')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

// Caching layer
export class CacheManager {
  private cache = new Map<string, { data: any; expires: number }>()
  private hitRate = { hits: 0, misses: 0 }

  async get<T>(key: string, fetcher: () => Promise<T>, ttl = 300): Promise<T> {
    const cached = this.cache.get(key)
    
    if (cached && cached.expires > Date.now()) {
      this.hitRate.hits++
      return cached.data
    }

    this.hitRate.misses++
    const data = await fetcher()
    
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttl * 1000)
    })

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      this.cleanup()
    }

    return data
  }

  invalidate(pattern: string | RegExp) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  getStats() {
    const total = this.hitRate.hits + this.hitRate.misses
    return {
      size: this.cache.size,
      hitRate: total > 0 ? (this.hitRate.hits / total) * 100 : 0,
      hits: this.hitRate.hits,
      misses: this.hitRate.misses
    }
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, value] of this.cache) {
      if (value.expires < now) {
        this.cache.delete(key)
      }
    }
  }
}

// Database health checks
export async function checkDatabaseHealth(prisma: any) {
  const checks = {
    connection: false,
    responseTime: 0,
    activeConnections: 0,
    version: '',
    replicationLag: 0
  }

  try {
    // Test connection and measure response time
    const start = Date.now()
    const result = await prisma.$queryRaw`SELECT 1 as health, version() as version`
    checks.responseTime = Date.now() - start
    checks.connection = true
    checks.version = result[0].version

    // Get connection stats
    const stats = await prisma.$queryRaw`
      SELECT count(*) as connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `
    checks.activeConnections = Number(stats[0].connections)

    // Check replication lag if applicable
    try {
      const lag = await prisma.$queryRaw`
        SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as lag
      `
      checks.replicationLag = Number(lag[0].lag || 0)
    } catch {
      // Not a replica, ignore
    }

  } catch (error) {
    console.error('Database health check failed:', error)
  }

  return checks
}

// Performance recommendations
export function getPerformanceRecommendations(metrics: any) {
  const recommendations = []

  // High query count
  if (metrics.totalQueries > 10000) {
    recommendations.push({
      severity: 'warning',
      category: 'query-optimization',
      message: 'High query volume detected. Consider implementing query batching or caching.'
    })
  }

  // Slow queries
  if (metrics.slowQueries > 10) {
    recommendations.push({
      severity: 'critical',
      category: 'query-performance',
      message: `${metrics.slowQueries} slow queries detected. Review and optimize these queries.`
    })
  }

  // Cache hit rate
  if (metrics.cacheHitRate < 80) {
    recommendations.push({
      severity: 'info',
      category: 'caching',
      message: 'Low cache hit rate. Consider adjusting TTL or caching strategy.'
    })
  }

  // Connection pool
  if (metrics.activeConnections > 80) {
    recommendations.push({
      severity: 'warning',
      category: 'connection-pool',
      message: 'High connection usage. Consider increasing pool size.'
    })
  }

  return recommendations
}