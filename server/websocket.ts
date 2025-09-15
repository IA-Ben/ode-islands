import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { parse } from 'url';
import { db } from './db';
import { users, sessions, liveEvents } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { verifyServerSession } from './auth';

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

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private notificationClients: NotificationClients = {};
  private eventClients: EventClients = {};
  private eventTimecodes: { [eventId: string]: number } = {};
  private heartbeatIntervals: { [eventId: string]: NodeJS.Timeout } = {};

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', async (ws: AuthenticatedWebSocket, request) => {
      console.log('New WebSocket connection attempt');
      
      try {
        // Try authentication first
        const authenticated = await this.authenticateConnection(ws, request);
        
        if (authenticated) {
          console.log(`WebSocket authenticated for user: ${ws.userId}`);
          ws.connectionType = 'authenticated';
        } else {
          // Allow anonymous connections for event participation
          console.log('Anonymous WebSocket connection allowed for events');
          ws.isAnonymous = true;
          ws.connectionType = 'anonymous_event';
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
  }

  private async authenticateConnection(ws: AuthenticatedWebSocket, request: any): Promise<boolean> {
    try {
      // Get cookies from the request
      const cookies = this.parseCookies(request.headers.cookie || '');
      const sessionCookie = cookies['auth-session'];

      if (!sessionCookie) {
        console.log('No session cookie found');
        return false;
      }

      // Use the same JWT secret function from auth module - MUST be set in production
      const JWT_SECRET = process.env.JWT_SECRET;
      
      if (!JWT_SECRET) {
        console.error('JWT_SECRET environment variable is required');
        return false;
      }

      // Verify JWT token
      const decoded = jwt.verify(sessionCookie, JWT_SECRET) as any;
      
      if (!decoded.userId || !decoded.sessionId) {
        console.log('Invalid token payload');
        return false;
      }

      // Verify server-side session exists (defense in depth)
      const isServerSessionValid = await verifyServerSession(decoded.sessionId);
      if (!isServerSessionValid) {
        console.log('Server session invalid or expired');
        return false;
      }

      // Verify user exists in database and is still active
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (user.length === 0) {
        console.log('User not found in database');
        // Clean up orphaned session
        await db.delete(sessions).where(eq(sessions.sid, decoded.sessionId));
        return false;
      }

      // Set authentication info on WebSocket
      ws.userId = decoded.userId;
      ws.sessionId = decoded.sessionId;
      ws.isAuthenticated = true;
      ws.isAdmin = user[0].isAdmin ?? false; // Capture admin status

      return true;

    } catch (error) {
      console.error('WebSocket authentication error:', error);
      return false;
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