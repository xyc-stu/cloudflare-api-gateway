/**
 * Rate limiting implementation using Cloudflare KV
 */

import type { RateLimitInfo } from '../types';
import { RateLimitException } from './errors';

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  skipSuccessfulRequests?: boolean;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60000,      // 1 minute
  maxRequests: 100,     // 100 requests per minute
};

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Rate limiter class using KV storage
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private kv: KVNamespace;

  constructor(kv: KVNamespace, config: Partial<RateLimitConfig> = {}) {
    this.kv = kv;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(identifier: string): Promise<RateLimitInfo> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Get current rate limit data
    const entry = await this.kv.get<RateLimitEntry>(key, 'json');
    
    if (!entry || entry.resetTime < now) {
      // New window or expired entry
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };
      
      await this.kv.put(key, JSON.stringify(newEntry), {
        expirationTtl: Math.ceil(this.config.windowMs / 1000),
      });
      
      return {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        reset: Math.ceil(newEntry.resetTime / 1000),
        window: this.config.windowMs,
      };
    }
    
    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      throw new RateLimitException(
        `Rate limit exceeded. Try again in ${retryAfter} seconds`,
        retryAfter
      );
    }
    
    // Increment count
    entry.count++;
    await this.kv.put(key, JSON.stringify(entry), {
      expirationTtl: Math.ceil((entry.resetTime - now) / 1000),
    });
    
    return {
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      reset: Math.ceil(entry.resetTime / 1000),
      window: this.config.windowMs,
    };
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(identifier: string): Promise<RateLimitInfo> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    
    const entry = await this.kv.get<RateLimitEntry>(key, 'json');
    
    if (!entry || entry.resetTime < now) {
      return {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        reset: Math.ceil((now + this.config.windowMs) / 1000),
        window: this.config.windowMs,
      };
    }
    
    return {
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      reset: Math.ceil(entry.resetTime / 1000),
      window: this.config.windowMs,
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = `rate_limit:${identifier}`;
    await this.kv.delete(key);
  }
}

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(
  kv: KVNamespace,
  config?: Partial<RateLimitConfig>
) {
  const limiter = new RateLimiter(kv, config);
  
  return {
    check: (identifier: string) => limiter.checkLimit(identifier),
    getStatus: (identifier: string) => limiter.getStatus(identifier),
    reset: (identifier: string) => limiter.reset(identifier),
  };
}

/**
 * Different rate limit configurations for different endpoints
 */
export const RateLimitPresets = {
  // Standard API endpoints
  standard: {
    windowMs: 60000,    // 1 minute
    maxRequests: 100,
  },
  
  // Authentication endpoints (stricter)
  auth: {
    windowMs: 900000,   // 15 minutes
    maxRequests: 5,
  },
  
  // Public endpoints (more lenient)
  public: {
    windowMs: 60000,    // 1 minute
    maxRequests: 1000,
  },
  
  // Admin endpoints (custom)
  admin: {
    windowMs: 60000,    // 1 minute
    maxRequests: 500,
  },
};
