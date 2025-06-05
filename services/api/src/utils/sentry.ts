import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Context } from 'hono';

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      // Automatic instrumentation
      ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
      new ProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Release tracking
    release: process.env.npm_package_version,
    // Error filtering
    beforeSend(event, hint) {
      // Filter out non-critical errors in production
      if (process.env.NODE_ENV === 'production') {
        // Ignore client-side errors
        if (event.exception?.values?.[0]?.type === 'NetworkError') {
          return null;
        }
        // Ignore specific status codes
        const statusCode = hint.originalException?.status;
        if (statusCode && [404, 401, 403].includes(statusCode)) {
          return null;
        }
      }
      return event;
    },
    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb) {
      // Don't log sensitive data
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
      // Sanitize URLs
      if (breadcrumb.data?.url) {
        breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url);
      }
      return breadcrumb;
    },
  });
}

// Sentry middleware for Hono
export function sentryMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    const transaction = Sentry.startTransaction({
      op: 'http.server',
      name: `${c.req.method} ${c.req.path}`,
    });

    // Set transaction on context
    Sentry.getCurrentHub().configureScope(scope => {
      scope.setSpan(transaction);
      scope.setContext('request', {
        method: c.req.method,
        url: c.req.url,
        headers: sanitizeHeaders(c.req.header()),
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
      });

      // Add user context if available
      const userId = c.get('userId');
      if (userId) {
        scope.setUser({ id: userId });
      }

      // Add request ID
      const requestId = c.get('requestId');
      if (requestId) {
        scope.setTag('request_id', requestId);
      }
    });

    try {
      await next();
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    } finally {
      transaction.setHttpStatus(c.res.status);
      transaction.finish();
    }
  };
}

// Capture specific events
export function captureError(error: Error, context?: any) {
  Sentry.withScope(scope => {
    if (context) {
      scope.setContext('additional', context);
    }
    Sentry.captureException(error);
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: any) {
  Sentry.withScope(scope => {
    if (context) {
      scope.setContext('additional', context);
    }
    Sentry.captureMessage(message, level);
  });
}

export function capturePerformance(name: string, duration: number, data?: any) {
  const transaction = Sentry.startTransaction({
    name,
    op: 'custom',
    data,
  });
  
  setTimeout(() => {
    transaction.finish();
  }, duration);
}

// Helper functions
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove sensitive query parameters
    const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth'];
    sensitiveParams.forEach(param => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[REDACTED]');
      }
    });
    return parsed.toString();
  } catch {
    return url;
  }
}

function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

// Custom error types for better tracking
export class BusinessError extends Error {
  constructor(message: string, public code: string, public context?: any) {
    super(message);
    this.name = 'BusinessError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public errors: any[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class IntegrationError extends Error {
  constructor(public service: string, message: string, public statusCode?: number) {
    super(`${service}: ${message}`);
    this.name = 'IntegrationError';
  }
}