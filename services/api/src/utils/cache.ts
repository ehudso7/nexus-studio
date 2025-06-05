import { redis } from '../server';
import { createHash } from 'crypto';
import { log } from './logger';

// Cache configuration
const CACHE_PREFIXES = {
  user: 'user:',
  project: 'project:',
  component: 'component:',
  team: 'team:',
  session: 'session:',
  query: 'query:',
  ai: 'ai:',
} as const;

const CACHE_TTL = {
  short: 60, // 1 minute
  medium: 300, // 5 minutes
  long: 3600, // 1 hour
  day: 86400, // 24 hours
  week: 604800, // 7 days
} as const;

// Cache key generator
export function generateCacheKey(prefix: keyof typeof CACHE_PREFIXES, ...parts: (string | number | object)[]): string {
  const serializedParts = parts.map(part => {
    if (typeof part === 'object') {
      return createHash('md5').update(JSON.stringify(part)).digest('hex');
    }
    return String(part);
  });
  
  return `${CACHE_PREFIXES[prefix]}${serializedParts.join(':')}`;
}

// Generic cache wrapper
export async function withCache<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>,
  options?: {
    forceRefresh?: boolean;
    parse?: boolean;
  }
): Promise<T> {
  const { forceRefresh = false, parse = true } = options || {};
  
  // Skip cache if forced refresh
  if (!forceRefresh) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        log.debug('Cache hit', { key });
        return parse ? JSON.parse(cached) : cached as T;
      }
    } catch (error) {
      log.error('Cache read error', { key, error });
    }
  }
  
  // Execute function and cache result
  log.debug('Cache miss', { key });
  const result = await fn();
  
  try {
    const value = parse ? JSON.stringify(result) : result;
    await redis.setex(key, ttl, value as string);
  } catch (error) {
    log.error('Cache write error', { key, error });
  }
  
  return result;
}

// Cache invalidation
export async function invalidateCache(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    
    const deleted = await redis.del(...keys);
    log.info('Cache invalidated', { pattern, keysDeleted: deleted });
    return deleted;
  } catch (error) {
    log.error('Cache invalidation error', { pattern, error });
    return 0;
  }
}

// Batch cache operations
export class CacheBatch {
  private pipeline = redis.pipeline();
  
  get(key: string): this {
    this.pipeline.get(key);
    return this;
  }
  
  set(key: string, value: any, ttl?: number): this {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl) {
      this.pipeline.setex(key, ttl, serialized);
    } else {
      this.pipeline.set(key, serialized);
    }
    return this;
  }
  
  del(key: string): this {
    this.pipeline.del(key);
    return this;
  }
  
  async exec(): Promise<any[]> {
    const results = await this.pipeline.exec();
    return results?.map(([err, result]) => {
      if (err) throw err;
      return result;
    }) || [];
  }
}

// Caching decorators
export function Cacheable(ttl: number, keyGenerator?: (...args: any[]) => string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator
        ? keyGenerator(...args)
        : generateCacheKey('query', target.constructor.name, propertyName, ...args);
      
      return withCache(key, ttl, () => originalMethod.apply(this, args));
    };
    
    return descriptor;
  };
}

export function InvalidatesCache(patterns: string[] | ((...args: any[]) => string[])) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      const patternsToInvalidate = typeof patterns === 'function' ? patterns(...args) : patterns;
      
      for (const pattern of patternsToInvalidate) {
        await invalidateCache(pattern);
      }
      
      return result;
    };
    
    return descriptor;
  };
}

// Specific cache strategies
export const CacheStrategies = {
  // User cache
  async getUserById(userId: string) {
    const key = generateCacheKey('user', userId);
    return withCache(key, CACHE_TTL.long, async () => {
      const { prisma } = await import('../server');
      return prisma.user.findUnique({ where: { id: userId } });
    });
  },
  
  // Project cache
  async getProjectById(projectId: string) {
    const key = generateCacheKey('project', projectId);
    return withCache(key, CACHE_TTL.medium, async () => {
      const { prisma } = await import('../server');
      return prisma.project.findUnique({ 
        where: { id: projectId },
        include: {
          _count: { select: { components: true, versions: true } },
        },
      });
    });
  },
  
  // Component tree cache
  async getComponentTree(projectId: string) {
    const key = generateCacheKey('component', 'tree', projectId);
    return withCache(key, CACHE_TTL.short, async () => {
      const { prisma } = await import('../server');
      const components = await prisma.component.findMany({
        where: { projectId },
        include: { children: true },
      });
      
      // Build tree structure
      const tree = components.filter(c => !c.parentId);
      const map = new Map(components.map(c => [c.id, c]));
      
      function buildTree(node: any) {
        node.children = components
          .filter(c => c.parentId === node.id)
          .map(child => buildTree({ ...child }));
        return node;
      }
      
      return tree.map(buildTree);
    });
  },
  
  // Team members cache
  async getTeamMembers(teamId: string) {
    const key = generateCacheKey('team', 'members', teamId);
    return withCache(key, CACHE_TTL.medium, async () => {
      const { prisma } = await import('../server');
      return prisma.teamMember.findMany({
        where: { teamId },
        include: { user: true },
      });
    });
  },
  
  // AI response cache
  async getAIResponse(prompt: string, context: any) {
    const key = generateCacheKey('ai', prompt, context);
    return withCache(key, CACHE_TTL.day, async () => {
      // This would be populated by the actual AI call
      return null;
    });
  },
};

// Cache warming
export async function warmCache() {
  log.info('Warming cache...');
  
  try {
    const { prisma } = await import('../server');
    
    // Warm frequently accessed data
    const recentProjects = await prisma.project.findMany({
      take: 100,
      orderBy: { updatedAt: 'desc' },
    });
    
    const batch = new CacheBatch();
    
    for (const project of recentProjects) {
      const key = generateCacheKey('project', project.id);
      batch.set(key, project, CACHE_TTL.medium);
    }
    
    await batch.exec();
    
    log.info('Cache warmed', { projectsCached: recentProjects.length });
  } catch (error) {
    log.error('Cache warming error', { error });
  }
}

// Cache statistics
export async function getCacheStats() {
  const info = await redis.info('stats');
  const dbSize = await redis.dbsize();
  
  const stats = {
    size: dbSize,
    hits: 0,
    misses: 0,
    hitRate: 0,
  };
  
  // Parse Redis INFO stats
  const lines = info.split('\r\n');
  for (const line of lines) {
    if (line.startsWith('keyspace_hits:')) {
      stats.hits = parseInt(line.split(':')[1], 10);
    } else if (line.startsWith('keyspace_misses:')) {
      stats.misses = parseInt(line.split(':')[1], 10);
    }
  }
  
  if (stats.hits + stats.misses > 0) {
    stats.hitRate = (stats.hits / (stats.hits + stats.misses)) * 100;
  }
  
  return stats;
}