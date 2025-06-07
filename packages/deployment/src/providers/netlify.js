import axios from 'axios';
import FormData from 'form-data';
import archiver from 'archiver';
import { createWriteStream, createReadStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
export class NetlifyProvider {
    name = 'Netlify';
    apiToken;
    apiUrl = 'https://api.netlify.com/api/v1';
    constructor(apiToken) {
        this.apiToken = apiToken;
    }
    async deploy(config) {
        try {
            // Create or get site
            const site = await this.createOrGetSite(config.projectName);
            // Create zip of project files
            const zipPath = await this.createProjectZip(config);
            // Deploy the zip
            const deployment = await this.deployZip(site.id, zipPath);
            // Clean up zip file
            await fs.unlink(zipPath);
            return {
                deploymentId: deployment.id,
                url: deployment.deploy_url || deployment.url,
                status: {
                    state: 'deploying',
                    message: 'Deployment initiated',
                },
                createdAt: new Date(),
            };
        }
        catch (error) {
            throw new Error(`Netlify deployment failed: ${error}`);
        }
    }
    async getStatus(deploymentId) {
        try {
            const response = await axios.get(`${this.apiUrl}/deploys/${deploymentId}`, {
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                },
            });
            const deploy = response.data;
            return {
                state: this.mapNetlifyState(deploy.state),
                url: deploy.deploy_url || deploy.url,
                message: deploy.state,
                error: deploy.error_message,
            };
        }
        catch (error) {
            throw new Error(`Failed to get deployment status: ${error}`);
        }
    }
    async rollback(deploymentId) {
        try {
            // Get the deployment details
            const response = await axios.get(`${this.apiUrl}/deploys/${deploymentId}`, {
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                },
            });
            const siteId = response.data.site_id;
            // Restore this deployment as the current one
            await axios.post(`${this.apiUrl}/sites/${siteId}/deploys/${deploymentId}/restore`, {}, {
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                },
            });
        }
        catch (error) {
            throw new Error(`Failed to rollback deployment: ${error}`);
        }
    }
    async getDomains(projectId) {
        try {
            const response = await axios.get(`${this.apiUrl}/sites/${projectId}`, {
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                },
            });
            const site = response.data;
            return [
                site.default_domain,
                ...(site.domain_aliases || []),
                site.custom_domain,
            ].filter(Boolean);
        }
        catch (error) {
            throw new Error(`Failed to get domains: ${error}`);
        }
    }
    async addDomain(projectId, domain) {
        try {
            await axios.patch(`${this.apiUrl}/sites/${projectId}`, {
                custom_domain: domain,
            }, {
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json',
                },
            });
        }
        catch (error) {
            throw new Error(`Failed to add domain: ${error}`);
        }
    }
    async removeDomain(projectId, domain) {
        try {
            await axios.patch(`${this.apiUrl}/sites/${projectId}`, {
                custom_domain: null,
            }, {
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json',
                },
            });
        }
        catch (error) {
            throw new Error(`Failed to remove domain: ${error}`);
        }
    }
    async createOrGetSite(name) {
        try {
            // Try to get existing site
            const response = await axios.get(`${this.apiUrl}/sites`, {
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                },
                params: {
                    name,
                },
            });
            if (response.data.length > 0) {
                return response.data[0];
            }
        }
        catch (error) {
            // Site doesn't exist, create it
        }
        // Create new site
        const createResponse = await axios.post(`${this.apiUrl}/sites`, {
            name,
        }, {
            headers: {
                Authorization: `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json',
            },
        });
        return createResponse.data;
    }
    async createProjectZip(config) {
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
            // Add netlify.toml for build configuration
            const netlifyConfig = `
[build]
  publish = "${config.buildConfig.outputDirectory || 'dist'}"
  ${config.buildConfig.buildCommand ? `command = "${config.buildConfig.buildCommand}"` : ''}

[build.environment]
${Object.entries(config.envVars)
                .map(([key, value]) => `  ${key} = "${value}"`)
                .join('\n')}
`;
            archive.append(netlifyConfig, { name: 'netlify.toml' });
            archive.finalize();
        });
    }
    async deployZip(siteId, zipPath) {
        const form = new FormData();
        form.append('zip', createReadStream(zipPath));
        const response = await axios.post(`${this.apiUrl}/sites/${siteId}/deploys`, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${this.apiToken}`,
            },
        });
        return response.data;
    }
    mapNetlifyState(state) {
        switch (state) {
            case 'new':
            case 'pending':
            case 'building':
                return 'building';
            case 'deploying':
            case 'processing':
                return 'deploying';
            case 'ready':
                return 'ready';
            case 'error':
            case 'failed':
                return 'error';
            default:
                return 'pending';
        }
    }
}
