import { Context, Next } from 'hono'
import { redis } from '@nexus/database'

interface RateLimitOptions {
  windowMs?: number
  max?: number
  message?: string
}

export function rateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // 100 requests per window
    message = 'Too many requests, please try again later',
  } = options
  
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    const key = `rate-limit:${ip}:${Math.floor(Date.now() / windowMs)}`
    
    try {
      const current = await redis.incr(key)
      
      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000))
      }
      
      c.header('X-RateLimit-Limit', max.toString())
      c.header('X-RateLimit-Remaining', Math.max(0, max - current).toString())
      c.header('X-RateLimit-Reset', new Date(Math.ceil(Date.now() / windowMs) * windowMs).toISOString())
      
      if (current > max) {
        return c.json({ error: message }, 429)
      }
      
      await next()
    } catch (error) {
      // If Redis is down, allow the request
      console.error('Rate limiter error:', error)
      await next()
    }
  }
}