import { Context, Next } from 'hono';
import { verifyToken } from '@nexus/auth';
import { prisma } from '@nexus/database';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return await next();
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const payload = verifyToken(
      token,
      process.env.JWT_SECRET || 'change-this-secret'
    );
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    
    if (user) {
      c.set('user', user);
    }
  } catch (error) {
    // Invalid token, continue without user
  }
  
  await next();
}

export function requireAuth(c: Context) {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  
  return user;
}

export function requireRole(roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    await next();
  };
}