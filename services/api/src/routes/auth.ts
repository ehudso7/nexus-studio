import { Hono } from 'hono';
import { AuthService, signInSchema, signUpSchema } from '@nexus/auth';
import { redis } from '../server';

// Ensure JWT_SECRET is set in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

const authService = new AuthService({
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-only-secret-change-in-prod' : ''),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: 10,
});

export const authRoutes = new Hono();

authRoutes.post('/signin', async (c) => {
  try {
    const body = await c.req.json();
    const data = signInSchema.parse(body);
    const session = await authService.signIn(data);
    
    // Store session in Redis
    await redis.setex(
      `session:${session.token}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify(session)
    );
    
    // Set secure httpOnly cookie
    c.header('Set-Cookie', `auth_token=${session.token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`);
    
    // Return user info without token for security
    return c.json({ user: session.user, expiresAt: session.expiresAt });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Invalid credentials' },
      400
    );
  }
});

authRoutes.post('/signup', async (c) => {
  try {
    const body = await c.req.json();
    const data = signUpSchema.parse(body);
    const session = await authService.signUp(data);
    
    // Store session in Redis
    await redis.setex(
      `session:${session.token}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify(session)
    );
    
    // Set secure httpOnly cookie
    c.header('Set-Cookie', `auth_token=${session.token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`);
    
    // Return user info without token for security
    return c.json({ user: session.user, expiresAt: session.expiresAt });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      400
    );
  }
});

authRoutes.post('/signout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'No authorization header' }, 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    await authService.signOut(token);
    
    // Remove session from Redis
    await redis.del(`session:${token}`);
    
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to sign out' },
      400
    );
  }
});

authRoutes.get('/session', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'No authorization header' }, 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Check Redis cache first
    const cachedSession = await redis.get(`session:${token}`);
    if (cachedSession) {
      return c.json(JSON.parse(cachedSession));
    }
    
    const session = await authService.validateSession(token);
    if (!session) {
      return c.json({ error: 'Invalid session' }, 401);
    }
    
    // Cache session
    await redis.setex(
      `session:${token}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify(session)
    );
    
    return c.json(session);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get session' },
      400
    );
  }
});

authRoutes.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const result = await authService.resetPassword(body);
    
    // In production, send email instead of returning token
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to reset password' },
      400
    );
  }
});

authRoutes.get('/oauth/:provider', async (c) => {
  try {
    const provider = c.req.param('provider');
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/${provider}`;
    const state = Math.random().toString(36).substring(7);
    
    // Store state in Redis for verification
    await redis.setex(`oauth:state:${state}`, 300, 'valid'); // 5 minutes
    
    const url = await authService.getOAuthUrl(provider, redirectUri, state);
    return c.redirect(url);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'OAuth error' },
      400
    );
  }
});

authRoutes.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'No authorization header' }, 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    const session = await authService.validateSession(token);
    
    if (!session) {
      return c.json({ error: 'Invalid session' }, 401);
    }
    
    return c.json({ user: session.user });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get user' },
      400
    );
  }
});

authRoutes.get('/oauth/callback/:provider', async (c) => {
  try {
    const provider = c.req.param('provider');
    const code = c.req.query('code');
    const state = c.req.query('state');
    
    if (!code || !state) {
      throw new Error('Missing code or state');
    }
    
    // Verify state
    const validState = await redis.get(`oauth:state:${state}`);
    if (!validState) {
      throw new Error('Invalid state');
    }
    
    // Clean up state
    await redis.del(`oauth:state:${state}`);
    
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/${provider}`;
    const session = await authService.handleOAuthCallback(provider, code, redirectUri);
    
    // Store session in Redis
    await redis.setex(
      `session:${session.token}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify(session)
    );
    
    // Redirect to dashboard with token
    return c.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?token=${session.token}`);
  } catch (error) {
    return c.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/signin?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'OAuth failed'
      )}`
    );
  }
});