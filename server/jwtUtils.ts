import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Sign a JWT token using RS256 algorithm
 */
export function signJWT(payload: any): string {
  const privateKey = process.env.JWT_PRIVATE_KEY!;
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '7d'
  });
}

/**
 * Verify a JWT token using RS256 algorithm
 */
export function verifyJWT(token: string): any {
  const publicKey = process.env.JWT_PUBLIC_KEY!;
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
}

/**
 * Generate a random session ID
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate PKCE code verifier
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate PKCE code challenge from verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate random state for OAuth flow
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}