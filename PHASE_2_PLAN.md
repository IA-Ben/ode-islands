# Phase 2: Session Management & Security Hardening

**Status**: 📋 Planning
**Start Date**: TBD (After Phase 1 staging verification)
**Estimated Duration**: 3-4 days
**Prerequisites**: Phase 1 deployed to staging, CSRF runtime test complete

---

## Overview

Phase 2 focuses on hardening session management, completing Stack Auth migration, and adding advanced security controls that build on Phase 1's foundation.

---

## Goals

1. **Session Security**: Bind sessions to client fingerprints to prevent hijacking
2. **Complete Stack Auth Migration**: Remove Express session fallback in WebSocket
3. **Session Lifecycle**: Implement rotation and limits
4. **Attack Prevention**: Add brute force protection
5. **Data Integrity**: Fix audit log foreign key constraints

---

## Implementation Tasks

### 1. Session Fingerprinting (Priority: HIGH)

**Objective**: Bind sessions to IP address + User-Agent to detect hijacking attempts

**Files to Modify**:
- `server/auth.ts` - Add fingerprint validation to session check
- `server/unifiedRoutes.ts` - Store fingerprint on login
- Database: Add `fingerprint` column to `sessions` table

**Implementation Steps**:

```typescript
// 1. Create fingerprint generator
// server/sessionFingerprint.ts
import crypto from 'crypto';

export function generateFingerprint(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'unknown';

  return crypto
    .createHash('sha256')
    .update(`${ip}:${userAgent}`)
    .digest('hex');
}

export function validateFingerprint(
  req: Request,
  storedFingerprint: string
): boolean {
  const currentFingerprint = generateFingerprint(req);
  return currentFingerprint === storedFingerprint;
}

// 2. Store fingerprint on login
// server/unifiedRoutes.ts - /api/auth/login
const fingerprint = generateFingerprint(req);
req.session.fingerprint = fingerprint;

// 3. Validate on every request
// server/auth.ts - isAuthenticated middleware
if (!validateFingerprint(req, req.session.fingerprint)) {
  await AuditLogger.log({
    action: 'session_hijack_detected',
    severity: 'critical',
    userId: req.session.userId,
    ipAddress: req.ip,
    metadata: { reason: 'Fingerprint mismatch' }
  });

  req.session.destroy();
  return res.status(401).json({
    success: false,
    message: 'Session invalid',
    code: 'SESSION_HIJACK_DETECTED'
  });
}
```

**Database Migration**:
```sql
ALTER TABLE sessions
ADD COLUMN fingerprint VARCHAR(64);

CREATE INDEX idx_sessions_fingerprint ON sessions(fingerprint);
```

**Testing**:
- [ ] Login from browser A → session works
- [ ] Copy session cookie to browser B (different IP/UA) → 401 + audit log
- [ ] Change IP mid-session → 401 + audit log
- [ ] Normal session continues working

**Estimated Time**: 4-6 hours

---

### 2. Stack Auth WebSocket JWT Validation (Priority: HIGH)

**Objective**: Replace Express session fallback with proper Stack Auth JWT validation

**Files to Modify**:
- `server/websocket.ts` - Implement JWT validation
- Remove Express session auth fallback

**Implementation Steps**:

```typescript
// server/websocket.ts
import { stackServerApp } from './stackAuth';

private async authenticateViaStackAuth(request: any): Promise<AuthResult | null> {
  try {
    // Extract JWT from cookie or Authorization header
    const token = this.extractStackAuthToken(request);

    if (!token) {
      return null;
    }

    // Validate JWT with Stack Auth
    const user = await stackServerApp.validateAccessToken(token);

    if (!user) {
      return null;
    }

    // Get admin status from database
    const dbUser = await storage.getUser(user.id);

    await AuditLogger.log({
      action: 'websocket_auth_success',
      severity: 'info',
      userId: user.id,
      metadata: { method: 'stack_auth_jwt' }
    });

    return {
      userId: user.id,
      sessionId: token.substring(0, 16), // Use token hash as session ID
      isAdmin: dbUser?.isAdmin || false
    };
  } catch (error) {
    console.error('Stack Auth JWT validation failed:', error);
    return null;
  }
}

private extractStackAuthToken(request: any): string | null {
  // Try Authorization header first
  const authHeader = request.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookie
  const cookies = request.headers.cookie;
  const match = cookies?.match(/stack-auth-session=([^;]+)/);
  return match ? match[1] : null;
}
```

**Remove Express Session Fallback**:
```typescript
// DELETE: authenticateViaExpressSession method
// UPDATE: onConnection to only use Stack Auth
if (!authResult) {
  // Anonymous connection - no Express fallback
  this.handleAnonymousConnection(ws, clientIp);
}
```

