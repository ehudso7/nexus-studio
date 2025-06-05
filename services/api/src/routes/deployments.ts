import { Hono } from 'hono';
import { prisma } from '@nexus/database';
import { DeploymentManager } from '@nexus/deployment';
import { requireAuth } from '../middleware/auth';

export const deploymentRoutes = new Hono();

const deploymentManager = new DeploymentManager();

deploymentRoutes.get('/', async (c) => {
  const user = requireAuth(c);
  if (!user) return user;

  const deployments = await prisma.deployment.findMany({
    where: {
      project: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
    },
    orderBy: { startedAt: 'desc' },
    include: {
      project: true,
      user: true,
    },
  });
  
  return c.json(deployments);
});

deploymentRoutes.post('/', async (c) => {
  const user = requireAuth(c);
  if (!user) return user;

  try {
    const body = await c.req.json();
    const { projectId, provider, environment } = body;

    // Validate user has permission
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
    });

    if (!member || member.role === 'VIEWER') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Validate provider
    const validProviders = ['vercel', 'netlify', 'cloudflare', 'fly'];
    if (!validProviders.includes(provider)) {
      return c.json({ error: 'Invalid deployment provider' }, 400);
    }

    // Validate environment
    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(environment)) {
      return c.json({ error: 'Invalid environment' }, 400);
    }

    // Trigger deployment
    const result = await deploymentManager.deploy(
      projectId,
      provider,
      environment as any
    );

    return c.json(result);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Deployment failed' },
      500
    );
  }
});

deploymentRoutes.get('/:id', async (c) => {
  const user = requireAuth(c);
  if (!user) return user;

  const id = c.req.param('id');
  
  const deployment = await prisma.deployment.findUnique({
    where: { id },
    include: {
      project: true,
      user: true,
    },
  });

  if (!deployment) {
    return c.json({ error: 'Deployment not found' }, 404);
  }

  // Check permissions
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: deployment.projectId, userId: user.id },
    },
  });

  if (!member && deployment.project.visibility === 'PRIVATE') {
    return c.json({ error: 'Access denied' }, 403);
  }

  return c.json(deployment);
});

deploymentRoutes.get('/:id/status', async (c) => {
  const user = requireAuth(c);
  if (!user) return user;

  const id = c.req.param('id');

  try {
    const status = await deploymentManager.getDeploymentStatus(id);
    return c.json(status);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      500
    );
  }
});

deploymentRoutes.post('/:id/rollback', async (c) => {
  const user = requireAuth(c);
  if (!user) return user;

  const id = c.req.param('id');

  const deployment = await prisma.deployment.findUnique({
    where: { id },
    include: { project: true },
  });

  if (!deployment) {
    return c.json({ error: 'Deployment not found' }, 404);
  }

  // Check permissions
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: deployment.projectId, userId: user.id },
    },
  });

  if (!member || !['ADMIN', 'OWNER'].includes(member.role)) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }

  try {
    await deploymentManager.rollbackDeployment(id);
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Rollback failed' },
      500
    );
  }
});

deploymentRoutes.delete('/:id', async (c) => {
  const user = requireAuth(c);
  if (!user) return user;

  const id = c.req.param('id');

  const deployment = await prisma.deployment.findUnique({
    where: { id },
    include: { project: true },
  });

  if (!deployment) {
    return c.json({ error: 'Deployment not found' }, 404);
  }

  // Check permissions
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: deployment.projectId, userId: user.id },
    },
  });

  if (!member || !['ADMIN', 'OWNER'].includes(member.role)) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }

  await prisma.deployment.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(),
    },
  });

  return c.json({ success: true });
});