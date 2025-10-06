import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory storage for PKCE data (in production, use Redis or database)
const pkceStore = new Map<string, { codeVerifier: string; expiresAt: number }>();

// Clean up expired PKCE entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of pkceStore.entries()) {
    if (data.expiresAt < now) {
      pkceStore.delete(state);
    }
  }
}, 60000); // Clean every minute

export async function GET(request: NextRequest) {
  try {
    // Generate PKCE parameters
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    
    // Generate code challenge using SHA256
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    const codeChallenge = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    // Store PKCE data with 10 minute expiry
    pkceStore.set(state, {
      codeVerifier,
      expiresAt: Date.now() + 10 * 60 * 1000
    });
    
    // Build authorization URL
    const domain = process.env.REPLIT_DOMAINS!.split(',')[0];
    const redirectUri = `https://${domain}/api/auth/callback/replit`;
    
    const authUrl = new URL(process.env.AUTH_AUTHORIZE_URL || 'https://replit.com/oidc/auth');
    authUrl.searchParams.set('client_id', process.env.REPL_ID!);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    
    // Create response with PKCE cookies
    const response = NextResponse.redirect(authUrl.toString());
    
    // Store state and verifier in httpOnly cookies
    response.cookies.set('pkce_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/'
    });
    
    response.cookies.set('pkce_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate login' },
      { status: 500 }
    );
  }
}