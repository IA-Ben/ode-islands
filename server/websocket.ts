import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as signature from 'cookie-signature';
import { parse } from 'url';
import { db } from './db';
import { users, sessions, liveEvents } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { stackServerApp } from './stackAuth';
import { AuditLogger } from './auditLogger';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  sessionId?: string;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  isAnonymous?: boolean;
  eventId?: string;
  connectionType?: 'authenticated' | 'anonymous_event';
}

interface WebSocketMessage {
  type: string;
  payload?: any;
  timestamp: number;
}

interface NotificationClients {
  [userId: string]: Set<AuthenticatedWebSocket>;
}

interface EventClients {
  [eventId: string]: Set<AuthenticatedWebSocket>;
}

interface ConnectionAttempt {
  timestamp: number;
  count: number;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private notificationClients: NotificationClients = {};
  private eventClients: EventClients = {};
  private eventTimecodes: { [eventId: string]: number } = {};
  private heartbeatIntervals: { [eventId: string]: NodeJS.Timeout } = {};
  private connectionAttempts: Map<string, ConnectionAttempt> = new Map();
  private readonly MAX_CONNECTIONS_PER_USER = 5;
  private readonly RATE_LIMIT_WINDOW = 60000;
  private readonly MAX_ATTEMPTS_PER_WINDOW = 20;

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', async (ws: AuthenticatedWebSocket, request) => {
      const clientIp = request.socket.remoteAddress || 'unknown';
      console.log(`New WebSocket connection attempt from ${clientIp}`);
      
