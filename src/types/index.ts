/**
 * Type definitions for Cloudflare API Gateway
 */

export interface Env {
  // Environment variables
  ENVIRONMENT: string;
  API_VERSION: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  JWT_SECRET?: string;
  
  // KV Namespaces
  RATE_LIMIT_STORE: KVNamespace;
  SESSION_STORE: KVNamespace;
  CACHE_STORE: KVNamespace;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  timestamp: string;
  requestId: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  window: number;
}

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: string;
  lastAccessedAt: string;
}

// Hono context types
export type Variables = {
  user?: User;
  requestId: string;
  startTime: number;
};
