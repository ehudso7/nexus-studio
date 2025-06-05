import { Context } from 'hono'
import { ZodError } from 'zod'

export function errorHandler(err: Error, c: Context) {
  console.error('API Error:', err)
  
  if (err instanceof ZodError) {
    return c.json({
      error: 'Validation error',
      details: err.errors,
    }, 400)
  }
  
  if (err.message.includes('Unique constraint')) {
    return c.json({
      error: 'Resource already exists',
    }, 409)
  }
  
  if (err.message.includes('Record to delete does not exist')) {
    return c.json({
      error: 'Resource not found',
    }, 404)
  }
  
  // Default error
  return c.json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  }, 500)
}