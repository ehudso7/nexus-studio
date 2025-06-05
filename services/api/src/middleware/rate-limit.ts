import { Context, MiddlewareHandler } from 'hono';
import { redis } from '../server';
import { RateLimitError } from './error-handler';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  keyGenerator?: (c: Context) => string;
  skip?: (c: Context) => boolean;
}

// Default key generator uses IP + path
function defaultKeyGenerator(c: Context): string {
  const ip = c.req.header('x-forwarded-for') || 
             c.req.header('x-real-ip') || 
             'unknown';
  const path = c.req.path;
  return `rate_limit:${ip}:${path}`;
}

// Create rate limiter middleware
export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const {
    windowMs,
    max,
    message = 'Too many requests',
    keyGenerator = defaultKeyGenerator,
    skip = () => false,
  } = options;

  return async (c: Context, next: () => Promise<void>) => {
    // Skip if configured
    if (skip(c)) {
      return next();
    }

    const key = keyGenerator(c);
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Get current count
      const count = await redis.eval(
        `
        local key = KEYS[1]
        local window_start = tonumber(ARGV[1])
        local now = tonumber(ARGV[2])
        local window_ms = tonumber(ARGV[3])
        local max = tonumber(ARGV[4])
        
        -- Remove old entries
        redis.call('zremrangebyscore', key, 0, window_start)
        
        -- Count current entries
        local current_count = redis.call('zcard', key)
        
        if current_count < max then
          -- Add new entry
          redis.call('zadd', key, now, now)
          redis.call('expire', key, math.ceil(window_ms / 1000))
          return current_count + 1
        else
          -- Get oldest entry to calculate retry after
          local oldest = redis.call('zrange', key, 0, 0, 'WITHSCORES')
          if #oldest > 0 then
            return -tonumber(oldest[2])
          end
          return -1
        end
        `,
        1,
        key,
        windowStart,
        now,
        windowMs,
        max
      ) as number;

      if (count < 0) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((Math.abs(count) + windowMs - now) / 1000);
        throw new RateLimitError(retryAfter);
      }

      // Add rate limit headers
      c.header('X-RateLimit-Limit', max.toString());
      c.header('X-RateLimit-Remaining', (max - count).toString());
      c.header('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      await next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      console.error('Rate limit error:', error);
      // On Redis error, allow request through
      await next();
    }
  };
}

// Preset rate limiters
export const rateLimiters = {
  // Strict limit for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    keyGenerator: (c) => {
      const ip = c.req.header('x-forwarded-for') || 'unknown';
      return `rate_limit:auth:${ip}`;
    },
  }),

  // Standard API limit
  api: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
  }),

  // Lenient limit for read operations
  read: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
  }),

  // Strict limit for write operations
  write: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
  }),

  // Very strict limit for expensive operations
  expensive: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
  }),

  // AI generation endpoints
  ai: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    keyGenerator: (c) => {
      const userId = c.get('userId') || 'anonymous';
      return `rate_limit:ai:${userId}`;
    },
  }),
};

// Distributed rate limiter for multiple instances
export function distributedRateLimit(options: RateLimitOptions & { 
  instanceId: string;
}): MiddlewareHandler {
  return async (c: Context, next: () => Promise<void>) => {
    const key = `${options.keyGenerator?.(c) || defaultKeyGenerator(c)}:${options.instanceId}`;
    
    // Use Redis sorted sets for distributed counting
    const pipeline = redis.pipeline();
    const now = Date.now();
    const windowStart = now - options.windowMs;
    
    // Remove old entries and count
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    pipeline.zcard(key);
    pipeline.zadd(key, now, `${now}:${Math.random()}`);
    pipeline.expire(key, Math.ceil(options.windowMs / 1000));
    
    const results = await pipeline.exec();
    const count = results?.[1]?.[1] as number || 0;
    
    if (count >= options.max) {
      const retryAfter = Math.ceil(options.windowMs / 1000);
      throw new RateLimitError(retryAfter);
    }
    
    c.header('X-RateLimit-Limit', options.max.toString());
    c.header('X-RateLimit-Remaining', (options.max - count - 1).toString());
    
    await next();
  };
}