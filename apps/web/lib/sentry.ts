import * as Sentry from '@sentry/nextjs';
import { CaptureConsole } from '@sentry/integrations';

export function initSentry() {
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
  
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Integrations
    integrations: [
      new Sentry.BrowserTracing({
        // Set sampling rate for performance monitoring
        tracingOrigins: ['localhost', process.env.NEXT_PUBLIC_APP_URL, /^\//],
        // Capture interactions
        routingInstrumentation: Sentry.nextRouterInstrumentation,
      }),
      new Sentry.Replay({
        // Capture 10% of all sessions in production
        sessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        // Capture 100% of sessions with errors
        errorSampleRate: 1.0,
        // Mask sensitive content
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: false,
      }),
      new CaptureConsole({
        levels: ['error', 'warn'],
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    
    // Error filtering
    beforeSend(event, hint) {
      // Filter out non-critical errors
      if (process.env.NODE_ENV === 'production') {
        // Ignore browser extension errors
        if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
          frame => frame.filename?.includes('extension://')
        )) {
          return null;
        }
        
        // Ignore common third-party errors
        const error = hint.originalException;
        if (error && error instanceof Error) {
          if (
            error.message?.includes('ResizeObserver loop limit exceeded') ||
            error.message?.includes('Non-Error promise rejection captured')
          ) {
            return null;
          }
        }
      }
      
      // Add user context
      if (typeof window !== 'undefined') {
        const user = getUserFromStorage();
        if (user) {
          event.user = {
            id: user.id,
            email: user.email,
            username: user.name,
          };
        }
      }
      
      return event;
    },
    
    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb, hint) {
      // Don't log sensitive data
      if (breadcrumb.type === 'navigation' && breadcrumb.data?.to?.includes('/api/')) {
        breadcrumb.data.to = sanitizeUrl(breadcrumb.data.to);
      }
      
      // Skip debug logs
      if (breadcrumb.level === 'debug') {
        return null;
      }
      
      return breadcrumb;
    },
  });
}

// Error boundary for React components
export function SentryErrorBoundary({ children, fallback }: { 
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}) {
  return (
    <Sentry.ErrorBoundary fallback={fallback} showDialog>
      {children}
    </Sentry.ErrorBoundary>
  );
}

// Capture specific events
export function captureException(error: Error, context?: any) {
  Sentry.withScope(scope => {
    if (context) {
      scope.setContext('additional', context);
    }
    Sentry.captureException(error);
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

export function setUserContext(user: { id: string; email?: string; name?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

export function clearUserContext() {
  Sentry.setUser(null);
}

// Performance monitoring
export function measurePerformance(name: string, fn: () => void | Promise<void>) {
  const transaction = Sentry.startTransaction({ name });
  Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));
  
  const execute = async () => {
    try {
      await fn();
      transaction.setStatus('ok');
    } catch (error) {
      transaction.setStatus('internal_error');
      throw error;
    } finally {
      transaction.finish();
    }
  };
  
  return execute();
}

// Custom hooks
export function useSentryUser() {
  return {
    setUser: setUserContext,
    clearUser: clearUserContext,
  };
}

// Helper functions
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
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

function getUserFromStorage() {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

// Profiling for specific operations
export function profileOperation(name: string, operation: string) {
  const profiler = Sentry.startTransaction({
    name,
    op: operation,
  });
  
  return {
    finish: () => profiler.finish(),
    setData: (key: string, value: any) => profiler.setData(key, value),
    setStatus: (status: string) => profiler.setStatus(status),
  };
}