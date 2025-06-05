import axios from 'axios';
import FormData from 'form-data';
import archiver from 'archiver';
import { createWriteStream, createReadStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import type { DeploymentProvider, DeploymentConfig, DeploymentResult, DeploymentStatus } from '../types';

export class CloudflareProvider implements DeploymentProvider {
  name = 'Cloudflare Pages';
  private apiToken: string;
  private accountId: string;
  private apiUrl = 'https://api.cloudflare.com/client/v4';

  constructor(apiToken: string, accountId: string) {
    this.apiToken = apiToken;
    this.accountId = accountId;
  }

  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    try {
      // Create or get project
      const project = await this.createOrGetProject(config.projectName);
      
      // Create deployment
      const deployment = await this.createDeployment(project.name, config);
      
      return {
        deploymentId: deployment.id,
        url: deployment.url,
        status: {
          state: 'building',
          message: 'Deployment initiated',
        },
        createdAt: new Date(deployment.created_on),
      };
    } catch (error) {
      throw new Error(`Cloudflare deployment failed: ${error}`);
    }
  }

  async getStatus(deploymentId: string): Promise<DeploymentStatus> {
    try {
      // Parse project name and deployment ID
      const [projectName, actualDeploymentId] = deploymentId.split(':');
      
      const response = await axios.get(
        `${this.apiUrl}/accounts/${this.accountId}/pages/projects/${projectName}/deployments/${actualDeploymentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        }
      );

      const deployment = response.data.result;
      
      return {
        state: this.mapCloudflareState(deployment.latest_stage.status),
        url: deployment.url,
        message: deployment.latest_stage.name,
        progress: this.calculateProgress(deployment),
      };
    } catch (error) {
      throw new Error(`Failed to get deployment status: ${error}`);
    }
  }

  async rollback(deploymentId: string): Promise<void> {
    try {
      const [projectName] = deploymentId.split(':');
      
      // Cloudflare doesn't have direct rollback, but we can redeploy a previous version
      // by creating a new deployment from a previous one
      await axios.post(
        `${this.apiUrl}/accounts/${this.accountId}/pages/projects/${projectName}/deployments/${deploymentId}/retry`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        }
      );
    } catch (error) {
      throw new Error(`Failed to rollback deployment: ${error}`);
    }
  }

  async getDomains(projectId: string): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/accounts/${this.accountId}/pages/projects/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        }
      );

      const project = response.data.result;
      return [
        `${project.subdomain}.pages.dev`,
        ...(project.domains || []),
      ];
    } catch (error) {
      throw new Error(`Failed to get domains: ${error}`);
    }
  }

  async addDomain(projectId: string, domain: string): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/accounts/${this.accountId}/pages/projects/${projectId}/domains`,
        {
          domain,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      throw new Error(`Failed to add domain: ${error}`);
    }
  }

  async removeDomain(projectId: string, domain: string): Promise<void> {
    try {
      await axios.delete(
        `${this.apiUrl}/accounts/${this.accountId}/pages/projects/${projectId}/domains/${domain}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        }
      );
    } catch (error) {
      throw new Error(`Failed to remove domain: ${error}`);
    }
  }

  private async createOrGetProject(name: string): Promise<any> {
    try {
      // Try to get existing project
      const response = await axios.get(
        `${this.apiUrl}/accounts/${this.accountId}/pages/projects/${name}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        }
      );

      return response.data.result;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Project doesn't exist, create it
        const createResponse = await axios.post(
          `${this.apiUrl}/accounts/${this.accountId}/pages/projects`,
          {
            name,
            production_branch: 'main',
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        return createResponse.data.result;
      }
      throw error;
    }
  }

  private async createDeployment(projectName: string, config: DeploymentConfig): Promise<any> {
    // Create form data for deployment
    const form = new FormData();
    
    // Add manifest
    form.append('manifest', JSON.stringify({
      build_config: {
        build_command: config.buildConfig.buildCommand || 'npm run build',
        destination_dir: config.buildConfig.outputDirectory || 'dist',
        root_dir: '',
      },
      env_vars: config.envVars,
    }));

    // Add files (placeholder for now)
    const zipPath = await this.createProjectZip(config);
    form.append('zipfile', createReadStream(zipPath));

    const response = await axios.post(
      `${this.apiUrl}/accounts/${this.accountId}/pages/projects/${projectName}/deployments`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.apiToken}`,
        },
      }
    );

    // Clean up
    await fs.unlink(zipPath);

    const deployment = response.data.result;
    return {
      id: `${projectName}:${deployment.id}`,
      url: deployment.url,
      created_on: deployment.created_on,
      latest_stage: deployment.latest_stage,
    };
  }

  private async createProjectZip(config: DeploymentConfig): Promise<string> {
    const zipPath = path.join('/tmp', `${config.projectId}-${Date.now()}.zip`);
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => resolve(zipPath));
      archive.on('error', reject);
      
      archive.pipe(output);
      
      // Add project files (placeholder for now)
      archive.append('<html><body>Nexus Studio Deployment</body></html>', {
        name: 'index.html',
      });
      
      archive.finalize();
    });
  }

  private mapCloudflareState(status: string): DeploymentStatus['state'] {
    switch (status) {
      case 'active':
      case 'success':
        return 'ready';
      case 'failure':
      case 'failed':
        return 'error';
      case 'canceled':
        return 'cancelled';
      default:
        return 'building';
    }
  }

  private calculateProgress(deployment: any): number {
    const stages = ['initializing', 'building', 'deploying', 'finalizing'];
    const currentStageIndex = stages.indexOf(deployment.latest_stage.name);
    
    if (currentStageIndex === -1) return 0;
    if (deployment.latest_stage.status === 'success') return 100;
    
    return Math.round(((currentStageIndex + 1) / stages.length) * 100);
  }
}