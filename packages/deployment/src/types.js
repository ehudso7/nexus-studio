import { z } from 'zod';
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
