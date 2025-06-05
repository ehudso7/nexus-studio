import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { PluginSandbox } from './sandbox-simple';
import { prisma } from '@nexus/database';
import { requireAuth } from './middleware';

const app = new Hono();
const sandbox = new PluginSandbox();

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Execute plugin
app.post('/execute/:pluginId', requireAuth, async (c) => {
  const pluginId = c.req.param('pluginId');
  const input = await c.req.json();
  
  try {
    // Get plugin from database
    const plugin = await prisma.plugin.findUnique({
      where: { id: pluginId },
    });
    
    if (!plugin) {
      return c.json({ error: 'Plugin not found' }, 404);
    }
    
    // Check permissions
    const user = c.get('user');
    const installation = await prisma.pluginInstallation.findFirst({
      where: {
        pluginId,
        projectId: input.projectId,
        isActive: true,
      },
    });
    
    if (!installation) {
      return c.json({ error: 'Plugin not installed or inactive' }, 403);
    }
    
    // Execute plugin in sandbox
    const result = await sandbox.execute(plugin.code, {
      input: input.data,
      config: installation.config,
      context: {
        userId: user.id,
        projectId: input.projectId,
        permissions: plugin.permissions,
      },
    });
    
    return c.json({ result });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Plugin execution failed' },
      500
    );
  }
});

// Validate plugin code
app.post('/validate', requireAuth, async (c) => {
  const { code } = await c.req.json();
  
  try {
    const validation = await sandbox.validate(code);
    return c.json(validation);
  } catch (error) {
    return c.json(
      { 
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed' 
      },
      400
    );
  }
});

// Get plugin metadata
app.post('/metadata', requireAuth, async (c) => {
  const { code } = await c.req.json();
  
  try {
    const metadata = await sandbox.getMetadata(code);
    return c.json(metadata);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get metadata' },
      400
    );
  }
});

const port = parseInt(process.env.PLUGIN_RUNTIME_PORT || '3003');

serve({
  fetch: app.fetch,
  port,
});

console.log(`Plugin runtime server running on http://localhost:${port}`);