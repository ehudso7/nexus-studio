import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import type { DeploymentProvider, DeploymentConfig, DeploymentResult, DeploymentStatus } from '../types';

export class VercelProvider implements DeploymentProvider {
  name = 'Vercel';
  private apiToken: string;
  private teamId?: string;
  private apiUrl = 'https://api.vercel.com';

  constructor(apiToken: string, teamId?: string) {
    this.apiToken = apiToken;
    this.teamId = teamId;
  }

  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    try {
      // Create deployment
      const deployment = await this.createDeployment(config);
      
      // Upload files
      await this.uploadFiles(deployment.id, config);
      
      // Finalize deployment
      const result = await this.finalizeDeployment(deployment.id);
      
      return {
        deploymentId: deployment.id,
        url: result.url,
        status: {
          state: 'building',
          message: 'Deployment initiated',
        },
        createdAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Vercel deployment failed: ${error}`);
    }
  }

  async getStatus(deploymentId: string): Promise<DeploymentStatus> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v13/deployments/${deploymentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
          params: this.teamId ? { teamId: this.teamId } : {},
        }
      );

      const deployment = response.data;
      
      return {
        state: this.mapVercelState(deployment.readyState),
        url: deployment.url ? `https://${deployment.url}` : undefined,
        message: deployment.readyState,
      };
    } catch (error) {
      throw new Error(`Failed to get deployment status: ${error}`);
    }
  }

  async rollback(deploymentId: string): Promise<void> {
    // Vercel doesn't support direct rollback, but we can redeploy a previous version
    throw new Error('Rollback not implemented for Vercel');
  }

  async getDomains(projectId: string): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v9/projects/${projectId}/domains`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
          params: this.teamId ? { teamId: this.teamId } : {},
        }
      );

      return response.data.domains.map((d: any) => d.name);
    } catch (error) {
      throw new Error(`Failed to get domains: ${error}`);
    }
  }

  async addDomain(projectId: string, domain: string): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/v10/projects/${projectId}/domains`,
        { name: domain },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          params: this.teamId ? { teamId: this.teamId } : {},
        }
      );
    } catch (error) {
      throw new Error(`Failed to add domain: ${error}`);
    }
  }

  async removeDomain(projectId: string, domain: string): Promise<void> {
    try {
      await axios.delete(
        `${this.apiUrl}/v9/projects/${projectId}/domains/${domain}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
          params: this.teamId ? { teamId: this.teamId } : {},
        }
      );
    } catch (error) {
      throw new Error(`Failed to remove domain: ${error}`);
    }
  }

  private async createDeployment(config: DeploymentConfig): Promise<any> {
    const response = await axios.post(
      `${this.apiUrl}/v13/deployments`,
      {
        name: config.projectName,
        project: config.projectId,
        target: config.environment,
        env: config.envVars,
        buildEnv: config.envVars,
        functions: {},
        routes: [],
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        params: this.teamId ? { teamId: this.teamId } : {},
      }
    );

    return response.data;
  }

  private async uploadFiles(deploymentId: string, config: DeploymentConfig): Promise<void> {
    // In a real implementation, this would upload the generated project files
    // For now, we'll create a simple placeholder
    const files = [
      {
        file: 'index.html',
        data: '<html><body>Nexus Studio Deployment</body></html>',
      },
    ];

    for (const file of files) {
      await axios.post(
        `${this.apiUrl}/v2/deployments/${deploymentId}/files`,
        {
          [file.file]: {
            data: file.data,
            encoding: 'utf-8',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          params: this.teamId ? { teamId: this.teamId } : {},
        }
      );
    }
  }

  private async finalizeDeployment(deploymentId: string): Promise<any> {
    // In Vercel v13 API, deployments are automatically finalized
    return { id: deploymentId, url: `${deploymentId}.vercel.app` };
  }

  private mapVercelState(state: string): DeploymentStatus['state'] {
    switch (state) {
      case 'QUEUED':
      case 'INITIALIZING':
        return 'pending';
      case 'BUILDING':
        return 'building';
      case 'DEPLOYING':
        return 'deploying';
      case 'READY':
        return 'ready';
      case 'ERROR':
      case 'CANCELED':
        return 'error';
      default:
        return 'pending';
    }
  }
}