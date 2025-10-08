# Security Implementation Plan

## Executive Summary

This document outlines the critical security vulnerabilities identified in the codebase and provides a comprehensive implementation plan to restore proper authentication, authorization, and role-based access control (RBAC).

**Status**: 🔴 CRITICAL - Authentication is currently bypassed across the entire stack

---

## Critical Vulnerabilities Identified

### 1. ⚠️ CRITICAL: Global Authentication Bypass

**Files Affected:**
- `server.js:121` - Warning message about disabled auth
- `server/unifiedRoutes.ts:25-35` - `isAuthenticated()` always passes
- `middleware.ts:3-7` - Next.js middleware bypassed
- `src/hooks/useAuth.ts:10-26` - Mock user always returned

**Impact**: Every admin/API action is publicly reachable without authentication.

**Current Code:**
```typescript
// server/unifiedRoutes.ts
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Authentication bypassed - set mock user
  (req as any).user = {
    userId: 'dev-user',
    isAdmin: true,
    sessionId: 'dev-session',
    claims: { sub: 'dev-user' }
  };
  next();
}
```

---

### 2. ⚠️ CRITICAL: WebSocket Authentication Bypass

**File**: `server/enterpriseWebSocket.ts:200-223`

**Issue**: WebSocket blindly trusts client-provided `userId` and elevates anyone with `userId.startsWith('admin')` to full admin access.

**Current Code:**
```typescript
private async handleAuthentication(clientId: string, payload: any): Promise<void> {
  const { sessionToken, userId } = payload;

  // For now, accept any authentication and mark as admin if user ID starts with 'admin'
  client.authenticated = true;
  client.userId = userId;
  client.isAdmin = userId?.startsWith('admin') || false;  // ⚠️ VULNERABLE
  client.permissions = client.isAdmin ? ['*'] : ['view_feature_flags'];
}
```

**Attack Vector**: Any client can send `{ userId: 'admin-hacker' }` and gain full admin WebSocket access to feature flags, metrics, and live updates.

---

### 3. 🟠 HIGH: Scheduler Shutdown Race Condition

**File**: `server.js:207-228`

**Issue**: `schedulerManager` is block-scoped to the server listen callback, but SIGTERM/SIGINT handlers try to access it, causing crashes on shutdown.

**Current Code:**
```javascript
app.listen(port, hostname, async (err) => {
  // schedulerManager only exists in this scope
  const { schedulerManager } = await import('./server/schedulerManager.ts');
  await schedulerManager.initialize();
});

// ⚠️ schedulerManager is undefined here
process.on('SIGTERM', async () => {
  await schedulerManager.shutdown(); // ReferenceError
});
```

---

### 4. 🟠 HIGH: Client/Server Auth State Mismatch

**Files**:
- `src/hooks/useAuth.ts:10` - Always returns authenticated
- `src/app/api/admin/dashboard/stats/route.ts:9` - Requires real session
- `src/app/api/fan-score/route.ts:14` - Requires real session

**Issue**: Client believes user is always logged in, but API routes require real Stack session, causing silent 401s.

---

### 5. 🟡 MEDIUM: No Test Coverage for Critical Paths

**File**: `jest.config.js:15`, `__tests__/integration/ButtonSystem.test.tsx:1`

**Issue**: Zero test coverage for:
- Auth middleware
- RBAC enforcement
- WebSocket authentication
- Scheduler lifecycle

---

## Implementation Plan

### Phase 1: Emergency Auth Restoration (Priority: CRITICAL)

#### 1.1 Enable Stack Auth Integration

**File**: `server/unifiedRoutes.ts`

```typescript
import { stackAuthExpress } from './stackAuthExpress';

export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Only bypass in explicit dev mode
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
    console.warn('⚠️  DEV MODE: Authentication bypassed');
    (req as any).user = {
      userId: 'dev-user',
      isAdmin: true,
      sessionId: 'dev-session'
    };
    return next();
  }

  try {
    const user = await stackAuthExpress.getUser();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Fetch user from database to get admin status
    const dbUser = await db.select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser || dbUser.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    (req as any).user = {
      userId: user.id,
      isAdmin: dbUser[0].isAdmin || false,
      sessionId: user.id,
      email: dbUser[0].email
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
}
```

#### 1.2 Implement Admin Guard Middleware

**File**: `server/unifiedRoutes.ts`

```typescript
export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
    return next();
  }

  const user = (req as any).user;

  if (!user || !user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
}
```

#### 1.3 Enable Next.js Middleware

