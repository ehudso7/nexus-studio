import { prisma } from '@nexus/database';
import { VercelProvider } from './providers/vercel';
import { NetlifyProvider } from './providers/netlify';
import { CloudflareProvider } from './providers/cloudflare';
import { FlyProvider } from './providers/fly';
import { CodeGenerator } from './code-generator';
import type { DeploymentProvider, DeploymentConfig, DeploymentResult } from './types';

export class DeploymentManager {
  private providers: Map<string, DeploymentProvider>;
  private codeGenerator: CodeGenerator;

  constructor() {
    this.providers = new Map();
    this.codeGenerator = new CodeGenerator();
    
    // Initialize providers based on environment variables
    if (process.env.VERCEL_API_TOKEN) {
      this.providers.set(
        'vercel',
        new VercelProvider(
          process.env.VERCEL_API_TOKEN,
          process.env.VERCEL_TEAM_ID
        )
      );
    }
    
    if (process.env.NETLIFY_API_TOKEN) {
      this.providers.set(
        'netlify',
        new NetlifyProvider(process.env.NETLIFY_API_TOKEN)
      );
    }
    
    if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
      this.providers.set(
        'cloudflare',
        new CloudflareProvider(
          process.env.CLOUDFLARE_API_TOKEN,
          process.env.CLOUDFLARE_ACCOUNT_ID
        )
      );
    }
    
    if (process.env.FLY_API_TOKEN) {
      this.providers.set(
        'fly',
        new FlyProvider(process.env.FLY_API_TOKEN)
      );
    }
  }

  async deploy(
    projectId: string,
    provider: string,
    environment: 'development' | 'staging' | 'production'
  ): Promise<DeploymentResult> {
    const deploymentProvider = this.providers.get(provider);
    if (!deploymentProvider) {
      throw new Error(`Deployment provider ${provider} not configured`);
    }

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        pages: true,
        components: true,
        assets: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Generate code for the project
    const generatedCode = await this.codeGenerator.generateProject(project);

    // Create deployment record
    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        userId: project.ownerId,
        environment,
        status: 'PENDING',
        version: `v${Date.now()}`,
      },
    });

    try {
      // Prepare deployment config
      const config: DeploymentConfig = {
        projectId: project.id,
        projectName: project.slug,
        environment,
        buildConfig: {
          framework: this.detectFramework(project.type),
          buildCommand: 'npm run build',
          outputDirectory: 'dist',
          installCommand: 'npm install',
          nodeVersion: '18',
        },
        envVars: {
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
          // Add other env vars as needed
        },
      };

      // Deploy to provider
      const result = await deploymentProvider.deploy(config);

      // Update deployment record
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: 'BUILDING',
          url: result.url,
          metadata: {
            deploymentId: result.deploymentId,
            provider,
          },
        },
      });

      // Start monitoring deployment status
      this.monitorDeployment(deployment.id, provider, result.deploymentId);

      return result;
    } catch (error) {
      // Update deployment record with error
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Deployment failed',
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  async getDeploymentStatus(deploymentId: string): Promise<any> {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    const metadata = deployment.metadata as any;
    const provider = this.providers.get(metadata.provider);
    
    if (!provider) {
      throw new Error('Deployment provider not found');
    }

    return provider.getStatus(metadata.deploymentId);
  }

  async rollbackDeployment(deploymentId: string): Promise<void> {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    const metadata = deployment.metadata as any;
    const provider = this.providers.get(metadata.provider);
    
    if (!provider) {
      throw new Error('Deployment provider not found');
    }

    await provider.rollback(metadata.deploymentId);

    // Update deployment record
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });
  }

  private async monitorDeployment(
    deploymentId: string,
    providerName: string,
    providerDeploymentId: string
  ): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) return;

    const checkStatus = async () => {
      try {
        const status = await provider.getStatus(providerDeploymentId);
        
        const deployment = await prisma.deployment.findUnique({
          where: { id: deploymentId },
        });

        if (!deployment || deployment.status === 'SUCCESS' || deployment.status === 'FAILED') {
          return; // Stop monitoring
        }

        // Map provider status to our status
        let ourStatus: any = 'BUILDING';
        if (status.state === 'ready') {
          ourStatus = 'SUCCESS';
        } else if (status.state === 'error' || status.state === 'cancelled') {
          ourStatus = 'FAILED';
        } else if (status.state === 'deploying') {
          ourStatus = 'DEPLOYING';
        }

        // Update deployment record
        await prisma.deployment.update({
          where: { id: deploymentId },
          data: {
            status: ourStatus,
            url: status.url || deployment.url,
            error: status.error,
            completedAt: ourStatus === 'SUCCESS' || ourStatus === 'FAILED' ? new Date() : null,
          },
        });

        // Continue monitoring if not finished
        if (ourStatus !== 'SUCCESS' && ourStatus !== 'FAILED') {
          setTimeout(checkStatus, 5000); // Check again in 5 seconds
        }
      } catch (error) {
        console.error('Error monitoring deployment:', error);
      }
    };

    // Start monitoring
    setTimeout(checkStatus, 5000);
  }

  private detectFramework(projectType: string): DeploymentConfig['buildConfig']['framework'] {
    // In a real implementation, this would analyze the project to detect the framework
    switch (projectType) {
      case 'WEB':
        return 'react';
      case 'MOBILE':
        return 'react'; // React Native
      default:
        return 'static';
    }
  }
}