import { z } from 'zod';

export interface DeploymentProvider {
  name: string;
  deploy(config: DeploymentConfig): Promise<DeploymentResult>;
  getStatus(deploymentId: string): Promise<DeploymentStatus>;
  rollback(deploymentId: string): Promise<void>;
  getDomains(projectId: string): Promise<string[]>;
  addDomain(projectId: string, domain: string): Promise<void>;
  removeDomain(projectId: string, domain: string): Promise<void>;
}

export interface DeploymentConfig {
  projectId: string;
  projectName: string;
  environment: 'development' | 'staging' | 'production';
  buildConfig: BuildConfig;
  envVars: Record<string, string>;
  domains?: string[];
  region?: string;
}

export interface BuildConfig {
  framework: 'nextjs' | 'react' | 'vue' | 'angular' | 'static';
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  nodeVersion?: string;
}

export interface DeploymentResult {
  deploymentId: string;
  url: string;
  status: DeploymentStatus;
  logs?: string;
  createdAt: Date;
}

export interface DeploymentStatus {
  state: 'pending' | 'building' | 'deploying' | 'ready' | 'error' | 'cancelled';
  progress?: number;
  message?: string;
  url?: string;
  error?: string;
}

export interface GeneratedCode {
  files: GeneratedFile[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'text' | 'binary';
}

export const deploymentConfigSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  environment: z.enum(['development', 'staging', 'production']),
  buildConfig: z.object({
    framework: z.enum(['nextjs', 'react', 'vue', 'angular', 'static']),
    buildCommand: z.string().optional(),
    outputDirectory: z.string().optional(),
    installCommand: z.string().optional(),
    nodeVersion: z.string().optional(),
  }),
  envVars: z.record(z.string()),
  domains: z.array(z.string()).optional(),
  region: z.string().optional(),
});