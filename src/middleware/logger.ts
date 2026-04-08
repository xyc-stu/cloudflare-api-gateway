/**
 * Request logging middleware
 */

import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../types';
import { generateRequestId, getClientIP, calculateDuration, sanitizeForLogging } from '../utils/helpers';

interface LogEntry {
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  query?: string;
  clientIP: string;
  userAgent?: string;
  referer?: string;
  statusCode: number;
  duration: number;
  contentLength?: number;
  userId?: string;
  error?: string;
}

/**
 * Create logging middleware
 */
export function createLoggerMiddleware(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return async (c, next) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Set request ID in context
    c.set('requestId', requestId);
    c.set('startTime', startTime);
    
    // Add request ID header to response
    c.header('X-Request-ID', requestId);
    
    // Log request start
    const request = c.req;
    const url = new URL(request.url);
    
    console.log(JSON.stringify({
      level: 'info',
      type: 'request_start',
      requestId,
      timestamp: new Date().toISOString(),
      method: request.method,
      path: url.pathname,
      query: url.search,
      clientIP: getClientIP(request.raw),
      userAgent: request.header('User-Agent'),
    }));
    
    try {
      await next();
      
      // Log request completion
      const duration = calculateDuration(startTime);
      const statusCode = c.res.status;
      const user = c.get('user');
      
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        requestId,
        method: request.method,
        path: url.pathname,
        query: url.search || undefined,
        clientIP: getClientIP(request.raw),
        userAgent: request.header('User-Agent') || undefined,
        referer: request.header('Referer') || undefined,
        statusCode,
        duration,
        contentLength: parseInt(c.res.headers.get('Content-Length') || '0') || undefined,
        userId: user?.id,
      };
      
      // Log based on status code
      if (statusCode >= 500) {
        console.error(JSON.stringify({
          level: 'error',
          type: 'request_complete',
          ...logEntry,
        }));
      } else if (statusCode >= 400) {
        console.warn(JSON.stringify({
          level: 'warn',
          type: 'request_complete',
          ...logEntry,
        }));
      } else {
        console.log(JSON.stringify({
          level: 'info',
          type: 'request_complete',
          ...logEntry,
        }));
      }
    } catch (error) {
      // Log error
      const duration = calculateDuration(startTime);
      
      console.error(JSON.stringify({
        level: 'error',
        type: 'request_error',
        timestamp: new Date().toISOString(),
        requestId,
        method: request.method,
        path: url.pathname,
        clientIP: getClientIP(request.raw),
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }));
      
      throw error;
    }
  };
}

/**
 * Simple request logger (less verbose)
 */
export function createSimpleLogger(): MiddlewareHandler {
  return async (c, next) => {
    const startTime = Date.now();
    
    await next();
    
    const duration = Date.now() - startTime;
    const url = new URL(c.req.url);
    
    console.log(`${c.req.method} ${url.pathname} - ${c.res.status} - ${duration}ms`);
  };
}
