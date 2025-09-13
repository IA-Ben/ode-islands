import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { users } from '../../../../../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createAuthResponse } from '../../../../../server/auth';

// Simple rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

function isLoginRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const record = loginAttempts.get(ip);
  
  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  record.count++;
  return record.count > maxAttempts;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (isLoginRateLimited(ip)) {
      return NextResponse.json(
        { success: false, message: 'Too many login attempts, please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const foundUser = user[0];

    // Check if user has a password hash (registered users)
    if (!foundUser.passwordHash) {
      return NextResponse.json(
        { success: false, message: 'Please use admin login for this account' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, foundUser.passwordHash);
    
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login time
    await db
      .update(users)
      .set({ 
        lastLoginAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, foundUser.id));

    // Create authenticated response with secure JWT cookie
    return await createAuthResponse(foundUser, true, 'Login successful');

  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}