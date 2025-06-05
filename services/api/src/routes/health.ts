import { Hono } from 'hono';
import { prisma } from '../server';
import { redis } from '../server';
import os from 'os';
import fs from 'fs/promises';

export const healthRoutes = new Hono();

// Simple health check
healthRoutes.get('/health', async (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'nexstudio-api',
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Liveness probe for k8s
healthRoutes.get('/health/live', async (c) => {
  return c.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe with dependency checks
healthRoutes.get('/health/ready', async (c) => {
  const checks = {
    database: false,
    redis: false,
    disk: false,
    memory: false,
  };
  
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }
  
  try {
    // Check Redis
    await redis.ping();
    checks.redis = true;
  } catch (error) {
    console.error('Redis health check failed:', error);
  }
  
  try {
    // Check disk space
    const stats = await fs.statfs('/');
    const availableGB = stats.bavail * stats.bsize / (1024 * 1024 * 1024);
    checks.disk = availableGB > 1; // At least 1GB free
  } catch (error) {
    console.error('Disk health check failed:', error);
  }
  
  // Check memory
  const freeMemory = os.freemem();
  const totalMemory = os.totalmem();
  const memoryUsagePercent = ((totalMemory - freeMemory) / totalMemory) * 100;
  checks.memory = memoryUsagePercent < 90;
  
  const isHealthy = Object.values(checks).every(check => check);
  
  return c.json({
    status: isHealthy ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString(),
  }, isHealthy ? 200 : 503);
});

// Detailed system info (protected endpoint)
healthRoutes.get('/health/system', async (c) => {
  // Only allow in development or with proper auth
  if (process.env.NODE_ENV === 'production') {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.includes('Bearer')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }
  
  const [dbStats, redisInfo] = await Promise.allSettled([
    prisma.$queryRaw`
      SELECT 
        (SELECT count(*) FROM "User") as users,
        (SELECT count(*) FROM "Project") as projects,
        (SELECT count(*) FROM "Component") as components,
        (SELECT count(*) FROM "Team") as teams
    `,
    redis.info(),
  ]);
  
  const systemInfo = {
    timestamp: new Date().toISOString(),
    service: {
      name: 'nexus-api',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      pid: process.pid,
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
      freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
      loadAverage: os.loadavg(),
      hostname: os.hostname(),
    },
    database: {
      status: dbStats.status === 'fulfilled' ? 'connected' : 'disconnected',
      stats: dbStats.status === 'fulfilled' ? dbStats.value[0] : null,
      error: dbStats.status === 'rejected' ? dbStats.reason.message : null,
    },
    redis: {
      status: redisInfo.status === 'fulfilled' ? 'connected' : 'disconnected',
      info: redisInfo.status === 'fulfilled' ? parseRedisInfo(redisInfo.value) : null,
      error: redisInfo.status === 'rejected' ? redisInfo.reason.message : null,
    },
  };
  
  return c.json(systemInfo);
});

// Metrics endpoint for Prometheus
healthRoutes.get('/metrics', async (c) => {
  const metrics = [
    `# HELP nexus_api_uptime_seconds API uptime in seconds`,
    `# TYPE nexus_api_uptime_seconds gauge`,
    `nexus_api_uptime_seconds ${process.uptime()}`,
    '',
    `# HELP nexus_api_memory_usage_bytes Memory usage in bytes`,
    `# TYPE nexus_api_memory_usage_bytes gauge`,
    `nexus_api_memory_usage_bytes ${process.memoryUsage().heapUsed}`,
    '',
    `# HELP nexus_api_cpu_usage_percent CPU usage percentage`,
    `# TYPE nexus_api_cpu_usage_percent gauge`,
    `nexus_api_cpu_usage_percent ${os.loadavg()[0] * 100 / os.cpus().length}`,
  ];
  
  c.header('Content-Type', 'text/plain');
  return c.text(metrics.join('\n'));
});

// Helper to parse Redis info
function parseRedisInfo(info: string): Record<string, any> {
  const lines = info.split('\r\n');
  const result: Record<string, any> = {};
  
  for (const line of lines) {
    if (line.includes(':')) {
      const [key, value] = line.split(':');
      result[key] = value;
    }
  }
  
  return {
    version: result.redis_version,
    uptime: result.uptime_in_seconds,
    connectedClients: result.connected_clients,
    usedMemory: result.used_memory_human,
    totalCommands: result.total_commands_processed,
  };
}