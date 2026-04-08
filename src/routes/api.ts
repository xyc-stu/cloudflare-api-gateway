/**
 * General API routes
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { createResponse, parsePagination, createPagination } from '../utils/helpers';
import { createOptionalAuthMiddleware } from '../middleware/auth';
import { publicRateLimit } from '../middleware/rate-limit';
import { CacheManager } from '../utils/cache';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply optional auth and rate limiting
app.use('*', createOptionalAuthMiddleware());
app.use('*', publicRateLimit());

/**
 * API info endpoint
 */
app.get('/', (c) => {
  return c.json(createResponse({
    name: 'Cloudflare API Gateway',
    version: '1.0.0',
    description: 'A production-ready API Gateway built on Cloudflare Workers',
    documentation: '/api/docs',
    health: '/health',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  }));
});

/**
 * API documentation
 */
app.get('/docs', (c) => {
  return c.json(createResponse({
    overview: 'This API provides a comprehensive set of endpoints for user management, authentication, and general utilities.',
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>',
      endpoints: {
        login: { method: 'POST', path: '/auth/login', description: 'Authenticate and get token' },
        register: { method: 'POST', path: '/auth/register', description: 'Create new account' },
        demoToken: { method: 'GET', path: '/auth/demo-token', description: 'Get demo token for testing' },
      },
    },
    endpoints: {
      health: { method: 'GET', path: '/health', description: 'Health check', auth: false },
      users: {
        me: { method: 'GET', path: '/users/me', description: 'Get current user', auth: true },
        list: { method: 'GET', path: '/users', description: 'List all users (admin only)', auth: true },
        get: { method: 'GET', path: '/users/:id', description: 'Get user by ID', auth: true },
      },
      data: {
        list: { method: 'GET', path: '/api/data', description: 'Get paginated data', auth: false },
        search: { method: 'GET', path: '/api/data/search', description: 'Search data', auth: false },
        stats: { method: 'GET', path: '/api/data/stats', description: 'Get statistics', auth: false },
      },
    },
    rateLimits: {
      public: '1000 requests per minute',
      authenticated: '200 requests per minute',
      auth: '5 requests per 15 minutes',
    },
  }));
});

/**
 * Get paginated data with caching
 */
app.get('/data', async (c) => {
  const url = new URL(c.req.url);
  const { page, limit } = parsePagination(url);
  const cacheKey = `data:${page}:${limit}`;
  
  const cache = new CacheManager(c.env.CACHE_STORE);
  
  // Try to get from cache
  const cached = await cache.get<unknown>(cacheKey);
  if (cached) {
    c.header('X-Cache', 'HIT');
    return c.json(createResponse(cached));
  }
  
  // Generate mock data
  const total = 1000;
  const data = Array.from({ length: limit }, (_, i) => ({
    id: `item-${(page - 1) * limit + i + 1}`,
    name: `Item ${(page - 1) * limit + i + 1}`,
    description: `This is a sample item ${(page - 1) * limit + i + 1}`,
    category: ['electronics', 'clothing', 'food', 'books'][Math.floor(Math.random() * 4)],
    price: Math.floor(Math.random() * 1000) / 10,
    inStock: Math.random() > 0.3,
    createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
  }));
  
  const result = {
    items: data,
    pagination: createPagination(page, limit, total),
  };
  
  // Cache for 5 minutes
  await cache.set(cacheKey, result, { ttl: 300 });
  c.header('X-Cache', 'MISS');
  
  return c.json(createResponse(result, true, {
    pagination: createPagination(page, limit, total),
  }));
});

/**
 * Search data
 */
app.get('/data/search', async (c) => {
  const url = new URL(c.req.url);
  const query = url.searchParams.get('q') || '';
  const category = url.searchParams.get('category');
  
  // Mock search results
  const results = Array.from({ length: 10 }, (_, i) => ({
    id: `result-${i + 1}`,
    title: `Search result ${i + 1} for "${query}"`,
    snippet: `This is a search result snippet containing "${query}"...`,
    category: category || ['electronics', 'clothing', 'food', 'books'][Math.floor(Math.random() * 4)],
    relevance: Math.random(),
  })).sort((a, b) => b.relevance - a.relevance);
  
  return c.json(createResponse({
    query,
    category,
    results,
    total: results.length,
  }));
});

/**
 * Get statistics
 */
app.get('/data/stats', async (c) => {
  const cache = new CacheManager(c.env.CACHE_STORE);
  const cacheKey = 'stats:general';
  
  // Try to get from cache
  const cached = await cache.get<unknown>(cacheKey);
  if (cached) {
    c.header('X-Cache', 'HIT');
    return c.json(createResponse(cached));
  }
  
  const stats = {
    totalUsers: 15420,
    totalItems: 100000,
    totalOrders: 54321,
    revenue: {
      daily: 12500.50,
      weekly: 87650.25,
      monthly: 342100.80,
    },
    categories: [
      { name: 'electronics', count: 25000, percentage: 25 },
      { name: 'clothing', count: 35000, percentage: 35 },
      { name: 'food', count: 20000, percentage: 20 },
      { name: 'books', count: 20000, percentage: 20 },
    ],
    timestamp: new Date().toISOString(),
  };
  
  // Cache for 1 minute
  await cache.set(cacheKey, stats, { ttl: 60 });
  c.header('X-Cache', 'MISS');
  
  return c.json(createResponse(stats));
});

/**
 * Echo endpoint for testing
 */
app.all('/echo', async (c) => {
  const body = c.req.method !== 'GET' && c.req.method !== 'HEAD' 
    ? await c.req.json().catch(() => null)
    : null;
  
  return c.json(createResponse({
    method: c.req.method,
    path: c.req.path,
    query: Object.fromEntries(new URL(c.req.url).searchParams),
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    body,
    user: c.get('user'),
    timestamp: new Date().toISOString(),
  }));
});

/**
 * Time endpoint
 */
app.get('/time', (c) => {
  const now = new Date();
  
  return c.json(createResponse({
    iso: now.toISOString(),
    timestamp: now.getTime(),
    timezone: 'UTC',
    formatted: now.toUTCString(),
  }));
});

/**
 * IP information endpoint
 */
app.get('/ip', (c) => {
  const headers = c.req.raw.headers;
  
  return c.json(createResponse({
    ip: headers.get('CF-Connecting-IP') || 'unknown',
    country: headers.get('CF-IPCountry') || 'unknown',
    city: headers.get('CF-IPCity') || 'unknown',
    timezone: headers.get('CF-Timezone') || 'unknown',
    latitude: headers.get('CF-IPLatitude') || 'unknown',
    longitude: headers.get('CF-IPLongitude') || 'unknown',
    userAgent: headers.get('User-Agent'),
  }));
});

export default app;
