/**
 * Authentication routes
 */

import { Hono } from 'hono';
import type { Env, Variables, User } from '../types';
import { signJWT, generateDemoToken } from '../utils/jwt';
import { createResponse } from '../utils/helpers';
import { BadRequestException, UnauthorizedException } from '../utils/errors';
import { authRateLimit } from '../middleware/rate-limit';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply rate limiting to auth routes
app.use('*', authRateLimit());

/**
 * Login endpoint
 */
app.post('/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  
  if (!body.email || !body.password) {
    throw new BadRequestException('Email and password required');
  }
  
  // In production, validate against database
  // This is a demo implementation
  if (body.password !== 'demo123') {
    throw new UnauthorizedException('Invalid credentials');
  }
  
  const user: User = {
    id: `user-${Date.now()}`,
    email: body.email,
    role: 'user',
    createdAt: new Date().toISOString(),
  };
  
  const token = await signJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    iss: c.env.JWT_ISSUER,
    aud: c.env.JWT_AUDIENCE,
  }, c.env, 86400);
  
  return c.json(createResponse({
    token,
    user,
    expiresIn: 86400,
  }));
});

/**
 * Register endpoint
 */
app.post('/register', async (c) => {
  const body = await c.req.json<{
    email?: string;
    password?: string;
    name?: string;
  }>();
  
  if (!body.email || !body.password) {
    throw new BadRequestException('Email and password required');
  }
  
  if (body.password.length < 8) {
    throw new BadRequestException('Password must be at least 8 characters');
  }
  
  // In production, save to database
  const user: User = {
    id: `user-${Date.now()}`,
    email: body.email,
    role: 'user',
    createdAt: new Date().toISOString(),
  };
  
  const token = await signJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    iss: c.env.JWT_ISSUER,
    aud: c.env.JWT_AUDIENCE,
  }, c.env, 86400);
  
  return c.json(createResponse({
    token,
    user,
    message: 'Registration successful',
  }), 201);
});

/**
 * Get demo token (for testing)
 */
app.get('/demo-token', async (c) => {
  const { token, user } = await generateDemoToken(c.env);
  
  return c.json(createResponse({
    token,
    user,
    expiresIn: 86400,
    note: 'This is a demo token for testing purposes only',
  }));
});

/**
 * Refresh token
 */
app.post('/refresh', async (c) => {
  const user = c.get('user');
  
  if (!user) {
    throw new UnauthorizedException('Authentication required');
  }
  
  const token = await signJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    iss: c.env.JWT_ISSUER,
    aud: c.env.JWT_AUDIENCE,
  }, c.env, 86400);
  
  return c.json(createResponse({
    token,
    expiresIn: 86400,
  }));
});

/**
 * Logout endpoint
 */
app.post('/logout', async (c) => {
  const user = c.get('user');
  
  if (user) {
    // In production, invalidate token in KV or database
    await c.env.SESSION_STORE.delete(`session:${user.id}`);
  }
  
  return c.json(createResponse({
    message: 'Logout successful',
  }));
});

export default app;
