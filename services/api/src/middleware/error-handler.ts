import { Context } from 'hono';
import { ZodError } from 'zod';
import { HTTPException } from 'hono/http-exception';

// Custom error classes
export class ValidationError extends Error {
  constructor(public details: any) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super('Too many requests');
    this.name = 'RateLimitError';
  }
}

// Error response interface
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
    timestamp: string;
  };
}

// Generate request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Main error handler middleware
export async function errorHandler(err: Error, c: Context): Promise<Response> {
  const requestId = c.get('requestId') || generateRequestId();
  const timestamp = new Date().toISOString();
  
  // Log error with context
  console.error(`[${timestamp}] [${requestId}] Error:`, {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });

  // Handle different error types
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  if (err instanceof HTTPException) {
    status = err.status;
    code = `HTTP_${status}`;
    message = err.message;
  } else if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid request data';
    details = err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));
  } else if (err instanceof ValidationError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = err.message;
    details = err.details;
  } else if (err instanceof AuthenticationError) {
    status = 401;
    code = 'AUTHENTICATION_ERROR';
    message = err.message;
  } else if (err instanceof AuthorizationError) {
    status = 403;
    code = 'AUTHORIZATION_ERROR';
    message = err.message;
  } else if (err instanceof NotFoundError) {
    status = 404;
    code = 'NOT_FOUND';
    message = err.message;
  } else if (err instanceof ConflictError) {
    status = 409;
    code = 'CONFLICT';
    message = err.message;
  } else if (err instanceof RateLimitError) {
    status = 429;
    code = 'RATE_LIMIT_EXCEEDED';
    message = err.message;
    c.header('Retry-After', err.retryAfter.toString());
  } else if (err.message.includes('duplicate key')) {
    status = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'Resource already exists';
  } else if (err.message.includes('Invalid token')) {
    status = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }

  // In production, don't expose internal error details
  if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'An unexpected error occurred. Please try again later.';
    details = undefined;
  } else if (status === 500) {
    details = {
      error: err.message,
      stack: err.stack?.split('\n'),
    };
  }

  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      details,
      requestId,
      timestamp,
    },
  };

  // Send error to monitoring service in production
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    // Sentry.captureException(err, { extra: { requestId, ...errorResponse } });
  }

  return c.json(errorResponse, status);
}

// Async error wrapper
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw error;
    }
  }) as T;
}

// Request ID middleware
export async function requestIdMiddleware(c: Context, next: () => Promise<void>) {
  const requestId = generateRequestId();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  await next();
}