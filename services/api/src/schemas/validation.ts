import { z } from 'zod';

// Common validation patterns
const uuidSchema = z.string().uuid();
const emailSchema = z.string().email();
const urlSchema = z.string().url();

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Project schemas
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  type: z.enum(['web', 'mobile', 'desktop']),
  framework: z.string().min(1).max(50),
  isPublic: z.boolean().default(false),
  settings: z.record(z.any()).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const projectIdSchema = z.object({
  projectId: uuidSchema,
});

// Component schemas
export const createComponentSchema = z.object({
  projectId: uuidSchema,
  name: z.string().min(1).max(100).trim(),
  type: z.string().min(1).max(50),
  props: z.record(z.any()).default({}),
  children: z.array(z.any()).default([]),
  parentId: uuidSchema.optional(),
});

export const updateComponentSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  props: z.record(z.any()).optional(),
  children: z.array(z.any()).optional(),
  parentId: uuidSchema.nullable().optional(),
});

// AI schemas
export const generateComponentSchema = z.object({
  description: z.string().min(10).max(1000),
  projectId: uuidSchema,
  context: z.object({
    framework: z.string(),
    theme: z.string().optional(),
    style: z.string().optional(),
  }),
  options: z.object({
    provider: z.enum(['openai', 'anthropic']).optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
  }).optional(),
});

// Deployment schemas
export const deploymentSchema = z.object({
  projectId: uuidSchema,
  provider: z.enum(['vercel', 'netlify', 'aws', 'custom']),
  environment: z.enum(['development', 'staging', 'production']),
  config: z.record(z.any()),
});

// Plugin schemas
export const installPluginSchema = z.object({
  pluginId: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  projectId: uuidSchema.optional(),
});

// Workflow schemas
export const createWorkflowSchema = z.object({
  projectId: uuidSchema,
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  trigger: z.object({
    type: z.enum(['manual', 'schedule', 'event', 'api']),
    config: z.record(z.any()),
  }),
  steps: z.array(z.object({
    id: z.string(),
    type: z.string(),
    config: z.record(z.any()),
    dependsOn: z.array(z.string()).optional(),
  })),
});

// User schemas
export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  email: emailSchema.optional(),
  avatar: urlSchema.optional(),
  preferences: z.record(z.any()).optional(),
});

// Team schemas
export const createTeamSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  avatar: urlSchema.optional(),
});

export const inviteTeamMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['owner', 'admin', 'editor', 'viewer']),
  teamId: uuidSchema,
});

// Analytics schemas
export const trackEventSchema = z.object({
  event: z.string().min(1).max(100),
  properties: z.record(z.any()).optional(),
  userId: uuidSchema.optional(),
  sessionId: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

// Asset schemas
export const uploadAssetSchema = z.object({
  projectId: uuidSchema,
  type: z.enum(['image', 'video', 'font', 'document', 'other']),
  metadata: z.object({
    filename: z.string(),
    mimeType: z.string(),
    size: z.number().int().positive(),
  }),
});

// Export validation middleware
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (c: any, next: any) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);
      c.set('validatedBody', validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        }, 400);
      }
      return c.json({ error: 'Invalid request body' }, 400);
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return async (c: any, next: any) => {
    try {
      const query = c.req.query();
      const validated = schema.parse(query);
      c.set('validatedQuery', validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        }, 400);
      }
      return c.json({ error: 'Invalid query parameters' }, 400);
    }
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return async (c: any, next: any) => {
    try {
      const params = c.req.param();
      const validated = schema.parse(params);
      c.set('validatedParams', validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        }, 400);
      }
      return c.json({ error: 'Invalid parameters' }, 400);
    }
  };
}