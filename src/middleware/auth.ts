/**
 * Authentication middleware
 */

import type { MiddlewareHandler } from 'hono';
import type { Env, Variables, User } from '../types';
import { extractToken, verifyJWT, payloadToUser, hasRole } from '../utils/jwt';
import { UnauthorizedException, ForbiddenException } from '../utils/errors';

/**
 * JWT authentication middleware
 */
export function createAuthMiddleware(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header required');
    }
    
    try {
      const token = extractToken(authHeader);
      const payload = await verifyJWT(token);
      const user = payloadToUser(payload);
      
      // Set user in context
      c.set('user', user);
      
      await next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid authentication token');
    }
  };
}

/**
 * Optional authentication middleware (sets user if token exists, but doesn't require it)
 */
export function createOptionalAuthMiddleware(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    
    if (authHeader) {
      try {
        const token = extractToken(authHeader);
        const payload = await verifyJWT(token);
        const user = payloadToUser(payload);
        c.set('user', user);
      } catch {
        // Ignore errors for optional auth
      }
    }
    
    await next();
  };
}

/**
 * Role-based authorization middleware
 */
export function requireRole(requiredRole: 'admin' | 'user' | 'guest'): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return async (c, next) => {
    const user = c.get('user');
    
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    
    if (!hasRole(user, requiredRole)) {
      throw new ForbiddenException(`Required role: ${requiredRole}`);
    }
    
    await next();
  };
}

/**
 * Admin-only middleware
 */
export function requireAdmin(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return requireRole('admin');
}

/**
 * API Key authentication middleware (alternative to JWT)
 */
export function createApiKeyMiddleware(validKeys: string[]): MiddlewareHandler {
  return async (c, next) => {
    const apiKey = c.req.header('X-API-Key');
    
    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }
    
    if (!validKeys.includes(apiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }
    
    await next();
  };
}