**Testing**:
- [ ] Connect with valid Stack Auth token → authenticated
- [ ] Connect with invalid token → anonymous
- [ ] Connect with expired token → anonymous
- [ ] Admin actions require admin token

**Estimated Time**: 3-4 hours

---

### 3. Session Rotation on Privilege Escalation (Priority: MEDIUM)

**Objective**: Rotate session ID when user gains admin privileges to prevent fixation attacks

**Files to Modify**:
- `server/auth.ts` - Add session rotation helper
- `server/unifiedRoutes.ts` - Rotate on privilege change

**Implementation Steps**:

```typescript
// server/auth.ts
export async function rotateSession(req: any): Promise<void> {
  const oldSessionId = req.session.id;
  const userId = req.session.userId;
  const isAdmin = req.session.isAdmin;

  // Regenerate session
  await new Promise((resolve, reject) => {
    req.session.regenerate((err: any) => {
      if (err) reject(err);
      else resolve(undefined);
    });
  });

  // Restore user data
  req.session.userId = userId;
  req.session.isAdmin = isAdmin;

  await AuditLogger.log({
    action: 'session_rotated',
    severity: 'info',
    userId,
    metadata: {
      oldSessionId: oldSessionId.substring(0, 8),
      reason: 'privilege_escalation'
    }
  });
}

// server/unifiedRoutes.ts - When granting admin
app.post('/api/admin/grant-admin/:userId', isAdminWithCSRF, async (req, res) => {
  const { userId } = req.params;

  // Update user in database
  await storage.updateUser(userId, { isAdmin: true });

  // If granting to current user, rotate session
  if (userId === req.session.userId) {
    req.session.isAdmin = true;
    await rotateSession(req);
  }

  return res.json({ success: true });
});
```

**Testing**:
- [ ] User session ID changes when granted admin
- [ ] Old session ID invalidated
- [ ] New session has admin privileges
- [ ] Audit log records rotation

**Estimated Time**: 2-3 hours

---

### 4. Concurrent Session Limits (Priority: MEDIUM)

**Objective**: Limit users to maximum 5 active sessions to prevent account sharing

**Files to Modify**:
- Database: Track sessions per user
- `server/auth.ts` - Enforce limit on login

**Implementation Steps**:

```typescript
// server/auth.ts
const MAX_SESSIONS_PER_USER = 5;

export async function enforceSessionLimit(userId: string): Promise<void> {
  // Get all active sessions for user
  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, userId))
    .orderBy(desc(sessionsTable.lastActivityAt));

  if (sessions.length >= MAX_SESSIONS_PER_USER) {
    // Remove oldest session
    const oldestSession = sessions[sessions.length - 1];

    await db
      .delete(sessionsTable)
      .where(eq(sessionsTable.id, oldestSession.id));

    await AuditLogger.log({
      action: 'session_limit_enforced',
      severity: 'info',
      userId,
      metadata: {
        removedSessionId: oldestSession.id.substring(0, 8),
        totalSessions: sessions.length
      }
    });
  }
}

// server/unifiedRoutes.ts - After login
await enforceSessionLimit(user.id);
```

**Testing**:
- [ ] User can have up to 5 sessions
- [ ] 6th login removes oldest session
- [ ] Active sessions continue working
- [ ] Audit log records enforcement

**Estimated Time**: 2-3 hours

---

### 5. Audit Log Foreign Key Fix (Priority: LOW)

**Objective**: Allow audit logging for unauthenticated events without FK constraint violations

**Files to Modify**:
- Database: Make `user_id` nullable in `audit_logs` table
- `server/auditLogger.ts` - Handle null userId gracefully

**Implementation Steps**:

**Database Migration**:
```sql
-- Make user_id nullable
ALTER TABLE audit_logs
ALTER COLUMN user_id DROP NOT NULL;

-- Add index for null user queries
CREATE INDEX idx_audit_logs_null_user
ON audit_logs(created_at)
WHERE user_id IS NULL;
```

**Code Update**:
```typescript
// server/auditLogger.ts
export async function log(event: AuditEvent): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      action: event.action,
      severity: event.severity,
      userId: event.userId || null, // Allow null
      entityType: event.entityType,
      entityId: event.entityId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      metadata: event.metadata,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
```

**Testing**:
- [ ] Unauthenticated request logs successfully
- [ ] Authenticated request still logs userId
- [ ] Query for null userId works
- [ ] No FK constraint errors

**Estimated Time**: 1-2 hours

