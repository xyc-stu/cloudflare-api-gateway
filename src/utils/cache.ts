/**
 * Caching utilities using Cloudflare KV
 */

import type { CacheEntry } from '../types';

interface CacheConfig {
  ttl: number;        // Time to live in seconds
  staleWhileRevalidate?: number;  // Serve stale content while revalidating
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 300,           // 5 minutes default
  staleWhileRevalidate: 60,
};

/**
 * Cache manager using KV storage
 */
export class CacheManager {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  /**
   * Generate cache key
   */
  private generateKey(namespace: string, key: string): string {
    return `cache:${namespace}:${key}`;
  }

  /**
   * Get cached value
   */
  async get<T>(namespace: string, key: string): Promise<T | null> {
    const cacheKey = this.generateKey(namespace, key);
    const entry = await this.kv.get<CacheEntry<T>>(cacheKey, 'json');
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    const now = Date.now();
    if (entry.expiresAt < now) {
      await this.kv.delete(cacheKey);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set cached value
   */
  async set<T>(
    namespace: string,
    key: string,
    data: T,
    config: Partial<CacheConfig> = {}
  ): Promise<void> {
    const cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...config };
    const cacheKey = this.generateKey(namespace, key);
    
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + (cacheConfig.ttl * 1000),
    };
    
    await this.kv.put(cacheKey, JSON.stringify(entry), {
      expirationTtl: cacheConfig.ttl + (cacheConfig.staleWhileRevalidate || 0),
    });
  }

  /**
   * Delete cached value
   */
  async delete(namespace: string, key: string): Promise<void> {
    const cacheKey = this.generateKey(namespace, key);
    await this.kv.delete(cacheKey);
  }

  /**
   * Delete all cached values in a namespace
   */
  async deleteNamespace(namespace: string): Promise<void> {
    const prefix = `cache:${namespace}:`;
    const keys = await this.kv.list({ prefix });
    
    for (const key of keys.keys) {
      await this.kv.delete(key.name);
    }
  }

  /**
   * Get or set cache (cache-aside pattern)
   */
  async getOrSet<T>(
    namespace: string,
    key: string,
    factory: () => Promise<T>,
    config?: Partial<CacheConfig>
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(namespace, key);
    if (cached !== null) {
      return cached;
    }
    
    // Generate new value
    const value = await factory();
    
    // Store in cache
    await this.set(namespace, key, value, config);
    
    return value;
  }

  /**
   * Check if key exists and is not expired
   */
  async has(namespace: string, key: string): Promise<boolean> {
    const value = await this.get(namespace, key);
    return value !== null;
  }

  /**
   * Get multiple cached values
   */
  async getMany<T>(namespace: string, keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    
    for (const key of keys) {
      const value = await this.get<T>(namespace, key);
      results.set(key, value);
    }
    
    return results;
  }

  /**
   * Set multiple cached values
   */
  async setMany<T>(
    namespace: string,
    entries: Map<string, T>,
    config?: Partial<CacheConfig>
  ): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(namespace, key, value, config);
    }
  }
}

/**
 * HTTP Cache-Control header utilities
 */
export function generateCacheHeaders(
  maxAge: number,
  staleWhileRevalidate?: number
): Record<string, string> {
  let cacheControl = `public, max-age=${maxAge}`;
  
  if (staleWhileRevalidate) {
    cacheControl += `, stale-while-revalidate=${staleWhileRevalidate}`;
  }
  
  return {
    'Cache-Control': cacheControl,
    'Vary': 'Accept-Encoding',
  };
}

/**
 * Generate ETag for content
 */
export function generateETag(content: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  
  return crypto.subtle.digest('SHA-256', data).then(hash => {
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `"${hashHex.substring(0, 16)}"`;
  });
}

/**
 * Check if ETag matches (304 Not Modified)
 */
export function isETagMatch(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  return ifNoneMatch === etag;
}
