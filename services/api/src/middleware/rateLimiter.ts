import { Context, Next } from 'hono';
import { redis } from '@nexus/database/redis';

interface RateLimiterOptions {
  limit: number;
  window: number; // seconds
  keyPrefix?: string;
}

export function rateLimiter(options: RateLimiterOptions) {
  const { limit, window, keyPrefix = 'rate_limit' } = options;

  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const key = `${keyPrefix}:${userId}:${c.req.path}`;
    
    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        // First request, set expiry
        await redis.expire(key, window);
      }
      
      if (current > limit) {
        const ttl = await redis.ttl(key);
        return c.json(
          { 
            error: 'Rate limit exceeded',
            retryAfter: ttl,
          },
          429
        );
      }
      
      // Add rate limit headers
      c.header('X-RateLimit-Limit', limit.toString());
      c.header('X-RateLimit-Remaining', (limit - current).toString());
      c.header('X-RateLimit-Reset', new Date(Date.now() + window * 1000).toISOString());
      
      await next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Continue without rate limiting on error
      await next();
    }
  };
}