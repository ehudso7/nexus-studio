import winston from 'winston';
import { Context } from 'hono';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Format for development
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    info => `${info.timestamp} ${info.level}: ${info.message} ${
      info.metadata ? JSON.stringify(info.metadata, null, 2) : ''
    }`
  )
);

// Format for production (JSON)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
  }));
}

// Request logger middleware
export function requestLogger(): any {
  return async (c: Context, next: () => Promise<void>) => {
    const start = Date.now();
    const requestId = c.get('requestId');
    
    // Log request
    logger.http('Incoming request', {
      metadata: {
        requestId,
        method: c.req.method,
        path: c.req.path,
        query: c.req.query(),
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
      },
    });
    
    try {
      await next();
      
      // Log response
      const duration = Date.now() - start;
      logger.http('Request completed', {
        metadata: {
          requestId,
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          duration: `${duration}ms`,
        },
      });
      
      // Log slow requests
      if (duration > 1000) {
        logger.warn('Slow request detected', {
          metadata: {
            requestId,
            method: c.req.method,
            path: c.req.path,
            duration: `${duration}ms`,
          },
        });
      }
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Request failed', {
        metadata: {
          requestId,
          method: c.req.method,
          path: c.req.path,
          duration: `${duration}ms`,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
          } : error,
        },
      });
      throw error;
    }
  };
}

// Structured logging helpers
export const log = {
  error: (message: string, meta?: any) => logger.error(message, { metadata: meta }),
  warn: (message: string, meta?: any) => logger.warn(message, { metadata: meta }),
  info: (message: string, meta?: any) => logger.info(message, { metadata: meta }),
  debug: (message: string, meta?: any) => logger.debug(message, { metadata: meta }),
  
  // Business event logging
  event: (event: string, properties?: any) => {
    logger.info(`Event: ${event}`, {
      metadata: {
        event,
        properties,
        timestamp: new Date().toISOString(),
      },
    });
  },
  
  // Performance logging
  perf: (operation: string, duration: number, meta?: any) => {
    logger.info(`Performance: ${operation}`, {
      metadata: {
        operation,
        duration: `${duration}ms`,
        ...meta,
      },
    });
  },
  
  // Security event logging
  security: (event: string, meta?: any) => {
    logger.warn(`Security: ${event}`, {
      metadata: {
        securityEvent: event,
        ...meta,
        timestamp: new Date().toISOString(),
      },
    });
  },
  
  // Audit logging
  audit: (action: string, userId: string, meta?: any) => {
    logger.info(`Audit: ${action}`, {
      metadata: {
        audit: true,
        action,
        userId,
        ...meta,
        timestamp: new Date().toISOString(),
      },
    });
  },
};

// Create child logger for specific modules
export function createLogger(module: string) {
  return {
    error: (message: string, meta?: any) => log.error(`[${module}] ${message}`, meta),
    warn: (message: string, meta?: any) => log.warn(`[${module}] ${message}`, meta),
    info: (message: string, meta?: any) => log.info(`[${module}] ${message}`, meta),
    debug: (message: string, meta?: any) => log.debug(`[${module}] ${message}`, meta),
  };
}