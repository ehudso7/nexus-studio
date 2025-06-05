// Environment configuration helper
// This centralizes all environment variables and provides type safety

const getEnvVar = (key: string, fallback?: string): string => {
  if (typeof window === 'undefined') {
    // Server-side
    return process.env[key] || fallback || ''
  }
  // Client-side
  return process.env[`NEXT_PUBLIC_${key}`] || fallback || ''
}

export const env = {
  // App
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_URL: getEnvVar('APP_URL', 'http://localhost:3000'),
  APP_NAME: getEnvVar('APP_NAME', 'NexStudio'),
  
  // API
  API_URL: getEnvVar('API_URL', 'http://localhost:3001'),
  GRAPHQL_URL: getEnvVar('GRAPHQL_URL', 'http://localhost:3001/graphql'),
  
  // Auth
  JWT_SECRET: process.env.JWT_SECRET || 'nexstudio-jwt-secret-change-in-production',
  SESSION_SECRET: process.env.SESSION_SECRET || 'nexstudio-session-secret-change-in-production',
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // External Services
  VERCEL_TOKEN: process.env.VERCEL_TOKEN || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  
  // Feature Flags
  ENABLE_AI_ASSISTANT: getEnvVar('ENABLE_AI_ASSISTANT', 'false') === 'true',
  ENABLE_REALTIME_COLLAB: getEnvVar('ENABLE_REALTIME_COLLAB', 'false') === 'true',
  ENABLE_DEPLOYMENT: getEnvVar('ENABLE_DEPLOYMENT', 'false') === 'true',
  
  // Analytics
  VERCEL_ANALYTICS_ID: getEnvVar('VERCEL_ANALYTICS_ID', ''),
  GA_TRACKING_ID: getEnvVar('GA_TRACKING_ID', ''),
  
  // Development
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const

// Type for environment variables
export type Env = typeof env

// Validate required environment variables
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file'
    )
  }
}