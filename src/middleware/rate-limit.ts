/**
 * Rate limiting middleware
 */

import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../types';
import { createRateLimiter, RateLimitPresets } from '../utils/rate-limiter';
import { getClientIP } from '../utils/helpers';
import { RateLimitException } from '../utils/errors';

interface RateLimitMiddlewareConfig {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (c: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Create rate limiting middleware
 */
export function createRateLimitMiddleware(
  config: RateLimitMiddlewareConfig = {}
): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return async (c, next) => {
    const limiter = createRateLimiter(c.env.RATE_LIMIT_STORE, {
      windowMs: config.windowMs || RateLimitPresets.standard.windowMs,
      maxRequests: config.maxRequests || RateLimitPresets.standard.maxRequests,
      skipSuccessfulRequests: config.skipSuccessfulRequests,
    });
    
    // Generate rate limit key
    let key: string;
    if (config.keyGenerator) {
      key = config.keyGenerator(c);
    } else {
      // Use user ID if authenticated, otherwise use IP
      const user = c.get('user');
      const clientIP = getClientIP(c.req.raw);
      key = user ? `user:${user.id}` : `ip:${clientIP}`;
    }
    
    try {
      const rateLimitInfo = await limiter.check(key);
      
      // Add rate limit headers
      c.header('X-RateLimit-Limit', rateLimitInfo.limit.toString());
      c.header('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
      c.header('X-RateLimit-Reset', rateLimitInfo.reset.toString());
      c.header('X-RateLimit-Window', `${rateLimitInfo.window}ms`);
      
      await next();
    } catch (error) {
      if (error instanceof RateLimitException) {
        c.header('Retry-After', error.retryAfter.toString());
      }
      throw error;
    }
  };
}

/**
 * Rate limit middleware for authentication endpoints
 */
export function authRateLimit(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return createRateLimitMiddleware({
    windowMs: RateLimitPresets.auth.windowMs,
    maxRequests: RateLimitPresets.auth.maxRequests,
    keyGenerator: (c) => `auth:${getClientIP(c.req.raw)}`,
  });
}

/**
 * Rate limit middleware for public endpoints
 */
export function publicRateLimit(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return createRateLimitMiddleware({
    windowMs: RateLimitPresets.public.windowMs,
    maxRequests: RateLimitPresets.public.maxRequests,
  });
}

/**
 * Rate limit middleware for admin endpoints
 */
export function adminRateLimit(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return createRateLimitMiddleware({
    windowMs: RateLimitPresets.admin.windowMs,
    maxRequests: RateLimitPresets.admin.maxRequests,
    keyGenerator: (c) => {
      const user = c.get('user');
      return user ? `admin:${user.id}` : `admin:${getClientIP(c.req.raw)}`;
    },
  });
}
