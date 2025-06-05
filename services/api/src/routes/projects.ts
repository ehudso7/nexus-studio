import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '@nexus/database'

const projects = new Hono()

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  template: z.string().optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  settings: z.record(z.any()).optional(),
})

// List projects
projects.get('/', async (c) => {
  const userId = c.get('userId')
  
  try {
    const userProjects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            collaborators: {
              some: { userId },
            },
          },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            collaborators: true,
            pages: true,
            deployments: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
    
    return c.json(userProjects)
  } catch (error) {
    console.error('List projects error:', error)
    return c.json({ error: 'Failed to list projects' }, 500)
  }
})

// Get project by ID
projects.get('/:id', async (c) => {
  const projectId = c.req.param('id')
  const userId = c.get('userId')
  
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { isPublic: true },
          {
            collaborators: {
              some: { userId },
            },
          },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        pages: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            components: true,
            assets: true,
            deployments: true,
          },
        },
      },
    })
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404)
    }
    
    return c.json(project)
  } catch (error) {
    console.error('Get project error:', error)
    return c.json({ error: 'Failed to get project' }, 500)
  }
})

// Create project
projects.post('/', async (c) => {
  const userId = c.get('userId')
  
  try {
    const body = await c.req.json()
    const data = createProjectSchema.parse(body)
    
    // Generate unique slug
    let slug = data.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    
    // Check if slug exists
    let suffix = 0
    while (true) {
      const existing = await prisma.project.findUnique({
        where: { slug: suffix > 0 ? `${slug}-${suffix}` : slug },
      })
      if (!existing) break
      suffix++
    }
    
    if (suffix > 0) {
      slug = `${slug}-${suffix}`
    }
    
    const project = await prisma.project.create({
      data: {
        ...data,
        slug,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
    
    // Create default home page
    await prisma.page.create({
      data: {
        projectId: project.id,
        name: 'Home',
        path: '/',
        isHomePage: true,
      },
    })
    
    // Log activity
    await prisma.activity.create({
      data: {
        projectId: project.id,
        userId,
        type: 'PROJECT_CREATED',
        entityType: 'project',
        entityId: project.id,
      },
    })
    
    return c.json(project, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid input', details: error.errors }, 400)
    }
    console.error('Create project error:', error)
    return c.json({ error: 'Failed to create project' }, 500)
  }
})

// Update project
projects.patch('/:id', async (c) => {
  const projectId = c.req.param('id')
  const userId = c.get('userId')
  
  try {
    // Check ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
    })
    
    if (!project) {
      return c.json({ error: 'Project not found or unauthorized' }, 404)
    }
    
    const body = await c.req.json()
    const data = updateProjectSchema.parse(body)
    
    const updated = await prisma.project.update({
      where: { id: projectId },
      data,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
    
    // Log activity
    await prisma.activity.create({
      data: {
        projectId,
        userId,
        type: 'PROJECT_UPDATED',
        entityType: 'project',
        entityId: projectId,
        metadata: data,
      },
    })
    
    return c.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid input', details: error.errors }, 400)
    }
    console.error('Update project error:', error)
    return c.json({ error: 'Failed to update project' }, 500)
  }
})

// Delete project
projects.delete('/:id', async (c) => {
  const projectId = c.req.param('id')
  const userId = c.get('userId')
  
  try {
    // Check ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
    })
    
    if (!project) {
      return c.json({ error: 'Project not found or unauthorized' }, 404)
    }
    
    // Delete project (cascades to related entities)
    await prisma.project.delete({
      where: { id: projectId },
    })
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Delete project error:', error)
    return c.json({ error: 'Failed to delete project' }, 500)
  }
})

// Deploy project
projects.post('/:id/deploy', async (c) => {
  const projectId = c.req.param('id')
  const userId = c.get('userId')
  
  try {
    // Check ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
    })
    
    if (!project) {
      return c.json({ error: 'Project not found or unauthorized' }, 404)
    }
    
    const body = await c.req.json()
    const { provider = 'vercel' } = body
    
    // Create deployment record
    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        provider,
        status: 'PENDING',
      },
    })
    
    // TODO: Trigger actual deployment process
    // This would typically involve:
    // 1. Generating the project code
    // 2. Creating a build
    // 3. Uploading to the provider
    // 4. Updating deployment status
    
    // Log activity
    await prisma.activity.create({
      data: {
        projectId,
        userId,
        type: 'DEPLOYMENT_STARTED',
        entityType: 'deployment',
        entityId: deployment.id,
      },
    })
    
    return c.json(deployment, 202)
  } catch (error) {
    console.error('Deploy project error:', error)
    return c.json({ error: 'Failed to deploy project' }, 500)
  }
})

export default projects'validatedParams');
    
    const original = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        components: true,
      },
    });
    
    if (!original) {
      throw new NotFoundError('Project');
    }
    
    // Check access
    const hasAccess = original.userId === userId || original.isPublic;
    if (!hasAccess) {
      throw new NotFoundError('Project');
    }
    
    // Create duplicate
    const duplicate = await prisma.project.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        type: original.type,
        framework: original.framework,
        settings: original.settings,
        userId,
        metadata: {
          createdBy: userId,
          duplicatedFrom: projectId,
          version: '1.0.0',
        },
      },
    });
    
    // Duplicate components
    if (original.components.length > 0) {
      const componentMapping = new Map<string, string>();
      
      // First pass: create all components
      for (const component of original.components) {
        const newComponent = await prisma.component.create({
          data: {
            projectId: duplicate.id,
            name: component.name,
            type: component.type,
            props: component.props,
            styles: component.styles,
            // parentId will be set in second pass
          },
        });
        componentMapping.set(component.id, newComponent.id);
      }
      
      // Second pass: update parent relationships
      for (const component of original.components) {
        if (component.parentId && componentMapping.has(component.parentId)) {
          await prisma.component.update({
            where: { id: componentMapping.get(component.id)! },
            data: { parentId: componentMapping.get(component.parentId) },
          });
        }
      }
    }
    
    log.audit('Project duplicated', userId, { 
      originalId: projectId, 
      duplicateId: duplicate.id 
    });
    
    return c.json(duplicate, 201);
  }
);