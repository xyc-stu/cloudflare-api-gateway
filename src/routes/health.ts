/**
 * Health check routes
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { createResponse } from '../utils/helpers';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Basic health check
 */
app.get('/', (c) => {
  return c.json(createResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: c.env.ENVIRONMENT,
  }));
});

/**
 * Detailed health check with system info
 */
app.get('/detailed', (c) => {
  const requestId = c.get('requestId');
  
  return c.json(createResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: c.env.ENVIRONMENT,
    apiVersion: c.env.API_VERSION,
    requestId,
    system: {
      platform: 'Cloudflare Workers',
      runtime: 'V8 Isolate',
    },
  }));
});

/**
 * Readiness check
 */
app.get('/ready', async (c) => {
  try {
    // Check KV connectivity
    await c.env.RATE_LIMIT_STORE.get('health-check');
    
    return c.json(createResponse({
      ready: true,
      checks: {
        kv: 'ok',
      },
    }));
  } catch (error) {
    return c.json(createResponse({
      ready: false,
      checks: {
        kv: 'error',
      },
    }), 503);
  }
});

/**
 * Liveness check
 */
app.get('/live', (c) => {
  return c.json(createResponse({
    alive: true,
  }));
});

export default app;
