/**
 * Domain Lock - Ensures NexStudio runs only on nexstudio.dev
 */

const ALLOWED_DOMAINS = [
  'nexstudio.dev',
  'www.nexstudio.dev',
  'api.nexstudio.dev',
  'app.nexstudio.dev'
];

const ALLOWED_HOSTS_DEV = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0'
];

export function isDomainAllowed(hostname: string): boolean {
  // Allow development hosts
  if (process.env.NODE_ENV === 'development') {
    const host = hostname.split(':')[0]; // Remove port
    return ALLOWED_HOSTS_DEV.includes(host);
  }
  
  // Production: only allow nexstudio.dev domains
  return ALLOWED_DOMAINS.some(domain => 
    hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

export function enforceDoaminAccess(req: Request): void {
  const url = new URL(req.url);
  const hostname = url.hostname;
  
  if (!isDomainAllowed(hostname)) {
    throw new Error(`Access denied. NexStudio is only available at https://nexstudio.dev`);
  }
}

// Next.js Middleware
export function domainMiddleware(req: Request): Response | null {
  try {
    enforceDoaminAccess(req);
    return null; // Continue
  } catch (error) {
    return new Response('Access Denied. Visit https://nexstudio.dev', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        'X-Robots-Tag': 'noindex, nofollow'
      }
    });
  }
}

// Express/Hono Middleware
export function createDomainLockMiddleware() {
  return async (c: any, next: any) => {
    const hostname = c.req.header('host') || '';
    
    if (!isDomainAllowed(hostname)) {
      return c.text('Access Denied. Visit https://nexstudio.dev', 403);
    }
    
    await next();
  };
}

// Environment check
export function validateEnvironment(): void {
  if (process.env.NODE_ENV === 'production') {
    const requiredEnvVars = [
      'NEXT_PUBLIC_APP_URL',
      'DATABASE_URL',
      'JWT_SECRET'
    ];
    
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Ensure URLs point to nexstudio.dev
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    if (!appUrl.includes('nexstudio.dev')) {
      throw new Error('NEXT_PUBLIC_APP_URL must be a nexstudio.dev domain');
    }
  }
}