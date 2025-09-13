import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { parse } from 'url';
import { db } from './db';
import { users, sessions } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { verifyServerSession } from './auth';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  sessionId?: string;
  isAuthenticated?: boolean;
}

interface WebSocketMessage {
  type: string;
  payload?: any;
  timestamp: number;
}

interface NotificationClients {
  [userId: string]: Set<AuthenticatedWebSocket>;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private notificationClients: NotificationClients = {};

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', async (ws: AuthenticatedWebSocket, request) => {
      console.log('New WebSocket connection attempt');
      
      try {
        // Authenticate the WebSocket connection
        const authenticated = await this.authenticateConnection(ws, request);
        
        if (!authenticated) {
          ws.close(4001, 'Authentication failed');
          return;
        }

        console.log(`WebSocket authenticated for user: ${ws.userId}`);

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

      // Use the same JWT secret function from auth module
      const JWT_SECRET = process.env.JWT_SECRET || 'b941a79febc4e94a05dac7de79d1a51122dbf8b3874a5d47935f92e299f5756ecb48fcb7f0e3c672515b10e9c16e1b52a790c18a714dfc557db879c4e491d1ee';

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
    if (!ws.isAuthenticated || !ws.userId) return;

    switch (message.type) {
      case 'subscribe':
        if (message.payload?.type === 'notifications') {
          this.subscribeToNotifications(ws, ws.userId);
        }
        break;

      case 'ping':
        this.sendMessage(ws, {
          type: 'pong',
          timestamp: Date.now(),
        });
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
    if (ws.userId && this.notificationClients[ws.userId]) {
      this.notificationClients[ws.userId].delete(ws);
      
      // Clean up empty sets
      if (this.notificationClients[ws.userId].size === 0) {
        delete this.notificationClients[ws.userId];
      }
      
      console.log(`User ${ws.userId} disconnected from notifications`);
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

  // Get connection status
  public getConnectionInfo() {
    const totalConnections = Object.values(this.notificationClients)
      .reduce((sum, clients) => sum + clients.size, 0);
    
    const connectedUsers = Object.keys(this.notificationClients).length;

    return {
      totalConnections,
      connectedUsers,
      userConnections: Object.fromEntries(
        Object.entries(this.notificationClients).map(([userId, clients]) => [
          userId,
          clients.size,
        ])
      ),
    };
  }
}

// Export singleton instance
export const webSocketManager = new WebSocketManager();