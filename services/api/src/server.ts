import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth';
import { projectRoutes } from './routes/projects';
import { componentRoutes } from './routes/components';
import { deploymentRoutes } from './routes/deployments';
import { ai } from './routes/ai';
import { createYoga } from 'graphql-yoga';
import { schema } from './graphql/schema';
import { authMiddleware } from './middleware/auth';
import Redis from 'ioredis';

const app = new Hono();

// Redis client
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Middleware
app.use('*', logger());

// CORS middleware
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') || 'http://localhost:3000';
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', process.env.NEXT_PUBLIC_APP_URL].filter(Boolean);
  
  if (allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
  }
  
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }
  
  await next();
});

// Auth middleware
app.use('*', authMiddleware);

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// REST Routes
app.route('/auth', authRoutes);
app.route('/projects', projectRoutes);
app.route('/components', componentRoutes);
app.route('/deployments', deploymentRoutes);
app.route('/ai', ai);

// GraphQL endpoint
const yoga = createYoga({
  schema,
  context: async ({ request }) => {
    // Get user from Hono context
    const honoContext = (request as any).honoContext;
    const user = honoContext?.get('user');
    
    return {
      request,
      user,
    };
  },
});

app.on(['GET', 'POST'], '/graphql', async (c) => {
  // Attach Hono context to request
  (c.req.raw as any).honoContext = c;
  
  const response = await yoga.handleRequest(c.req.raw, {
    request: c.req.raw,
    params: c.req.param(),
  });
  
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
});

const port = parseInt(process.env.PORT || '3001');

serve({
  fetch: app.fetch,
  port,
});

console.log(`API server running on http://localhost:${port}`);
console.log(`GraphQL endpoint: http://localhost:${port}/graphql`);