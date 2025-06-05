import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { prisma } from '@nexus/database';
import { AIAssistant } from '@nexus/ai-assistant';
import { rateLimiter } from '../middleware/rateLimiter';

const ai = new Hono();
const assistant = new AIAssistant();

// Apply auth middleware to all routes
ai.use('*', requireAuth);

// Apply rate limiting for AI endpoints
ai.use('*', rateLimiter({ limit: 20, window: 60 }));

// Generate component from description
const generateComponentSchema = z.object({
  description: z.string().min(10).max(500),
  projectId: z.string().cuid(),
  provider: z.enum(['openai', 'anthropic']).optional(),
  model: z.string().optional(),
});

ai.post('/generate-component', async (c) => {
  const userId = c.get('userId');
  const body = generateComponentSchema.parse(await c.req.json());

  // Get project to understand context
  const project = await prisma.project.findFirst({
    where: {
      id: body.projectId,
      team: {
        members: {
          some: { userId },
        },
      },
    },
    include: {
      components: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  try {
    const component = await assistant.generateComponent(
      body.description,
      {
        projectType: project.type,
        existingComponents: project.components,
        designSystem: project.metadata?.designSystem,
      },
      {
        provider: body.provider,
        model: body.model,
      }
    );

    // Save the generated component
    const savedComponent = await prisma.component.create({
      data: {
        ...component,
        projectId: project.id,
        category: 'AI Generated',
      },
    });

    return c.json({ component: savedComponent });
  } catch (error) {
    console.error('AI generation error:', error);
    return c.json(
      { error: 'Failed to generate component' },
      500
    );
  }
});

// Optimize code
const optimizeCodeSchema = z.object({
  code: z.string().min(1).max(10000),
  optimizationGoals: z.array(z.string()).min(1),
  provider: z.enum(['openai', 'anthropic']).optional(),
});

ai.post('/optimize-code', async (c) => {
  const body = optimizeCodeSchema.parse(await c.req.json());

  try {
    const optimizedCode = await assistant.optimizeCode(
      body.code,
      body.optimizationGoals,
      { provider: body.provider }
    );

    return c.json({ optimizedCode });
  } catch (error) {
    console.error('Code optimization error:', error);
    return c.json(
      { error: 'Failed to optimize code' },
      500
    );
  }
});

// Generate page layout
const generateLayoutSchema = z.object({
  description: z.string().min(10).max(500),
  projectId: z.string().cuid(),
  componentIds: z.array(z.string()).optional(),
  provider: z.enum(['openai', 'anthropic']).optional(),
});

ai.post('/generate-layout', async (c) => {
  const userId = c.get('userId');
  const body = generateLayoutSchema.parse(await c.req.json());

  // Get components
  const components = body.componentIds
    ? await prisma.component.findMany({
        where: {
          id: { in: body.componentIds },
          projectId: body.projectId,
        },
      })
    : await prisma.component.findMany({
        where: { projectId: body.projectId },
        take: 20,
      });

  try {
    const layout = await assistant.generatePageLayout(
      body.description,
      components,
      { provider: body.provider }
    );

    return c.json({ layout });
  } catch (error) {
    console.error('Layout generation error:', error);
    return c.json(
      { error: 'Failed to generate layout' },
      500
    );
  }
});

// Convert design to code
const convertDesignSchema = z.object({
  designData: z.any(),
  targetFramework: z.enum(['react', 'vue', 'angular']),
  provider: z.enum(['openai', 'anthropic']).optional(),
});

ai.post('/convert-design', async (c) => {
  const body = convertDesignSchema.parse(await c.req.json());

  try {
    const code = await assistant.convertDesign(
      body.designData,
      body.targetFramework,
      { provider: body.provider }
    );

    return c.json({ code });
  } catch (error) {
    console.error('Design conversion error:', error);
    return c.json(
      { error: 'Failed to convert design' },
      500
    );
  }
});

// Generate from screenshot
const generateFromScreenshotSchema = z.object({
  imageUrl: z.string().url(),
  projectId: z.string().cuid(),
});

ai.post('/generate-from-screenshot', async (c) => {
  const userId = c.get('userId');
  const body = generateFromScreenshotSchema.parse(await c.req.json());

  // Verify project access
  const project = await prisma.project.findFirst({
    where: {
      id: body.projectId,
      team: {
        members: {
          some: { userId },
        },
      },
    },
  });

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  try {
    const result = await assistant.generateFromScreenshot(body.imageUrl);

    // Save generated components
    const savedComponents = await Promise.all(
      result.components.map(comp =>
        prisma.component.create({
          data: {
            ...comp,
            projectId: project.id,
            category: 'AI Generated',
          },
        })
      )
    );

    return c.json({
      components: savedComponents,
      layout: result.layout,
    });
  } catch (error) {
    console.error('Screenshot generation error:', error);
    return c.json(
      { error: 'Failed to generate from screenshot' },
      500
    );
  }
});

// Explain code
const explainCodeSchema = z.object({
  code: z.string().min(1).max(5000),
  provider: z.enum(['openai', 'anthropic']).optional(),
});

ai.post('/explain-code', async (c) => {
  const body = explainCodeSchema.parse(await c.req.json());

  try {
    const explanation = await assistant.explainCode(
      body.code,
      { provider: body.provider }
    );

    return c.json({ explanation });
  } catch (error) {
    console.error('Code explanation error:', error);
    return c.json(
      { error: 'Failed to explain code' },
      500
    );
  }
});

// Generate tests
const generateTestsSchema = z.object({
  componentId: z.string().cuid(),
  testFramework: z.enum(['jest', 'vitest', 'cypress']),
  provider: z.enum(['openai', 'anthropic']).optional(),
});

ai.post('/generate-tests', async (c) => {
  const body = generateTestsSchema.parse(await c.req.json());

  const component = await prisma.component.findUnique({
    where: { id: body.componentId },
  });

  if (!component) {
    return c.json({ error: 'Component not found' }, 404);
  }

  try {
    const tests = await assistant.generateTests(
      component,
      body.testFramework,
      { provider: body.provider }
    );

    return c.json({ tests });
  } catch (error) {
    console.error('Test generation error:', error);
    return c.json(
      { error: 'Failed to generate tests' },
      500
    );
  }
});

// Analyze performance
const analyzePerformanceSchema = z.object({
  code: z.string().min(1).max(10000),
  provider: z.enum(['openai', 'anthropic']).optional(),
});

ai.post('/analyze-performance', async (c) => {
  const body = analyzePerformanceSchema.parse(await c.req.json());

  try {
    const analysis = await assistant.analyzePerformance(
      body.code,
      { provider: body.provider }
    );

    return c.json({ analysis });
  } catch (error) {
    console.error('Performance analysis error:', error);
    return c.json(
      { error: 'Failed to analyze performance' },
      500
    );
  }
});

// Suggest project improvements
const suggestImprovementsSchema = z.object({
  projectId: z.string().cuid(),
  provider: z.enum(['openai', 'anthropic']).optional(),
});

ai.post('/suggest-improvements', async (c) => {
  const userId = c.get('userId');
  const body = suggestImprovementsSchema.parse(await c.req.json());

  const project = await prisma.project.findFirst({
    where: {
      id: body.projectId,
      team: {
        members: {
          some: { userId },
        },
      },
    },
    include: {
      pages: { take: 20 },
      components: { take: 50 },
    },
  });

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  try {
    const suggestions = await assistant.suggestImprovements(
      project,
      { provider: body.provider }
    );

    return c.json({ suggestions });
  } catch (error) {
    console.error('Improvement suggestion error:', error);
    return c.json(
      { error: 'Failed to suggest improvements' },
      500
    );
  }
});

export { ai };