**File**: `middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow bypass only in explicit dev mode
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
    return NextResponse.next();
  }

  // Only protect /admin/* routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Check Stack Auth session
  try {
    const authCheckUrl = new URL('/api/auth/user', request.url);
    const authResponse = await fetch(authCheckUrl, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (!authResponse.ok) {
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const userData = await authResponse.json();

    if (!userData.user?.isAdmin) {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware auth error:', error);
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/admin/:path*']
};
```

#### 1.4 Fix useAuth Hook

**File**: `src/hooks/useAuth.ts`

```typescript
import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  isAdmin?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser(data.user);
            setIsAuthenticated(true);
            setIsAdmin(data.user.isAdmin || false);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
  };
}
```

---

### Phase 2: Fix WebSocket Authentication (Priority: CRITICAL)

**File**: `server/enterpriseWebSocket.ts`

```typescript
import { stackAuthExpress } from './stackAuthExpress';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

private async handleAuthentication(clientId: string, payload: any): Promise<void> {
  const client = this.clients.get(clientId);
  if (!client) return;

  try {
    const { sessionToken } = payload;

    if (!sessionToken) {
      this.sendToClient(clientId, {
        type: 'authentication_error',
        payload: { message: 'Session token required' },
        timestamp: Date.now()
      });
      return;
    }

    // Validate session token with Stack Auth
    // Note: You'll need to implement token validation method
    const user = await this.validateStackToken(sessionToken);

    if (!user) {
      this.sendToClient(clientId, {
        type: 'authentication_error',
        payload: { message: 'Invalid session token' },
        timestamp: Date.now()
      });
      return;
    }

    // Fetch user from database to verify admin status
    const dbUser = await db.select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser || dbUser.length === 0) {
      this.sendToClient(clientId, {
        type: 'authentication_error',
        payload: { message: 'User not found' },
        timestamp: Date.now()
      });
      return;
    }

    // Set authenticated client info
    client.authenticated = true;
    client.userId = user.id;
    client.isAdmin = dbUser[0].isAdmin || false;
    client.permissions = client.isAdmin ? ['*'] : ['view_feature_flags'];

    this.sendToClient(clientId, {
      type: 'authentication_success',
      payload: {
        isAdmin: client.isAdmin,
        permissions: client.permissions,
        userId: client.userId
      },
      timestamp: Date.now()
    });

    // Subscribe to appropriate channels
    if (client.isAdmin) {
      this.subscribe(clientId, 'admin');
    }
    this.subscribe(clientId, 'general');

  } catch (error) {
    console.error('WebSocket authentication error:', error);
    this.sendToClient(clientId, {
      type: 'authentication_error',
      payload: { message: 'Authentication failed' },
      timestamp: Date.now()
    });
  }
}

private async validateStackToken(token: string): Promise<any> {
  // TODO: Implement Stack Auth token validation
  // This should verify the JWT token and return user info
  // For now, throw error to force proper implementation
  throw new Error('Stack token validation not yet implemented');
}
```

---

### Phase 3: Fix Scheduler Lifecycle (Priority: HIGH)

**File**: `server.js`

```javascript
// Hoist scheduler reference to module scope
let schedulerManager = null;

const app = next({ dev });
const handle = app.getRequestHandler();
const server = express();

app.prepare().then(async () => {
  // ... setup code ...

  const httpServer = http.createServer(server);

  httpServer.listen(port, hostname, async (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);

    // Initialize background services
    try {
      const schedulerModule = await import('./server/schedulerManager.ts');
      schedulerManager = schedulerModule.schedulerManager; // Store in module scope

      if (schedulerManager) {
        await schedulerManager.initialize();
        console.log(`> Content scheduler initialized`);
      }
    } catch (error) {
      console.error('Error initializing scheduler:', error);
    }
  });

  // Graceful shutdown with null guard
  async function shutdown(signal) {
    console.log(`Received ${signal}, shutting down gracefully...`);

    if (schedulerManager) {
      try {
        await schedulerManager.shutdown();
        console.log('Scheduler shut down successfully');
      } catch (error) {
        console.error('Error shutting down scheduler:', error);
      }
    }

    httpServer.close(() => {
      console.log('Server shut down');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
});
```

---

### Phase 4: Implement Proper RBAC System

#### 4.1 Define Roles

**File**: `server/roles.ts` (new)

