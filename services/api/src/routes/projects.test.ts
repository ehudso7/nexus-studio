import { describe, it, expect, beforeEach, vi } from 'vitest';
import { projectRoutes } from './projects';
import { createTestUser, createTestProject, generateAuthToken, createMockContext } from '../../../../test/setup';
import { NotFoundError, ConflictError } from '../middleware/error-handler';

describe('Project Routes', () => {
  let testUser: any;
  let authToken: string;
  
  beforeEach(async () => {
    testUser = await createTestUser();
    authToken = generateAuthToken(testUser.id);
  });

  describe('GET /projects', () => {
    it('should return paginated projects for authenticated user', async () => {
      // Create test projects
      await createTestProject(testUser.id, { name: 'Project 1' });
      await createTestProject(testUser.id, { name: 'Project 2' });
      await createTestProject(testUser.id, { name: 'Project 3' });
      
      const ctx = createMockContext({
        get: vi.fn((key) => {
          if (key === 'userId') return testUser.id;
          if (key === 'validatedQuery') return { page: 1, limit: 2, sortBy: 'createdAt', sortOrder: 'desc' };
        }),
      });
      
      const handler = projectRoutes.routes.find(r => r[0] === 'GET' && r[1] === '/')?.[2];
      await handler?.(ctx, async () => {});
      
      expect(ctx.json).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Project 3' }),
          expect.objectContaining({ name: 'Project 2' }),
        ]),
        pagination: {
          page: 1,
          limit: 2,
          total: 3,
          totalPages: 2,
          hasMore: true,
        },
      });
    });

    it('should include public projects from other users', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      await createTestProject(testUser.id, { name: 'My Project' });
      await createTestProject(otherUser.id, { name: 'Public Project', isPublic: true });
      
      const ctx = createMockContext({
        get: vi.fn((key) => {
          if (key === 'userId') return testUser.id;
          if (key === 'validatedQuery') return { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' };
        }),
      });
      
      const handler = projectRoutes.routes.find(r => r[0] === 'GET' && r[1] === '/')?.[2];
      await handler?.(ctx, async () => {});
      
      const response = ctx.json.mock.calls[0][0];
      expect(response.data).toHaveLength(2);
      expect(response.data.map((p: any) => p.name)).toContain('Public Project');
    });
  });

  describe('POST /projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'New Project',
        description: 'Test project',
        type: 'web',
        framework: 'nextjs',
      };
      
      const ctx = createMockContext({
        get: vi.fn((key) => {
          if (key === 'userId') return testUser.id;
          if (key === 'validatedBody') return projectData;
        }),
      });
      
      const handler = projectRoutes.routes.find(r => r[0] === 'POST' && r[1] === '/')?.[2];
      await handler?.(ctx, async () => {});
      
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Project',
          description: 'Test project',
          type: 'web',
          framework: 'nextjs',
          userId: testUser.id,
        }),
        201
      );
    });

    it('should throw ConflictError for duplicate project name', async () => {
      await createTestProject(testUser.id, { name: 'Existing Project' });
      
      const ctx = createMockContext({
        get: vi.fn((key) => {
          if (key === 'userId') return testUser.id;
          if (key === 'validatedBody') return { name: 'Existing Project', type: 'web', framework: 'nextjs' };
        }),
      });
      
      const handler = projectRoutes.routes.find(r => r[0] === 'POST' && r[1] === '/')?.[2];
      
      await expect(handler?.(ctx, async () => {})).rejects.toThrow(ConflictError);
    });
  });

  describe('GET /projects/:projectId', () => {
    it('should return project details for owner', async () => {
      const project = await createTestProject(testUser.id, { name: 'Test Project' });
      
      const ctx = createMockContext({
        get: vi.fn((key) => {
          if (key === 'userId') return testUser.id;
          if (key === 'validatedParams') return { projectId: project.id };
        }),
      });
      
      const handler = projectRoutes.routes.find(r => r[0] === 'GET' && r[1] === '/:projectId')?.[2];
      await handler?.(ctx, async () => {});
      
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: project.id,
          name: 'Test Project',
          userId: testUser.id,
        })
      );
    });

    it('should throw NotFoundError for non-existent project', async () => {
      const ctx = createMockContext({
        get: vi.fn((key) => {
          if (key === 'userId') return testUser.id;
          if (key === 'validatedParams') return { projectId: 'non-existent-id' };
        }),
      });
      
      const handler = projectRoutes.routes.find(r => r[0] === 'GET' && r[1] === '/:projectId')?.[2];
      
      await expect(handler?.(ctx, async () => {})).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for unauthorized access', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const project = await createTestProject(otherUser.id, { name: 'Private Project', isPublic: false });
      
      const ctx = createMockContext({
        get: vi.fn((key) => {
          if (key === 'userId') return testUser.id;
          if (key === 'validatedParams') return { projectId: project.id };
        }),
      });
      
      const handler = projectRoutes.routes.find(r => r[0] === 'GET' && r[1] === '/:projectId')?.[2];
      
      await expect(handler?.(ctx, async () => {})).rejects.toThrow(NotFoundError);
    });
  });

  describe('PATCH /projects/:projectId', () => {
    it('should update project for owner', async () => {
      const project = await createTestProject(testUser.id, { name: 'Original Name' });
      
      const ctx = createMockContext({
        get: vi.fn((key) => {
          if (key === 'userId') return testUser.id;
          if (key === 'validatedParams') return { projectId: project.id };
          if (key === 'validatedBody') return { name: 'Updated Name' };
        }),
      });
      
      const handler = projectRoutes.routes.find(r => r[0] === 'PATCH' && r[1] === '/:projectId')?.[2];
      await handler?.(ctx, async () => {});
      
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: project.id,
          name: 'Updated Name',
        })
      );
    });
  });

  describe('DELETE /projects/:projectId', () => {
    it('should soft delete project for owner', async () => {
      const project = await createTestProject(testUser.id, { name: 'To Delete' });
      
      const ctx = createMockContext({
        get: vi.fn((key) => {
          if (key === 'userId') return testUser.id;
          if (key === 'validatedParams') return { projectId: project.id };
        }),
      });
      
      const handler = projectRoutes.routes.find(r => r[0] === 'DELETE' && r[1] === '/:projectId')?.[2];
      await handler?.(ctx, async () => {});
      
      expect(ctx.json).toHaveBeenCalledWith({ success: true });
      
      // Verify soft delete
      const deletedProject = await global.testPrisma.project.findUnique({
        where: { id: project.id },
      });
      expect(deletedProject?.deletedAt).toBeTruthy();
    });
  });

  describe('POST /projects/:projectId/duplicate', () => {
    it('should duplicate project with components', async () => {
      const project = await createTestProject(testUser.id, { name: 'Original' });
      
      // Create components
      const component1 = await global.testPrisma.component.create({
        data: {
          projectId: project.id,
          name: 'Component 1',
          type: 'div',
          props: {},
        },
      });
      
      const component2 = await global.testPrisma.component.create({
        data: {
          projectId: project.id,
          name: 'Component 2',
          type: 'button',
          props: {},
          parentId: component1.id,
        },
      });
      
      const ctx = createMockContext({
        get: vi.fn((key) => {
          if (key === 'userId') return testUser.id;
          if (key === 'validatedParams') return { projectId: project.id };
        }),
      });
      
      const handler = projectRoutes.routes.find(r => r[0] === 'POST' && r[1] === '/:projectId/duplicate')?.[2];
      await handler?.(ctx, async () => {});
      
      const response = ctx.json.mock.calls[0][0];
      expect(response.name).toBe('Original (Copy)');
      
      // Verify components were duplicated
      const duplicatedComponents = await global.testPrisma.component.findMany({
        where: { projectId: response.id },
      });
      expect(duplicatedComponents).toHaveLength(2);
    });
  });
});