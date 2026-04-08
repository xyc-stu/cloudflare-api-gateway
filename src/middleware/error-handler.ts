/**
 * Global error handling middleware
 */

import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../types';
import { ApiException } from '../utils/errors';
import { createErrorResponse } from '../utils/helpers';

/**
 * Global error handler middleware
 */
export function createErrorHandler(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return async (c, next) => {
    try {
      await next();
    } catch (error) {
      const requestId = c.get('requestId') || 'unknown';
      
      // Handle known API exceptions
      if (error instanceof ApiException) {
        const response = createErrorResponse(
          error.code,
          error.message,
          error.details,
          requestId
        );
        
        return c.json(response, error.statusCode as any);
      }
      
      // Handle unknown errors
      console.error('Unhandled error:', error);
      
      const isDevelopment = c.env.ENVIRONMENT === 'development';
      
      const response = createErrorResponse(
        'INTERNAL_ERROR',
        'An unexpected error occurred',
        isDevelopment && error instanceof Error
          ? { message: error.message, stack: error.stack }
          : undefined,
        requestId
      );
      
      return c.json(response, 500);
    }
  };
}

/**
 * Not found handler
 */
export function createNotFoundHandler(): MiddlewareHandler {
  return (c) => {
    const requestId = c.get('requestId') || 'unknown';
    
    const response = createErrorResponse(
      'NOT_FOUND',
      `Route not found: ${c.req.method} ${c.req.path}`,
      undefined,
      requestId
    );
    
    return c.json(response, 404);
  };
}
