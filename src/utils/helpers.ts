/**
 * Utility functions for API Gateway
 */

import type { ApiResponse, ResponseMeta, PaginationInfo } from '../types';

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Create a standardized API response
 */
export function createResponse<T>(
  data: T,
  success: boolean = true,
  meta?: Partial<ResponseMeta>
): ApiResponse<T> {
  return {
    success,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: meta?.requestId || generateRequestId(),
      ...meta,
    },
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  requestId?: string
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: requestId || generateRequestId(),
    },
  };
}

/**
 * Create pagination metadata
 */
export function createPagination(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
  const totalPages = Math.ceil(total / limit);
  return {
    page: Math.max(1, page),
    limit: Math.max(1, limit),
    total: Math.max(0, total),
    totalPages: Math.max(1, totalPages),
  };
}

/**
 * Parse pagination parameters from URL
 */
export function parsePagination(url: URL): { page: number; limit: number } {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  
  return {
    page: Math.max(1, page),
    limit: Math.min(Math.max(1, limit), 100), // Max 100 items per page
  };
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Calculate request duration in milliseconds
 */
export function calculateDuration(startTime: number): number {
  return Date.now() - startTime;
}

/**
 * Sanitize string for logging (remove sensitive data)
 */
export function sanitizeForLogging(str: string): string {
  // Remove common sensitive patterns
  const patterns = [
    /password[=:]\s*[^\s&]+/gi,
    /token[=:]\s*[^\s&]+/gi,
    /secret[=:]\s*[^\s&]+/gi,
    /api[_-]?key[=:]\s*[^\s&]+/gi,
    /authorization[=:]\s*[^\s&]+/gi,
  ];
  
  let sanitized = str;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  
  return sanitized;
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const headers = request.headers;
  
  // Check various header sources
  const cfConnectingIP = headers.get('CF-Connecting-IP');
  if (cfConnectingIP) return cfConnectingIP;
  
  const xForwardedFor = headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    // Get the first IP in the chain
    return xForwardedFor.split(',')[0].trim();
  }
  
  const xRealIP = headers.get('X-Real-IP');
  if (xRealIP) return xRealIP;
  
  return 'unknown';
}

/**
 * Check if request is from a browser
 */
export function isBrowserRequest(request: Request): boolean {
  const acceptHeader = request.headers.get('Accept') || '';
  return acceptHeader.includes('text/html');
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
