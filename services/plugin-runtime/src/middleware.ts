import { Context, Next } from 'hono';
import { verifyToken } from '@nexus/auth';

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization required' }, 401);
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const payload = verifyToken(
      token,
      process.env.JWT_SECRET || 'change-this-secret'
    );
    
    c.set('user', payload);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
}