import { prisma } from '@nexus/database';
import { GraphQLError } from 'graphql';
import { redis } from '../server';
import { AuthService } from '@nexus/auth';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

const authService = new AuthService({
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: 10,
});

// Helper to get user from context
function requireAuth(context: any) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
}

export const resolvers = {
  Query: {
    // User queries
    me: async (_: any, __: any, context: any) => {
      const user = requireAuth(context);
      return prisma.user.findUnique({ where: { id: user.id } });
    },

    user: async (_: any, { id }: { id: string }) => {
      return prisma.user.findUnique({ where: { id } });
    },

    users: async (_: any, { limit = 10, offset = 0 }: any) => {
      return prisma.user.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });
    },

    // Project queries
    project: async (_: any, { id }: { id: string }, context: any) => {
      const user = requireAuth(context);
      const project = await prisma.project.findUnique({
        where: { id },
        include: { members: true },
      });

      if (!project) return null;

      // Check if user has access
      const isMember = project.members.some((m) => m.userId === user.id);
      if (!isMember && project.visibility === 'PRIVATE') {
        throw new GraphQLError('Access denied', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      return project;
    },

    projectBySlug: async (_: any, { slug }: { slug: string }) => {
      return prisma.project.findUnique({ where: { slug } });
    },

    projects: async (_: any, args: any, context: any) => {
      const user = requireAuth(context);
      const { ownerId, status, type, limit = 10, offset = 0 } = args;

      return prisma.project.findMany({
        where: {
          ...(ownerId && { ownerId }),
          ...(status && { status }),
          ...(type && { type }),
          OR: [
            { ownerId: user.id },
            { members: { some: { userId: user.id } } },
            { visibility: { in: ['PUBLIC', 'UNLISTED'] } },
          ],
        },
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
      });
    },

    // Page queries
    page: async (_: any, { id }: { id: string }) => {
      return prisma.page.findUnique({
        where: { id },
        include: { seo: true },
      });
    },

    pages: async (_: any, { projectId }: { projectId: string }) => {
      return prisma.page.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      });
    },

    // Component queries
    component: async (_: any, { id }: { id: string }) => {
      return prisma.component.findUnique({ where: { id } });
    },

    components: async (_: any, args: any) => {
      const { projectId, type, isGlobal, limit = 50, offset = 0 } = args;

      return prisma.component.findMany({
        where: {
          ...(projectId && { projectId }),
          ...(type && { type }),
          ...(typeof isGlobal === 'boolean' && { isGlobal }),
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });
    },

    // Asset queries
    asset: async (_: any, { id }: { id: string }) => {
      return prisma.asset.findUnique({ where: { id } });
    },

    assets: async (_: any, { projectId, type }: any) => {
      return prisma.asset.findMany({
        where: {
          projectId,
          ...(type && { type }),
        },
        orderBy: { uploadedAt: 'desc' },
      });
    },

    // Deployment queries
    deployment: async (_: any, { id }: { id: string }) => {
      return prisma.deployment.findUnique({
        where: { id },
        include: { project: true, user: true },
      });
    },

    deployments: async (_: any, args: any) => {
      const { projectId, environment, status, limit = 20, offset = 0 } = args;

      return prisma.deployment.findMany({
        where: {
          ...(projectId && { projectId }),
          ...(environment && { environment }),
          ...(status && { status }),
        },
        take: limit,
        skip: offset,
        orderBy: { startedAt: 'desc' },
        include: { project: true, user: true },
      });
    },

    // Plugin queries
    plugin: async (_: any, { id }: { id: string }) => {
      return prisma.plugin.findUnique({ where: { id } });
    },

    plugins: async (_: any, args: any) => {
      const { category, isPublic, search, limit = 20, offset = 0 } = args;

      return prisma.plugin.findMany({
        where: {
          ...(category && { category }),
          ...(typeof isPublic === 'boolean' && { isPublic }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }),
        },
        take: limit,
        skip: offset,
        orderBy: { downloads: 'desc' },
      });
    },

    // Template queries
    template: async (_: any, { id }: { id: string }) => {
      return prisma.template.findUnique({ where: { id } });
    },

    templates: async (_: any, args: any) => {
      const { category, isFeatured, search, limit = 20, offset = 0 } = args;

      return prisma.template.findMany({
        where: {
          ...(category && { category }),
          ...(typeof isFeatured === 'boolean' && { isFeatured }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }),
        },
        take: limit,
        skip: offset,
        orderBy: { uses: 'desc' },
      });
    },
  },

  Mutation: {
    // Project mutations
    createProject: async (_: any, { input }: any, context: any) => {
      const user = requireAuth(context);
      const { name, description, type, templateId } = input;

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const project = await prisma.project.create({
        data: {
          name,
          slug,
          description,
          type,
          ownerId: user.id,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
      });

      // Create default page
      await prisma.page.create({
        data: {
          projectId: project.id,
          name: 'Home',
          path: '/',
          isHomePage: true,
          content: {},
        },
      });

      pubsub.publish('PROJECT_CREATED', { projectCreated: project });

      return project;
    },

    updateProject: async (_: any, { id, input }: any, context: any) => {
      const user = requireAuth(context);

      // Check permissions
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: id, userId: user.id } },
      });

      if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
        throw new GraphQLError('Insufficient permissions', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const project = await prisma.project.update({
        where: { id },
        data: input,
      });

      pubsub.publish('PROJECT_UPDATED', { projectUpdated: project });

      return project;
    },

    deleteProject: async (_: any, { id }: { id: string }, context: any) => {
      const user = requireAuth(context);

      const project = await prisma.project.findUnique({
        where: { id },
      });

      if (!project || project.ownerId !== user.id) {
        throw new GraphQLError('Only project owner can delete', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      await prisma.project.delete({ where: { id } });

      return true;
    },

    // Page mutations
    createPage: async (_: any, { input }: any, context: any) => {
      const user = requireAuth(context);
      const { projectId, name, path, title, description, isHomePage } = input;

      // Check permissions
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: user.id } },
      });

      if (!member || member.role === 'VIEWER') {
        throw new GraphQLError('Insufficient permissions', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const page = await prisma.page.create({
        data: {
          projectId,
          name,
          path,
          title,
          description,
          isHomePage: isHomePage || false,
          content: {},
        },
      });

      pubsub.publish('PAGE_CREATED', { pageCreated: page });

      return page;
    },

    updatePage: async (_: any, { id, input }: any, context: any) => {
      const user = requireAuth(context);

      const page = await prisma.page.findUnique({
        where: { id },
        include: { project: { include: { members: true } } },
      });

      if (!page) {
        throw new GraphQLError('Page not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Check permissions
      const member = page.project.members.find((m) => m.userId === user.id);
      if (!member || member.role === 'VIEWER') {
        throw new GraphQLError('Insufficient permissions', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const updatedPage = await prisma.page.update({
        where: { id },
        data: {
          ...input,
          ...(input.seo && {
            seo: {
              upsert: {
                create: input.seo,
                update: input.seo,
              },
            },
          }),
        },
      });

      pubsub.publish('PAGE_UPDATED', { pageUpdated: updatedPage });

      return updatedPage;
    },

    // Component mutations
    createComponent: async (_: any, { input }: any, context: any) => {
      const user = requireAuth(context);

      if (input.projectId) {
        // Check project permissions
        const member = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: { projectId: input.projectId, userId: user.id },
          },
        });

        if (!member || member.role === 'VIEWER') {
          throw new GraphQLError('Insufficient permissions', {
            extensions: { code: 'FORBIDDEN' },
          });
        }
      }

      const component = await prisma.component.create({
        data: {
          ...input,
          props: input.props || {},
          styles: input.styles || {},
          events: input.events || {},
          children: [],
        },
      });

      return component;
    },

    // Deployment mutations
    createDeployment: async (_: any, { input }: any, context: any) => {
      const user = requireAuth(context);
      const { projectId, environment } = input;

      // Check permissions
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: user.id } },
      });

      if (!member || member.role === 'VIEWER') {
        throw new GraphQLError('Insufficient permissions', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const deployment = await prisma.deployment.create({
        data: {
          projectId,
          userId: user.id,
          environment,
          status: 'PENDING',
          version: `v${Date.now()}`,
        },
      });

      // Queue deployment job
      await redis.lpush(
        'deployment:queue',
        JSON.stringify({
          deploymentId: deployment.id,
          projectId,
          environment,
        })
      );

      pubsub.publish('DEPLOYMENT_CREATED', { deploymentCreated: deployment });

      return deployment;
    },
  },

  Subscription: {
    projectUpdated: {
      subscribe: (_: any, { id }: { id: string }) => {
        return pubsub.asyncIterator([`PROJECT_UPDATED_${id}`]);
      },
    },

    deploymentStatusChanged: {
      subscribe: (_: any, { projectId }: { projectId: string }) => {
        return pubsub.asyncIterator([`DEPLOYMENT_STATUS_${projectId}`]);
      },
    },
  },

  // Field resolvers
  User: {
    projects: async (user: any) => {
      return prisma.project.findMany({
        where: {
          OR: [
            { ownerId: user.id },
            { members: { some: { userId: user.id } } },
          ],
        },
      });
    },

    apiKeys: async (user: any) => {
      return prisma.apiKey.findMany({
        where: { userId: user.id },
      });
    },
  },

  Project: {
    owner: async (project: any) => {
      return prisma.user.findUnique({ where: { id: project.ownerId } });
    },

    members: async (project: any) => {
      return prisma.projectMember.findMany({
        where: { projectId: project.id },
        include: { user: true },
      });
    },

    pages: async (project: any) => {
      return prisma.page.findMany({
        where: { projectId: project.id },
      });
    },

    components: async (project: any) => {
      return prisma.component.findMany({
        where: { projectId: project.id },
      });
    },

    deployments: async (project: any) => {
      return prisma.deployment.findMany({
        where: { projectId: project.id },
        orderBy: { startedAt: 'desc' },
        take: 10,
      });
    },
  },

  ProjectMember: {
    user: async (member: any) => {
      return member.user || prisma.user.findUnique({ where: { id: member.userId } });
    },
  },

  Deployment: {
    project: async (deployment: any) => {
      return deployment.project || prisma.project.findUnique({ where: { id: deployment.projectId } });
    },

    user: async (deployment: any) => {
      return deployment.user || prisma.user.findUnique({ where: { id: deployment.userId } });
    },
  },

  // Scalar types
  DateTime: {
    serialize: (value: any) => value.toISOString(),
    parseValue: (value: any) => new Date(value),
    parseLiteral: (ast: any) => {
      if (ast.kind === 'StringValue') {
        return new Date(ast.value);
      }
      return null;
    },
  },

  JSON: {
    serialize: (value: any) => value,
    parseValue: (value: any) => value,
    parseLiteral: (ast: any) => {
      if (ast.kind === 'StringValue') {
        return JSON.parse(ast.value);
      }
      return null;
    },
  },
};