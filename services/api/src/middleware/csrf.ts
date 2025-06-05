import { MiddlewareHandler } from 'hono';
import crypto from 'crypto';
import { redis } from '../server';

const CSRF_HEADER = 'X-CSRF-Token';
const CSRF_COOKIE = 'csrf_token';
const CSRF_TOKEN_LENGTH = 32;

// Generate CSRF token
function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

// CSRF protection middleware
export const csrf: MiddlewareHandler = async (c, next) => {
  const method = c.req.method;
  
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }
  
  // Skip CSRF for public auth endpoints
  const path = c.req.path;
  if (path === '/api/auth/signin' || path === '/api/auth/signup') {
    return next();
  }
  
  // Get CSRF token from header
  const headerToken = c.req.header(CSRF_HEADER);
  
  // Get CSRF token from cookie
  const cookieHeader = c.req.header('Cookie');
  const cookieToken = cookieHeader
    ?.split(';')
    .find(cookie => cookie.trim().startsWith(`${CSRF_COOKIE}=`))
    ?.split('=')[1];
  
  // Validate tokens match
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return c.json({ error: 'CSRF token validation failed' }, 403);
  }
  
  // Verify token exists in Redis (to prevent token fixation)
  const isValid = await redis.get(`csrf:${headerToken}`);
  if (!isValid) {
    return c.json({ error: 'Invalid CSRF token' }, 403);
  }
  
  await next();
};

// Middleware to generate and set CSRF token
export const generateCSRF: MiddlewareHandler = async (c, next) => {
  // Only generate for GET requests to specific endpoints
  if (c.req.method === 'GET' && c.req.path === '/api/auth/csrf') {
    const token = generateCSRFToken();
    
    // Store in Redis with expiration
    await redis.setex(`csrf:${token}`, 3600, '1'); // 1 hour expiration
    
    // Set cookie
    c.header('Set-Cookie', `${CSRF_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`);
    
    // Return token in response for client to use in headers
    return c.json({ token });
  }
  
  await next();
};