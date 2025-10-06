import { NextRequest, NextResponse } from 'next/server';
import { signJWT, generateSessionId } from '../../../../../../server/jwtUtils';
import { storage } from '../../../../../../server/storage';
import { db } from '../../../../../../server/db';
import { sessions } from '../../../../../../shared/schema';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (!code || !state) {
      return NextResponse.json(
        { error: 'Invalid callback parameters' },
        { status: 400 }
      );
    }
    
    // Retrieve and validate PKCE parameters from cookies
    const storedState = request.cookies.get('pkce_state')?.value;
    const codeVerifier = request.cookies.get('pkce_verifier')?.value;
    
    if (!storedState || !codeVerifier || storedState !== state) {
      return NextResponse.json(
        { error: 'Invalid or expired state' },
        { status: 400 }
      );
    }
    
    // Exchange code for token
    const domain = process.env.REPLIT_DOMAINS!.split(',')[0];
    const redirectUri = `https://${domain}/api/auth/callback/replit`;
    
    const tokenUrl = process.env.AUTH_TOKEN_URL || 'https://replit.com/oidc/token';
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: process.env.REPL_ID!,
        code_verifier: codeVerifier,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.json(
        { error: 'Token exchange failed' },
        { status: 400 }
      );
    }
    
    const tokens = await tokenResponse.json();
    
    // Fetch user info
    const userInfoUrl = process.env.AUTH_USERINFO_URL || 'https://replit.com/oidc/userinfo';
    const userInfoResponse = await fetch(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });
    
    if (!userInfoResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch user info' },
        { status: 400 }
      );
    }
    
    const userInfo = await userInfoResponse.json();
    
    // Upsert user in database
    await storage.upsertUser({
      id: String(userInfo.sub),
      email: String(userInfo.email || ''),
      firstName: String(userInfo.given_name || userInfo.first_name || ''),
      lastName: String(userInfo.family_name || userInfo.last_name || ''),
      profileImageUrl: String(userInfo.picture || userInfo.profile_image_url || ''),
    });
    
    // Check if user is admin
    const userId = String(userInfo.sub);
    const user = await storage.getUser(userId);
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    const isAdmin = user?.isAdmin ?? adminEmails.includes(userInfo.email);
    
    // Create session
    const sessionId = generateSessionId();
    const sessionTtl = parseInt(process.env.SESSION_TTL_MINUTES || '10080') * 60 * 1000;
    const expire = new Date(Date.now() + sessionTtl);
    
    await db.insert(sessions).values({
      sid: sessionId,
      sess: { userId } as any,
      expire
    }).onConflictDoUpdate({
      target: sessions.sid,
      set: {
        sess: { userId } as any,
        expire
      }
    });
    
    // Create JWT token
    const jwtToken = signJWT({
      userId,
      isAdmin,
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (sessionTtl / 1000)
    });
    
    // Create response with redirect
    const response = NextResponse.redirect(new URL('/auth/post-login', request.url));
    
    // Set auth session cookie
    response.cookies.set('auth-session', jwtToken, {
      httpOnly: true,
      secure: false, // Development setting
      sameSite: 'lax',
      maxAge: sessionTtl / 1000,
      path: '/'
    });
    
    // Clear PKCE cookies
    response.cookies.delete('pkce_state');
    response.cookies.delete('pkce_verifier');
    
    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}