/**
 * User management routes
 */

import { Hono } from 'hono';
import type { Env, Variables, User } from '../types';
import { createResponse, parsePagination, createPagination } from '../utils/helpers';
import { createAuthMiddleware, requireAdmin } from '../middleware/auth';
import { createRateLimitMiddleware } from '../middleware/rate-limit';
import { NotFoundException } from '../utils/errors';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply auth middleware to all routes
app.use('*', createAuthMiddleware());
app.use('*', createRateLimitMiddleware({ maxRequests: 200 }));

// Mock user database (in production, use D1 or external database)
const mockUsers: User[] = [
  {
    id: 'user-001',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-002',
    email: 'user@example.com',
    role: 'user',
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'user-003',
    email: 'guest@example.com',
    role: 'guest',
    createdAt: '2024-02-01T00:00:00Z',
  },
];

/**
 * Get current user
 */
app.get('/me', (c) => {
  const user = c.get('user');
  return c.json(createResponse(user));
});

/**
 * Update current user
 */
app.patch('/me', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<Partial<User>>();
  
  // In production, update in database
  const updatedUser = {
    ...user,
    ...body,
    id: user.id, // Prevent ID change
    role: user.role, // Prevent role change
  };
  
  return c.json(createResponse(updatedUser));
});

/**
 * List all users (admin only)
 */
app.get('/', (c) => {
  const currentUser = c.get('user');
  
  // Check if user is admin
  if (!currentUser || currentUser.role !== 'admin') {
    throw new NotFoundException('User not found');
  }
  
  const url = new URL(c.req.url);
  const { page, limit } = parsePagination(url);
  
  const total = mockUsers.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const users = mockUsers.slice(start, end);
  
  return c.json(createResponse(users, true, {
    pagination: createPagination(page, limit, total),
  }));
});

/**
 * Get user by ID
 */
app.get('/:id', (c) => {
  const id = c.req.param('id');
  const currentUser = c.get('user');
  
  // Users can only view their own profile unless they're admin
  if (currentUser.id !== id && currentUser.role !== 'admin') {
    throw new NotFoundException('User not found');
  }
  
  const user = mockUsers.find(u => u.id === id);
  if (!user) {
    throw new NotFoundException('User not found');
  }
  
  return c.json(createResponse(user));
});

/**
 * Create new user (admin only)
 */
app.post('/', requireAdmin(), async (c) => {
  const body = await c.req.json<Partial<User>>();
  
  if (!body.email) {
    throw new Error('Email is required');
  }
  
  const newUser: User = {
    id: `user-${Date.now()}`,
    email: body.email,
    role: body.role || 'user',
    createdAt: new Date().toISOString(),
  };
  
  // In production, save to database
  mockUsers.push(newUser);
  
  return c.json(createResponse(newUser), 201);
});

/**
 * Update user (admin only)
 */
app.patch('/:id', requireAdmin(), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<User>>();
  
  const userIndex = mockUsers.findIndex(u => u.id === id);
  if (userIndex === -1) {
    throw new NotFoundException('User not found');
  }
  
  mockUsers[userIndex] = {
    ...mockUsers[userIndex],
    ...body,
    id: mockUsers[userIndex].id, // Prevent ID change
  };
  
  return c.json(createResponse(mockUsers[userIndex]));
});

/**
 * Delete user (admin only)
 */
app.delete('/:id', requireAdmin(), (c) => {
  const id = c.req.param('id');
  
  const userIndex = mockUsers.findIndex(u => u.id === id);
  if (userIndex === -1) {
    throw new NotFoundException('User not found');
  }
  
  // Prevent deleting yourself
  const currentUser = c.get('user');
  if (currentUser.id === id) {
    throw new Error('Cannot delete your own account');
  }
  
  mockUsers.splice(userIndex, 1);
  
  return c.json(createResponse({ message: 'User deleted successfully' }));
});

export default app;
