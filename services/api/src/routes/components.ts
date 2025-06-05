import { Hono } from 'hono';
import { prisma } from '@nexus/database';

export const componentRoutes = new Hono();

componentRoutes.get('/', async (c) => {
  const components = await prisma.component.findMany({
    where: { isGlobal: true },
    orderBy: { createdAt: 'desc' },
  });
  
  return c.json(components);
});

componentRoutes.post('/', async (c) => {
  // TODO: Implement component creation
  return c.json({ message: 'Component creation not implemented yet' }, 501);
});