```typescript
export type Role = 'admin' | 'user';

export type Permission =
  // Admin permissions
  | 'admin:dashboard'
  | 'admin:story-builder'
  | 'admin:events'
  | 'admin:cards'
  | 'admin:rewards'
  | 'admin:users'
  | 'admin:orders'
  | 'admin:analytics'
  | 'admin:settings'
  // User permissions
  | 'app:before'
  | 'app:event'
  | 'app:after'
  | 'app:wallet'
  | 'app:points'
  | 'app:scan'
  | 'app:account';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    // Admin area - full CRUD
    'admin:dashboard',
    'admin:story-builder',
    'admin:events',
    'admin:cards',
    'admin:rewards',
    'admin:users',
    'admin:orders',
    'admin:analytics',
    'admin:settings',
    // App area - QA/testing only
    'app:before',
    'app:event',
    'app:after',
    'app:wallet',
    'app:points',
    'app:scan',
    'app:account',
  ],
  user: [
    // App area only
    'app:before',
    'app:event',
    'app:after',
    'app:wallet',
    'app:points',
    'app:scan',
    'app:account',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getUserRole(isAdmin: boolean): Role {
  return isAdmin ? 'admin' : 'user';
}
```

#### 4.2 Create Permission Middleware

**File**: `server/permissionMiddleware.ts` (new)

```typescript
import { Request, Response, NextFunction } from 'express';
import { Permission, hasPermission, getUserRole } from './roles';

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const role = getUserRole(user.isAdmin);

    if (!hasPermission(role, permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${permission} required`,
        userRole: role
      });
    }

    next();
  };
}
```

#### 4.3 Apply to Admin Routes

**File**: `server/unifiedRoutes.ts`

```typescript
import { requirePermission } from './permissionMiddleware';

// Example usage:
server.get('/api/admin/dashboard',
  isAuthenticated,
  requirePermission('admin:dashboard'),
  adminDashboardHandler
);

server.post('/api/admin/cards',
  isAuthenticated,
  requirePermission('admin:cards'),
  createCardHandler
);
```

---

### Phase 5: Add Security Tests

**File**: `__tests__/security/auth.test.ts` (new)

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { isAuthenticated, isAdmin } from '../../server/unifiedRoutes';

describe('Authentication Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    // Setup test routes
  });

  it('should block unauthenticated requests', async () => {
    const response = await request(app)
      .get('/api/admin/dashboard')
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it('should allow authenticated admin requests', async () => {
    // Test with valid session
  });

  it('should block non-admin users from admin routes', async () => {
    // Test with regular user session
  });
});

describe('WebSocket Authentication', () => {
  it('should reject connections without valid session token', async () => {
    // Test WebSocket auth
  });

  it('should not grant admin access based on userId string', async () => {
    // Test that 'admin-hacker' userId doesn't grant access
  });
});
```

---

## Environment Variables

Add to `.env.local`:

```bash
# Set to 'true' to bypass auth in development (USE WITH CAUTION)
BYPASS_AUTH=false

# Stack Auth configuration
STACK_PROJECT_ID=your_project_id
STACK_SECRET_KEY=your_secret_key
```

---

## Rollout Checklist

### Before Deployment

- [ ] Review all authentication bypass points
- [ ] Test Stack Auth integration locally
- [ ] Test admin/user role separation
- [ ] Verify WebSocket authentication
- [ ] Test scheduler shutdown handlers
- [ ] Run security test suite
- [ ] Update environment variables
- [ ] Review audit logs

### Deployment

- [ ] Deploy with `BYPASS_AUTH=false`
- [ ] Monitor authentication errors
- [ ] Verify admin access works
- [ ] Test regular user restrictions
- [ ] Check WebSocket connections
- [ ] Verify scheduler lifecycle

### Post-Deployment

- [ ] Security audit
- [ ] Penetration testing
- [ ] Monitor for 401/403 errors
- [ ] Review audit logs for suspicious activity

---

## Questions & Answers

**Q: Do we still need a dev-only auth bypass?**

**A**: Yes, but it MUST be:
1. Explicit via `BYPASS_AUTH=true` environment variable
2. Only enabled in development (`NODE_ENV === 'development'`)
3. Log clear warnings when active
4. Never deployed to production

**Q: What about existing user sessions?**

**A**: When auth is restored:
1. All users will need to re-authenticate
2. Implement graceful session migration if needed
3. Add clear messaging about authentication requirement

**Q: Timeline for implementation?**

**A**: Recommended phases:
- **Week 1**: Phase 1 & 2 (Auth restoration + WebSocket fix)
- **Week 2**: Phase 3 & 4 (Scheduler + RBAC)
- **Week 3**: Phase 5 (Testing & hardening)
- **Week 4**: Security audit & deployment

---

## Success Metrics

- ✅ Zero authentication bypasses in production
- ✅ All admin routes protected
- ✅ WebSocket authentication validated
- ✅ 100% test coverage for auth flows
- ✅ Clean scheduler shutdown
- ✅ No unauthorized access in audit logs

---

*Document Status: Draft for Review*
*Last Updated: 2025-10-08*
