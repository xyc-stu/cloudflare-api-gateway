/**
 * JWT authentication utilities using Web Crypto API
 */

import type { JWTPayload, User } from '../types';
import { UnauthorizedException } from './errors';

const JWT_SECRET_KEY_NAME = 'jwt-secret-key';

/**
 * Get JWT secret key
 */
async function getSecretKey(): Promise<CryptoKey> {
  // Use a fixed secret key for simplicity (in production, use environment variable)
  const secret = 'cloudflare-api-gateway-secret-key-2026';
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Sign a JWT token
 */
export async function signJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  expiresIn: number = 86400 // 24 hours
): Promise<string> {
  const secretKey = await getSecretKey();
  
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };
  
  // Create JWT segments
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
  
  // Create signature
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = await crypto.subtle.sign('HMAC', secretKey, data);
  const signatureB64 = base64UrlEncode(signature);
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(data: string | ArrayBuffer): string {
  let str: string;
  if (typeof data === 'string') {
    str = btoa(data);
  } else {
    const bytes = new Uint8Array(data);
    str = btoa(String.fromCharCode(...bytes));
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

/**
 * Verify a JWT token
 */
export async function verifyJWT(
  token: string
): Promise<JWTPayload> {
  try {
    const secretKey = await getSecretKey();
    
    // Split token
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid token format');
    }
    
    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Verify signature
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signatureBytes = base64UrlDecode(signatureB64);
    const signature = Uint8Array.from(signatureBytes, c => c.charCodeAt(0));
    
    const isValid = await crypto.subtle.verify('HMAC', secretKey, signature, data);
    if (!isValid) {
      throw new UnauthorizedException('Invalid token signature');
    }
    
    // Parse payload
    const payloadStr = base64UrlDecode(payloadB64);
    const payload: JWTPayload = JSON.parse(payloadStr);
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new UnauthorizedException('Token has expired');
    }
    
    return payload;
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    throw new UnauthorizedException('Invalid token');
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string {
  if (!authHeader) {
    throw new UnauthorizedException('Authorization header required');
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new UnauthorizedException('Invalid authorization format. Use: Bearer <token>');
  }
  
  return parts[1];
}

/**
 * Convert JWT payload to User
 */
export function payloadToUser(payload: JWTPayload): User {
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role as 'admin' | 'user' | 'guest',
    createdAt: new Date(payload.iat * 1000).toISOString(),
  };
}

/**
 * Check if user has required role
 */
export function hasRole(user: User, requiredRole: 'admin' | 'user' | 'guest'): boolean {
  const roleHierarchy: Record<string, number> = {
    guest: 0,
    user: 1,
    admin: 2,
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

/**
 * Generate a demo token for testing
 */
export async function generateDemoToken(): Promise<{ token: string; user: User }> {
  const user: User = {
    id: 'demo-user-001',
    email: 'demo@example.com',
    role: 'admin',
    createdAt: new Date().toISOString(),
  };
  
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    role: user.role,
    iss: 'cloudflare-api-gateway',
    aud: 'api-users',
  };
  
  const token = await signJWT(payload, 86400);
  
  return { token, user };
}
