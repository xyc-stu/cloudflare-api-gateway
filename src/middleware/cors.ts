/**
 * CORS middleware configuration
 */

import type { MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';

interface CORSConfig {
  origin: string | string[] | ((origin: string) => boolean);
  allowMethods: string[];
  allowHeaders: string[];
  maxAge: number;
  credentials: boolean;
  exposeHeaders: string[];
}

const DEFAULT_CORS_CONFIG: CORSConfig = {
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-API-Key',
    'X-Request-ID',
  ],
  maxAge: 86400, // 24 hours
  credentials: true,
  exposeHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
};

/**
 * Create CORS middleware with custom configuration
 */
export function createCorsMiddleware(config: Partial<CORSConfig> = {}): MiddlewareHandler {
  const corsConfig = { ...DEFAULT_CORS_CONFIG, ...config };
  
  return cors({
    origin: corsConfig.origin,
    allowMethods: corsConfig.allowMethods,
    allowHeaders: corsConfig.allowHeaders,
    maxAge: corsConfig.maxAge,
    credentials: corsConfig.credentials,
    exposeHeaders: corsConfig.exposeHeaders,
  });
}

/**
 * CORS middleware for API routes
 */
export const apiCors = createCorsMiddleware();

/**
 * CORS middleware for public endpoints (more permissive)
 */
export const publicCors = createCorsMiddleware({
  origin: '*',
  credentials: false,
});

/**
 * CORS middleware for admin endpoints (more restrictive)
 */
export const adminCors = createCorsMiddleware({
  origin: (origin) => {
    // Allow specific origins for admin
    const allowedOrigins = [
      'https://admin.example.com',
      'http://localhost:3000',
    ];
    return allowedOrigins.includes(origin);
  },
  credentials: true,
});