      try {
        const rateLimitKey = clientIp;
        
        if (!this.checkRateLimit(rateLimitKey)) {
          console.warn(`⚠️ Rate limit exceeded for ${clientIp}`);
          ws.close(1008, 'Rate limit exceeded. Too many connection attempts.');
          return;
        }

        const authenticated = await this.authenticateConnection(ws, request);
        
        if (authenticated) {
          if (!this.checkConnectionLimit(ws.userId!)) {
            console.warn(`⚠️ Connection limit exceeded for user ${ws.userId}`);
            ws.close(1008, `Connection limit exceeded. Maximum ${this.MAX_CONNECTIONS_PER_USER} connections per user.`);
            return;
          }
          
          console.log(`✅ WebSocket authenticated for user: ${ws.userId}`);
          ws.connectionType = 'authenticated';
          
          // Track authenticated user
          if (!this.notificationClients[ws.userId!]) {
            this.notificationClients[ws.userId!] = new Set();
          }
          this.notificationClients[ws.userId!].add(ws);
        } else {
          console.log('✅ Anonymous WebSocket connection allowed');
          ws.isAnonymous = true;
          ws.connectionType = 'anonymous_event';
          
          // Track anonymous connection with a unique ID to prevent immediate cleanup
          ws.userId = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          if (!this.notificationClients[ws.userId]) {
            this.notificationClients[ws.userId] = new Set();
          }
          this.notificationClients[ws.userId].add(ws);
        }

        // Handle messages from client
        ws.on('message', (data) => {
          try {
            const message: WebSocketMessage = JSON.parse(data.toString());
            this.handleMessage(ws, message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        });

        // Handle client disconnect
        ws.on('close', () => {
          this.handleDisconnect(ws);
        });

        // Handle errors
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.handleDisconnect(ws);
        });

        // Send welcome message
        this.sendMessage(ws, {
          type: 'connected',
          payload: { message: 'Successfully connected to notification service' },
          timestamp: Date.now(),
        });

      } catch (error) {
        console.error('WebSocket connection error:', error);
        ws.close(4000, 'Internal server error');
      }
    });

    console.log('WebSocket server initialized');

    setInterval(() => {
      this.cleanupStaleConnections();
    }, 30000);
  }

  private async authenticateConnection(ws: AuthenticatedWebSocket, request: any): Promise<boolean> {
    const clientIp = request.socket.remoteAddress || 'unknown';

    try {
      // Try Stack Auth first (preferred method)
      const stackUser = await this.authenticateViaStackAuth(request);

      if (stackUser) {
        ws.userId = stackUser.userId;
        ws.sessionId = stackUser.sessionId;
        ws.isAuthenticated = true;
        ws.isAdmin = stackUser.isAdmin;

        // Log successful authentication
        AuditLogger.log({
          userId: stackUser.userId,
          action: 'websocket_auth_success',
          entityType: 'websocket',
          entityId: stackUser.sessionId,
          severity: 'info',
          metadata: { method: 'stack_auth' },
          ipAddress: clientIp,
          userAgent: request.headers['user-agent']
        });

        console.log(`✅ WebSocket authenticated via Stack Auth for user: ${stackUser.userId}`);
        return true;
      }

      // Fallback to Express session (legacy support - will be removed in Phase 1)
      const expressUser = await this.authenticateViaExpressSession(request);

      if (expressUser) {
        ws.userId = expressUser.userId;
        ws.sessionId = expressUser.sessionId;
        ws.isAuthenticated = true;
        ws.isAdmin = expressUser.isAdmin;

        // Log legacy authentication (warning level)
        AuditLogger.log({
          userId: expressUser.userId,
          action: 'websocket_auth_legacy',
          entityType: 'websocket',
          entityId: expressUser.sessionId,
          severity: 'warning',
          metadata: { method: 'express_session', note: 'Legacy auth - migrate to Stack Auth' },
          ipAddress: clientIp,
          userAgent: request.headers['user-agent']
        });

        console.log(`⚠️ WebSocket authenticated via Express session (legacy) for user: ${expressUser.userId}`);
        return true;
      }

      // Log failed authentication
      AuditLogger.log({
        userId: 'unknown',
        action: 'websocket_auth_failed',
        entityType: 'websocket',
        entityId: 'none',
        severity: 'warning',
        metadata: { reason: 'No valid credentials' },
        ipAddress: clientIp,
        userAgent: request.headers['user-agent']
      });

      console.log('❌ WebSocket authentication failed: No valid credentials');
      return false;

    } catch (error) {
      console.error('WebSocket authentication error:', error);

      // Log authentication error
      AuditLogger.log({
        userId: 'unknown',
        action: 'websocket_auth_error',
        entityType: 'websocket',
        entityId: 'none',
        severity: 'error',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        ipAddress: clientIp,
        userAgent: request.headers['user-agent']
      });

      return false;
    }
  }

  /**
   * Authenticate WebSocket connection using Stack Auth
   *
   * PHASE 2: Stack Auth JWT validation for WebSocket
   *
   * Validates Stack Auth JWT tokens from cookies or Authorization header.
   * Uses Stack Auth's token validation to verify user identity.
   */
  private async authenticateViaStackAuth(request: any): Promise<{ userId: string; sessionId: string; isAdmin: boolean } | null> {
    try {
      // Extract JWT token from cookie or Authorization header
      const token = this.extractStackAuthToken(request);

      if (!token) {
        return null;
      }

      // Validate token with Stack Auth SDK
      // Stack Auth will verify JWT signature, expiration, and audience
      const user = await stackServerApp.validateAccessToken(token);

      if (!user || !user.id) {
        console.log('Stack Auth token validation failed');
        return null;
      }

      // Get admin status from database
      const dbUser = await storage.getUser(user.id);

      if (!dbUser) {
        console.log(`User ${user.id} not found in database`);
        return null;
      }

      // Log successful authentication
      await AuditLogger.log({
        action: 'websocket_auth_success',
        severity: 'info',
        userId: user.id,
        metadata: {
          method: 'stack_auth_jwt',
          email: user.primaryEmail
        }
      });

      console.log(`✅ WebSocket authenticated via Stack Auth JWT for user: ${user.id}`);

      return {
        userId: user.id,
        sessionId: token.substring(0, 16), // Use token hash as session ID
        isAdmin: dbUser.isAdmin || false
      };

    } catch (error) {
      console.error('Stack Auth WebSocket JWT validation error:', error);
      return null;
    }
  }

  /**
   * Extract Stack Auth JWT token from request
   * Checks both Authorization header and cookies
   */
  private extractStackAuthToken(request: any): string | null {
    // Try Authorization header first (Bearer token)
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try Stack Auth session cookies
    const cookies = this.parseCookies(request.headers.cookie || '');
    return cookies['stack-auth-session'] ||
           cookies['__Secure-stack-auth-session'] ||
           null;
  }

  /**
   * Authenticate WebSocket connection using Express sessions (LEGACY - TO BE REMOVED)
   */
  private async authenticateViaExpressSession(request: any): Promise<{ userId: string; sessionId: string; isAdmin: boolean } | null> {
    try {
      // Get cookies from the request
      const cookies = this.parseCookies(request.headers.cookie || '');
      const sessionCookie = cookies['connect.sid'];

      if (!sessionCookie) {
        return null;
      }

      // Parse and verify the Express session cookie signature
      let sessionId = sessionCookie;

      // Properly unsign the cookie using SESSION_SECRET
      if (sessionId.startsWith('s:')) {
        sessionId = sessionId.substring(2); // Remove 's:' prefix
        const unsigned = signature.unsign(sessionId, process.env.SESSION_SECRET!);

        if (unsigned === false) {
          console.log('Invalid session cookie signature');
          return null;
        }

        sessionId = unsigned;
      }

      // Verify server-side session exists in Express session store
      const serverSession = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sid, sessionId))
        .limit(1);

      if (serverSession.length === 0) {
        return null;
      }

      // Check if session has expired
      if (serverSession[0].expire < new Date()) {
        // Clean up expired session
        await db.delete(sessions).where(eq(sessions.sid, sessionId));
        return null;
      }

      // Get user info from session data
      const sessionData = serverSession[0].sess as any;
      let userId = null;

      // Extract user ID from session
      if (sessionData.passport && sessionData.passport.user) {
        const passportUser = sessionData.passport.user;
        if (typeof passportUser === 'string') {
          userId = passportUser;
        } else if (passportUser.claims && passportUser.claims.sub) {
          userId = passportUser.claims.sub;
        } else if (passportUser.id) {
          userId = passportUser.id;
        }
      } else if (sessionData.userId) {
        userId = sessionData.userId;
      }

      if (!userId) {
        return null;
      }

      // Verify user exists in database and get current info
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        return null;
      }

      return {
        userId,
        sessionId,
        isAdmin: user[0].isAdmin ?? false
      };

    } catch (error) {
      console.error('Express session WebSocket authentication error:', error);
      return null;
    }
  }

  private parseCookies(cookieHeader: string): { [key: string]: string } {
    const cookies: { [key: string]: string } = {};
    
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });

    return cookies;
  }

  private checkRateLimit(key: string): boolean {
    const now = Date.now();
    const attempt = this.connectionAttempts.get(key);

    if (!attempt) {
      this.connectionAttempts.set(key, { timestamp: now, count: 1 });
      return true;
    }

    const timeSinceFirstAttempt = now - attempt.timestamp;

    if (timeSinceFirstAttempt > this.RATE_LIMIT_WINDOW) {
      this.connectionAttempts.set(key, { timestamp: now, count: 1 });
      return true;
    }

    if (attempt.count >= this.MAX_ATTEMPTS_PER_WINDOW) {
      return false;
    }

    attempt.count++;
    return true;
  }

  private checkConnectionLimit(userId: string): boolean {
    const userConnections = this.notificationClients[userId];
    if (!userConnections) return true;

    const activeConnections = Array.from(userConnections).filter(
      ws => ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING
    );

    if (activeConnections.length >= this.MAX_CONNECTIONS_PER_USER) {
      console.warn(`User ${userId} has ${activeConnections.length} active connections (max: ${this.MAX_CONNECTIONS_PER_USER})`);
      return false;
    }

    return true;
  }

  private cleanupStaleConnections() {
    for (const [userId, clients] of Object.entries(this.notificationClients)) {
      const staleClients = Array.from(clients).filter(
        ws => ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING
      );

      staleClients.forEach(client => {
        clients.delete(client);
      });

      if (clients.size === 0) {
        delete this.notificationClients[userId];
      }
    }

    for (const [eventId, clients] of Object.entries(this.eventClients)) {
      const staleClients = Array.from(clients).filter(
        ws => ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING
      );

      staleClients.forEach(client => {
        clients.delete(client);
      });

      if (clients.size === 0) {
        delete this.eventClients[eventId];
        if (this.heartbeatIntervals[eventId]) {
          clearInterval(this.heartbeatIntervals[eventId]);
          delete this.heartbeatIntervals[eventId];
        }
      }
    }

    const now = Date.now();
    for (const [key, attempt] of this.connectionAttempts.entries()) {
      if (now - attempt.timestamp > this.RATE_LIMIT_WINDOW) {
        this.connectionAttempts.delete(key);
      }
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    switch (message.type) {
      // Messages that require authentication
      case 'subscribe':
        if (!ws.isAuthenticated || !ws.userId) return;
        if (message.payload?.type === 'notifications') {
          this.subscribeToNotifications(ws, ws.userId);
        }
        break;

      // Messages available to everyone (authenticated or anonymous)
      case 'ping':
        this.sendMessage(ws, {
          type: 'pong',
          timestamp: Date.now(),
        });
        break;

      // Event-specific messages (allow anonymous access for audience)
      case 'join_event':
        this.handleJoinEvent(ws, message.payload);
        break;

      case 'heartbeat_request':
        this.handleHeartbeatRequest(ws, message.payload);
        break;

      // Admin-only event messages (require authentication)
      case 'send_cue':
        if (!ws.isAuthenticated || !ws.userId) {
          this.sendMessage(ws, {
            type: 'error',
            payload: { message: 'Authentication required for event administration' },
            timestamp: Date.now(),
          });
          return;
        }
        this.handleSendCue(ws, message.payload);
        break;

      case 'update_timecode':
        if (!ws.isAuthenticated || !ws.userId) {
          this.sendMessage(ws, {
            type: 'error',
            payload: { message: 'Authentication required for event administration' },
            timestamp: Date.now(),
          });
          return;
        }
        this.handleUpdateTimecode(ws, message.payload);
        break;

      // Interactive Choice System messages (removed insecure choice_response_submitted)
      // Choice responses are now handled securely through HTTP API endpoint

      case 'choice_activated':
        if (!ws.isAuthenticated || !ws.isAdmin) {
          this.sendMessage(ws, {
            type: 'error',
            payload: { message: 'Admin privileges required for choice administration' },
            timestamp: Date.now(),
          });
          return;
        }
        this.handleChoiceActivated(ws, message.payload);
        break;

      case 'choice_deactivated':
        if (!ws.isAuthenticated || !ws.isAdmin) {
          this.sendMessage(ws, {
            type: 'error',
            payload: { message: 'Admin privileges required for choice administration' },
            timestamp: Date.now(),
          });
          return;
        }
        this.handleChoiceDeactivated(ws, message.payload);
        break;

      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  private subscribeToNotifications(ws: AuthenticatedWebSocket, userId: string) {
    if (!this.notificationClients[userId]) {
      this.notificationClients[userId] = new Set();
    }

    this.notificationClients[userId].add(ws);
    
    this.sendMessage(ws, {
      type: 'subscribed',
      payload: { type: 'notifications' },
      timestamp: Date.now(),
    });

    console.log(`User ${userId} subscribed to notifications`);
  }

  private handleDisconnect(ws: AuthenticatedWebSocket) {
    // Clean up notification subscriptions
    if (ws.userId && this.notificationClients[ws.userId]) {
      this.notificationClients[ws.userId].delete(ws);
      
      if (this.notificationClients[ws.userId].size === 0) {
        delete this.notificationClients[ws.userId];
      }
      
      console.log(`User ${ws.userId} disconnected from notifications`);
    }

    // Clean up event subscriptions
    if (ws.eventId && this.eventClients[ws.eventId]) {
      this.eventClients[ws.eventId].delete(ws);
      
      if (this.eventClients[ws.eventId].size === 0) {
        delete this.eventClients[ws.eventId];
        // Stop heartbeat for empty events
        if (this.heartbeatIntervals[ws.eventId]) {
          clearInterval(this.heartbeatIntervals[ws.eventId]);
          delete this.heartbeatIntervals[ws.eventId];
        }
      }
      
      console.log(`${ws.isAnonymous ? 'Anonymous user' : 'User ' + ws.userId} disconnected from event ${ws.eventId}`);
    }
  }

  private sendMessage(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
      }
    }
  }

  // Public method to broadcast notifications to specific users
  public sendNotificationToUser(userId: string, notification: any) {
    const userClients = this.notificationClients[userId];
    
    if (userClients && userClients.size > 0) {
      const message: WebSocketMessage = {
        type: 'notification',
        payload: notification,
        timestamp: Date.now(),
      };

      userClients.forEach(client => {
        this.sendMessage(client, message);
      });

      console.log(`Sent notification to ${userClients.size} client(s) for user ${userId}`);
      return true;
    }

    return false;
  }

  // Broadcast notification to multiple users
  public sendNotificationToUsers(userIds: string[], notification: any) {
    let sentCount = 0;
    
    userIds.forEach(userId => {
      if (this.sendNotificationToUser(userId, notification)) {
        sentCount++;
      }
    });

    return sentCount;
  }

  // Event-specific message handlers
  private handleJoinEvent(ws: AuthenticatedWebSocket, payload: any) {
    const { eventId } = payload;
    
    if (!eventId) {
      this.sendMessage(ws, {
        type: 'error',
        payload: { message: 'Event ID required' },
        timestamp: Date.now(),
      });
      return;
    }

    // Add client to event subscription
    if (!this.eventClients[eventId]) {
      this.eventClients[eventId] = new Set();
    }

    this.eventClients[eventId].add(ws);
    ws.eventId = eventId;

    // Send session start message
    this.sendMessage(ws, {
      type: 'session_start',
      payload: {
        eventId,
        currentTimecode: this.eventTimecodes[eventId] || 0,
        sessionId: `${eventId}-${Date.now()}`,
        userId: ws.userId || 'anonymous'
      },
      timestamp: Date.now(),
    });

    // Start heartbeat for this event if not already running
    if (!this.heartbeatIntervals[eventId]) {
      this.startEventHeartbeat(eventId);
    }

    console.log(`${ws.isAnonymous ? 'Anonymous user' : 'User ' + ws.userId} joined event ${eventId}`);
  }

  private handleHeartbeatRequest(ws: AuthenticatedWebSocket, payload: any) {
    if (!ws.eventId) return;

    this.sendMessage(ws, {
      type: 'heartbeat',
      payload: {
        serverTimecode: this.eventTimecodes[ws.eventId] || 0,
        serverTime: Date.now()
      },
      timestamp: Date.now(),
    });
  }

  // Critical Security: Check if user can perform admin actions on event
  private async verifyEventAdminPermissions(ws: AuthenticatedWebSocket, eventId: string): Promise<boolean> {
    // Must be authenticated
    if (!ws.isAuthenticated || !ws.userId) {
      return false;
    }

    // System admins can control any event
    if (ws.isAdmin) {
      return true;
    }

    // Check if user owns/created the event
    try {
      const event = await db
        .select({ createdBy: liveEvents.createdBy })
        .from(liveEvents)
        .where(eq(liveEvents.id, eventId))
        .limit(1);

      if (event.length === 0) {
        console.warn(`Event ${eventId} not found during admin permission check`);
        return false;
      }

      // Event creator can control their event
      return event[0].createdBy === ws.userId;
    } catch (error) {
      console.error('Error verifying event admin permissions:', error);
      return false;
    }
  }

  private async handleSendCue(ws: AuthenticatedWebSocket, payload: any) {
    const { eventId, cue } = payload;
    
    if (!eventId || !cue) {
      this.sendMessage(ws, {
        type: 'error',
        payload: { message: 'Event ID and cue data are required' },
        timestamp: Date.now(),
      });
      return;
    }

    // CRITICAL SECURITY: Verify admin permissions before sending cue
    const hasPermission = await this.verifyEventAdminPermissions(ws, eventId);
    if (!hasPermission) {
      console.warn(`User ${ws.userId} attempted to send cue to event ${eventId} without permission`);
      this.sendMessage(ws, {
        type: 'error',
        payload: { 
          message: 'Access denied. Only event administrators can send cues.',
          code: 'INSUFFICIENT_PERMISSIONS'
        },
        timestamp: Date.now(),
      });
      return;
    }

    // Broadcast cue to all event participants
    this.broadcastToEvent(eventId, {
      type: 'cue',
      payload: cue,
      timestamp: Date.now(),
    });

    console.log(`Authorized cue sent to event ${eventId} by ${ws.isAdmin ? 'admin' : 'event owner'} ${ws.userId}:`, cue.type);
  }

  private async handleUpdateTimecode(ws: AuthenticatedWebSocket, payload: any) {
    const { eventId, timecode } = payload;
    
    if (!eventId || typeof timecode !== 'number') {
      this.sendMessage(ws, {
        type: 'error',
        payload: { message: 'Event ID and valid timecode are required' },
        timestamp: Date.now(),
      });
      return;
    }

    // CRITICAL SECURITY: Verify admin permissions before updating timecode
    const hasPermission = await this.verifyEventAdminPermissions(ws, eventId);
    if (!hasPermission) {
      console.warn(`User ${ws.userId} attempted to update timecode for event ${eventId} without permission`);
      this.sendMessage(ws, {
        type: 'error',
        payload: { 
          message: 'Access denied. Only event administrators can update timecode.',
          code: 'INSUFFICIENT_PERMISSIONS'
        },
        timestamp: Date.now(),
      });
      return;
    }

    this.eventTimecodes[eventId] = timecode;
    console.log(`Authorized timecode update for event ${eventId} by ${ws.isAdmin ? 'admin' : 'event owner'} ${ws.userId}: ${timecode}`);
  }

  private startEventHeartbeat(eventId: string) {
    this.heartbeatIntervals[eventId] = setInterval(() => {
      const currentTimecode = this.eventTimecodes[eventId] || 0;
      this.eventTimecodes[eventId] = currentTimecode + 1; // Increment by 1 second

      this.broadcastToEvent(eventId, {
        type: 'heartbeat',
        payload: {
          serverTimecode: this.eventTimecodes[eventId],
          serverTime: Date.now()
        },
        timestamp: Date.now(),
      });
    }, 1000); // Send heartbeat every second
  }

  private broadcastToEvent(eventId: string, message: WebSocketMessage) {
    const eventClients = this.eventClients[eventId];
    
    if (eventClients && eventClients.size > 0) {
      eventClients.forEach(client => {
        this.sendMessage(client, message);
      });
    }
  }

  // Public methods for event management
  public sendCueToEvent(eventId: string, cue: any) {
    this.broadcastToEvent(eventId, {
      type: 'cue',
      payload: cue,
      timestamp: Date.now(),
    });
  }

  public updateEventTimecode(eventId: string, timecode: number) {
    this.eventTimecodes[eventId] = timecode;
  }

  // Interactive Choice System WebSocket handlers  
  // NOTE: Choice responses are now handled securely through HTTP API
  // This method provides server-authoritative broadcasts after DB updates

  private handleChoiceActivated(ws: AuthenticatedWebSocket, payload: any) {
    const { choiceId, eventId, choice } = payload;
    
    if (!eventId) {
      console.error('No eventId provided for choice activation');
      return;
    }
    
    // Broadcast to all participants that a new choice is active
    this.broadcastToEvent(eventId, {
      type: 'choice_activated',
      payload: {
        choiceId,
        choice,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
    
    console.log(`Choice ${choiceId} activated in event ${eventId}`);
  }

  private handleChoiceDeactivated(ws: AuthenticatedWebSocket, payload: any) {
    const { choiceId, eventId } = payload;
    
    if (!eventId) {
      console.error('No eventId provided for choice deactivation');
      return;
    }
    
    // Broadcast to all participants that a choice has ended
    this.broadcastToEvent(eventId, {
      type: 'choice_deactivated',
      payload: {
        choiceId,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
    
    console.log(`Choice ${choiceId} deactivated in event ${eventId}`);
  }

  // Public methods for Interactive Choice System
  public broadcastChoiceUpdate(eventId: string, choiceId: string, responseStats: any) {
    this.broadcastToEvent(eventId, {
      type: 'choice_response_update',
      payload: {
        choiceId,
        responseStats,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  }

  public notifyChoiceActivated(eventId: string, choiceId: string, choice: any) {
    this.broadcastToEvent(eventId, {
      type: 'choice_activated',
      payload: {
        choiceId,
        choice,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  }

  public notifyChoiceDeactivated(eventId: string, choiceId: string) {
    this.broadcastToEvent(eventId, {
      type: 'choice_deactivated',
      payload: {
        choiceId,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  }

  // Get connection status
  public getConnectionInfo() {
    const notificationConnections = Object.values(this.notificationClients)
      .reduce((sum, clients) => sum + clients.size, 0);
    
    const eventConnections = Object.values(this.eventClients)
      .reduce((sum, clients) => sum + clients.size, 0);
    
    const connectedUsers = Object.keys(this.notificationClients).length;
    const activeEvents = Object.keys(this.eventClients).length;

    return {
      totalConnections: notificationConnections + eventConnections,
      notificationConnections,
      eventConnections,
      connectedUsers,
      activeEvents,
      userConnections: Object.fromEntries(
        Object.entries(this.notificationClients).map(([userId, clients]) => [
          userId,
          clients.size,
        ])
      ),
      eventConnectionsByEvent: Object.fromEntries(
        Object.entries(this.eventClients).map(([eventId, clients]) => [
          eventId,
          clients.size,
        ])
      ),
    };
  }
}

// Export singleton instance
export const webSocketManager = new WebSocketManager();