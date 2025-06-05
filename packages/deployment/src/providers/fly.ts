import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import type { DeploymentProvider, DeploymentConfig, DeploymentResult, DeploymentStatus } from '../types';

export class FlyProvider implements DeploymentProvider {
  name = 'Fly.io';
  private apiToken: string;
  private apiUrl = 'https://api.fly.io/graphql';

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    try {
      // Create or get app
      const app = await this.createOrGetApp(config.projectName);
      
      // Create fly.toml configuration
      await this.createFlyConfig(config);
      
      // Deploy using Fly CLI (in production, this would use the Fly Machines API)
      const deployment = await this.deployApp(app.name, config);
      
      return {
        deploymentId: deployment.id,
        url: `https://${app.name}.fly.dev`,
        status: {
          state: 'deploying',
          message: 'Deployment initiated',
        },
        createdAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Fly.io deployment failed: ${error}`);
    }
  }

  async getStatus(deploymentId: string): Promise<DeploymentStatus> {
    try {
      const query = `
        query GetDeployment($id: ID!) {
          node(id: $id) {
            ... on Release {
              id
              status
              deploymentStatus
              inProgress
              reason
              description
            }
          }
        }
      `;

      const response = await axios.post(
        this.apiUrl,
        {
          query,
          variables: { id: deploymentId },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const release = response.data.data.node;
      
      return {
        state: this.mapFlyState(release.status, release.inProgress),
        message: release.description || release.reason,
      };
    } catch (error) {
      throw new Error(`Failed to get deployment status: ${error}`);
    }
  }

  async rollback(deploymentId: string): Promise<void> {
    // Fly.io doesn't have direct rollback via API
    // You would typically use fly deploy with a previous image
    throw new Error('Rollback not implemented for Fly.io');
  }

  async getDomains(projectId: string): Promise<string[]> {
    try {
      const query = `
        query GetApp($name: String!) {
          app(name: $name) {
            certificates {
              nodes {
                hostname
              }
            }
            hostname
          }
        }
      `;

      const response = await axios.post(
        this.apiUrl,
        {
          query,
          variables: { name: projectId },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const app = response.data.data.app;
      const domains = [app.hostname];
      
      if (app.certificates?.nodes) {
        domains.push(...app.certificates.nodes.map((cert: any) => cert.hostname));
      }
      
      return domains;
    } catch (error) {
      throw new Error(`Failed to get domains: ${error}`);
    }
  }

  async addDomain(projectId: string, domain: string): Promise<void> {
    try {
      const mutation = `
        mutation CreateCertificate($appId: ID!, $hostname: String!) {
          createCertificate(appId: $appId, hostname: $hostname) {
            certificate {
              id
              hostname
            }
          }
        }
      `;

      await axios.post(
        this.apiUrl,
        {
          query: mutation,
          variables: { appId: projectId, hostname: domain },
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
      const mutation = `
        mutation DeleteCertificate($appId: ID!, $hostname: String!) {
          deleteCertificate(appId: $appId, hostname: $hostname) {
            app {
              id
            }
          }
        }
      `;

      await axios.post(
        this.apiUrl,
        {
          query: mutation,
          variables: { appId: projectId, hostname: domain },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      throw new Error(`Failed to remove domain: ${error}`);
    }
  }

  private async createOrGetApp(name: string): Promise<any> {
    try {
      const query = `
        query GetApp($name: String!) {
          app(name: $name) {
            id
            name
            organization {
              id
              slug
            }
          }
        }
      `;

      const response = await axios.post(
        this.apiUrl,
        {
          query,
          variables: { name },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.data.app) {
        return response.data.data.app;
      }
    } catch (error) {
      // App doesn't exist, create it
    }

    // Create new app
    const createMutation = `
      mutation CreateApp($name: String!, $organizationId: ID!) {
        createApp(name: $name, organizationId: $organizationId) {
          app {
            id
            name
          }
        }
      }
    `;

    // First get the default organization
    const orgResponse = await axios.post(
      this.apiUrl,
      {
        query: `query { personalOrganization { id } }`,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const orgId = orgResponse.data.data.personalOrganization.id;

    const createResponse = await axios.post(
      this.apiUrl,
      {
        query: createMutation,
        variables: { name, organizationId: orgId },
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return createResponse.data.data.createApp.app;
  }

  private async createFlyConfig(config: DeploymentConfig): Promise<void> {
    const flyConfig = `
app = "${config.projectName}"

[build]
  ${config.buildConfig.buildCommand ? `[build.args]\n    BUILD_COMMAND = "${config.buildConfig.buildCommand}"` : ''}

[env]
${Object.entries(config.envVars)
  .map(([key, value]) => `  ${key} = "${value}"`)
  .join('\n')}

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [services.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20
`;

    // In production, this would be written to the deployment directory
    // For now, we'll just return the config
  }

  private async deployApp(appName: string, config: DeploymentConfig): Promise<any> {
    // In production, this would use the Fly Machines API to create a deployment
    // For now, return a mock deployment
    return {
      id: `dep_${Date.now()}`,
      status: 'in_progress',
    };
  }

  private mapFlyState(status: string, inProgress: boolean): DeploymentStatus['state'] {
    if (inProgress) {
      return 'deploying';
    }

    switch (status) {
      case 'succeeded':
      case 'success':
        return 'ready';
      case 'failed':
      case 'error':
        return 'error';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'pending';
    }
  }
}