---

### 6. Brute Force Protection (Priority: MEDIUM)

**Objective**: Rate limit login attempts to prevent password guessing attacks

**Files to Create**:
- `server/rateLimiter.ts` - Generic rate limiting
- Apply to login endpoints

**Implementation Steps**:

```typescript
// server/rateLimiter.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';

const loginLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 15 * 60, // per 15 minutes
  blockDuration: 60 * 60 // block for 1 hour after limit
});

export async function checkLoginRateLimit(
  identifier: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    await loginLimiter.consume(identifier);
    return { allowed: true };
  } catch (error: any) {
    return {
      allowed: false,
      retryAfter: Math.round(error.msBeforeNext / 1000)
    };
  }
}

// server/unifiedRoutes.ts - Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const identifier = `login:${req.ip}:${email}`;

  // Check rate limit
  const rateCheck = await checkLoginRateLimit(identifier);
  if (!rateCheck.allowed) {
    await AuditLogger.log({
      action: 'login_rate_limited',
      severity: 'warning',
      ipAddress: req.ip,
      metadata: { email, retryAfter: rateCheck.retryAfter }
    });

    return res.status(429).json({
      success: false,
      message: `Too many login attempts. Try again in ${rateCheck.retryAfter} seconds.`,
      code: 'RATE_LIMITED',
      retryAfter: rateCheck.retryAfter
    });
  }

  // Continue with login...
});
```

**Dependencies**:
```bash
npm install rate-limiter-flexible
```

**Testing**:
- [ ] 5 failed logins allowed
- [ ] 6th attempt blocked for 1 hour
- [ ] Successful login resets counter
- [ ] Different IPs have separate limits
- [ ] Audit log records rate limiting

**Estimated Time**: 3-4 hours

---

## Testing Strategy

### Unit Tests
- Session fingerprint generation/validation
- JWT token extraction and validation
- Session rotation logic
- Rate limiter behavior

### Integration Tests
- Login flow with fingerprinting
- WebSocket JWT authentication
- Session limit enforcement
- Brute force protection

### Security Tests
- Session hijacking attempt (different IP/UA)
- Token replay attacks
- Session fixation via privilege escalation
- Account sharing via concurrent sessions
- Brute force login attempts

---

## Success Criteria

- [ ] All sessions bound to client fingerprint
- [ ] WebSocket uses Stack Auth JWT exclusively
- [ ] Session ID rotates on privilege changes
- [ ] Users limited to 5 concurrent sessions
- [ ] Audit logs accept null userId
- [ ] Login attempts rate limited (5/15min)
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Security review approved

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing sessions | HIGH | Implement fingerprint check with grace period (warn only for first week) |
| WebSocket connection failures | MEDIUM | Keep anonymous fallback, only enforce JWT for authenticated actions |
| Rate limiter memory leak | LOW | Use proven library (rate-limiter-flexible) with TTL cleanup |
| Session rotation breaking UX | LOW | Only rotate on privilege change, not on every request |

---

## Rollback Plan

If Phase 2 causes issues in production:

1. **Session Fingerprinting**: Set to "warn only" mode (log mismatches but don't block)
2. **WebSocket JWT**: Re-enable Express session fallback
3. **Session Limits**: Increase limit to 10 temporarily
4. **Rate Limiting**: Increase to 10 attempts/15min
5. **Full Rollback**: Revert to Phase 1 commit (6d45ac2)

---

## Timeline

**Day 1**:
- Session fingerprinting implementation + testing (6 hours)

**Day 2**:
- Stack Auth WebSocket JWT (4 hours)
- Session rotation (3 hours)

**Day 3**:
- Concurrent session limits (3 hours)
- Audit log FK fix (2 hours)
- Brute force protection (4 hours)

**Day 4**:
- Integration testing (4 hours)
- Documentation (2 hours)
- Staging deployment (2 hours)

**Total**: ~30 hours (~4 days)

---

## Dependencies

**NPM Packages**:
```json
{
  "rate-limiter-flexible": "^5.0.0"
}
```

**Database Migrations**:
- Add `fingerprint` column to `sessions`
- Make `user_id` nullable in `audit_logs`

**Stack Auth**:
- JWT validation SDK (already included)

---

## Phase 3 Preview

After Phase 2 completion, Phase 3 will focus on:
- Input validation & sanitization
- SQL injection prevention review
- XSS prevention review
- API schema validation
- File upload security
- Per-endpoint rate limiting

---

**Document Version**: 1.0
**Created**: 2025-10-09
**Status**: Ready for Phase 1 staging verification
**Next Review**: After Phase 1 staging tests complete
