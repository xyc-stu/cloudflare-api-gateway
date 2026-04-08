/**
 * Cloudflare API Gateway
 * 
 * A production-ready API Gateway built on Cloudflare Workers
 * Features:
 * - JWT Authentication
 * - Rate Limiting
 * - CORS Support
 * - Request Logging
 * - KV Storage Integration
 * - Error Handling
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import type { Env, Variables } from './types';

// Import middleware
import { apiCors } from './middleware/cors';
import { createLoggerMiddleware } from './middleware/logger';
import { createErrorHandler, createNotFoundHandler } from './middleware/error-handler';

// Import routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import apiRoutes from './routes/api';

// Create Hono app
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use('*', prettyJSON());
app.use('*', createLoggerMiddleware());
app.use('*', apiCors);

// Health check routes (no auth required)
app.route('/health', healthRoutes);

// Authentication routes
app.route('/auth', authRoutes);

// User management routes
app.route('/users', userRoutes);

// General API routes
app.route('/api', apiRoutes);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Cloudflare API Gateway',
    version: '1.0.0',
    description: 'A production-ready API Gateway built on Cloudflare Workers',
    documentation: '/api/docs',
    health: '/health',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.onError(createErrorHandler());
app.notFound(createNotFoundHandler());

// Export for Cloudflare Workers
export default app;

// Also export for ES modules
export { app };
