/**
 * Enterprise WebSocket Service
 * 
 * Real-time WebSocket server for feature flag updates, metrics streaming,
 * and admin notifications with authentication and role-based access.
 */

import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { featureFlagService } from './featureFlagService';
import { metricsService } from './metricsService';
import { rollbackService } from './rollbackService';

export interface WebSocketClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  isAdmin: boolean;
  permissions: string[];
  subscriptions: Set<string>;
  lastPing: number;
  authenticated: boolean;
}

export interface WebSocketMessage {
  type: string;
  payload?: any;
  requestId?: string;
  timestamp: number;
}

export interface FeatureFlagUpdate {
  type: 'feature_flag_update';
  payload: {
    flagKey: string;
    enabled: boolean;
    rolloutPercentage?: number;
    emergencyDisabled?: boolean;
    globalKillSwitch?: boolean;
    reason?: string;
    updatedBy?: string;
  };
}

export interface MetricUpdate {
  type: 'metric_update';
  payload: {
    metricName: string;
    value: number;
    category: string;
    severity?: 'info' | 'warning' | 'error' | 'critical';
    timestamp: Date;
  };
}

export interface SystemAlert {
  type: 'system_alert';
  payload: {
    alertId: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    component: string;
    action?: string;
    timestamp: Date;
  };
}

class EnterpriseWebSocketService {
  private wss: WebSocket.Server | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly heartbeatIntervalMs = 30000; // 30 seconds

  /**
   * Initialize WebSocket server
   */
  initialize(server: any): void {
    this.wss = new WebSocket.Server({
      server,
      path: '/ws/admin',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.setupHeartbeat();
    this.setupServiceSubscriptions();

    console.info('🔌 Enterprise WebSocket server initialized');
  }

  /**
   * Verify client connection (basic authentication)
   */
  private verifyClient(info: { req: IncomingMessage }): boolean {
    // TODO: Implement proper authentication
    // For now, allow connections but require auth message after connection
    return true;
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientId = this.generateClientId();
    const client: WebSocketClient = {
      id: clientId,
      ws,
      isAdmin: false,
      permissions: [],
      subscriptions: new Set(),
      lastPing: Date.now(),
      authenticated: false,
      userAgent: req.headers['user-agent']
    };

    this.clients.set(clientId, client);
    
    // Set up message handling
    ws.on('message', (data: WebSocket.Data) => {
      this.handleMessage(clientId, data);
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'welcome',
      payload: { 
        clientId,
        serverTime: new Date(),
        authRequired: true 
      },
      timestamp: Date.now()
    });

    console.info(`🔌 WebSocket client connected: ${clientId}`);
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(clientId: string, data: WebSocket.Data): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'authenticate':
          this.handleAuthentication(clientId, message.payload);
          break;

        case 'subscribe':
          this.handleSubscription(clientId, message.payload);
          break;

        case 'unsubscribe':
          this.handleUnsubscription(clientId, message.payload);
          break;

        case 'ping':
          this.handlePing(clientId);
          break;

        case 'get_feature_flags':
          this.handleGetFeatureFlags(clientId, message.requestId);
          break;

        case 'get_system_health':
          this.handleGetSystemHealth(clientId, message.requestId);
          break;

        case 'admin_action':
          this.handleAdminAction(clientId, message.payload, message.requestId);
          break;

        default:
          this.sendError(clientId, `Unknown message type: ${message.type}`, message.requestId);
      }
    } catch (error) {
      console.error(`Error handling message from client ${clientId}:`, error);
      this.sendError(clientId, 'Invalid message format');
    }
  }

  /**
   * Handle client authentication
   */
  private async handleAuthentication(clientId: string, payload: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      // TODO: Implement proper session validation
      const { sessionToken, userId } = payload;
      
      // For now, accept any authentication and mark as admin if user ID starts with 'admin'
      client.authenticated = true;
      client.userId = userId;
      client.isAdmin = userId?.startsWith('admin') || false;
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

      // If admin, subscribe to all admin channels by default
      if (client.isAdmin) {
        client.subscriptions.add('feature_flags');
        client.subscriptions.add('system_alerts');
        client.subscriptions.add('metrics');
        client.subscriptions.add('rollbacks');
      }

      console.info(`✅ WebSocket client authenticated: ${clientId} (admin: ${client.isAdmin})`);
    } catch (error) {
      this.sendError(clientId, 'Authentication failed');
    }
  }

  /**
   * Handle subscription request
   */
  private handleSubscription(clientId: string, payload: any): void {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      this.sendError(clientId, 'Authentication required');
      return;
    }

    const { channel } = payload;
    
    // Check permissions for channel
    if (!this.hasPermissionForChannel(client, channel)) {
      this.sendError(clientId, `Insufficient permissions for channel: ${channel}`);
      return;
    }

    client.subscriptions.add(channel);
    
    this.sendToClient(clientId, {
      type: 'subscription_success',
      payload: { channel },
      timestamp: Date.now()
    });

    // Send initial data for the channel
    this.sendInitialChannelData(clientId, channel);

    console.info(`📡 Client ${clientId} subscribed to channel: ${channel}`);
  }

  /**
   * Handle unsubscription request
   */
  private handleUnsubscription(clientId: string, payload: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channel } = payload;
    client.subscriptions.delete(channel);
    
    this.sendToClient(clientId, {
      type: 'unsubscription_success',
      payload: { channel },
      timestamp: Date.now()
    });
  }

  /**
   * Handle ping message
   */
  private handlePing(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastPing = Date.now();
    
    this.sendToClient(clientId, {
      type: 'pong',
      payload: { serverTime: new Date() },
      timestamp: Date.now()
    });
  }

  /**
   * Handle feature flags request
   */
  private async handleGetFeatureFlags(clientId: string, requestId?: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      this.sendError(clientId, 'Authentication required', requestId);
      return;
    }

    try {
      const flags = await featureFlagService.getAllFlags();
      
      this.sendToClient(clientId, {
        type: 'feature_flags_response',
        payload: { flags },
        requestId,
        timestamp: Date.now()
      });
    } catch (error) {
      this.sendError(clientId, 'Failed to get feature flags', requestId);
    }
  }

  /**
   * Handle system health request
   */
  private async handleGetSystemHealth(clientId: string, requestId?: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      this.sendError(clientId, 'Authentication required', requestId);
      return;
    }

    try {
      const metricsHealth = await metricsService.getSystemHealth();
      const flagsHealth = featureFlagService.getSystemHealth();
      
      this.sendToClient(clientId, {
        type: 'system_health_response',
        payload: {
          metrics: metricsHealth,
          featureFlags: flagsHealth,
          timestamp: new Date()
        },
        requestId,
        timestamp: Date.now()
      });
    } catch (error) {
      this.sendError(clientId, 'Failed to get system health', requestId);
    }
  }

  /**
   * Handle admin action request
   */
  private async handleAdminAction(clientId: string, payload: any, requestId?: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.isAdmin) {
      this.sendError(clientId, 'Admin privileges required', requestId);
      return;
    }

    try {
      const { action, data } = payload;

      switch (action) {
        case 'emergency_disable_flag':
          await featureFlagService.emergencyDisableFlag(
            data.flagKey,
            data.reason,
            client.userId!,
            client.userId
          );
          break;

        case 'global_kill_switch':
          if (data.activate) {
            await featureFlagService.activateGlobalKillSwitch(
              data.reason,
              client.userId!,
              client.userId
            );
          } else {
            await featureFlagService.deactivateGlobalKillSwitch(
              client.userId!,
              client.userId
            );
          }
          break;

        case 'emergency_rollback':
          await rollbackService.initiateEmergencyRollback(
            data.reason,
            data.scope || 'global',
            data.targetComponent,
            client.userId!,
            client.userId
          );
          break;

        default:
          this.sendError(clientId, `Unknown admin action: ${action}`, requestId);
          return;
      }

      this.sendToClient(clientId, {
        type: 'admin_action_success',
        payload: { action, data },
        requestId,
        timestamp: Date.now()
      });

    } catch (error) {
      this.sendError(clientId, `Admin action failed: ${(error as Error).message}`, requestId);
    }
  }

  /**
   * Check if client has permission for channel
   */
  private hasPermissionForChannel(client: WebSocketClient, channel: string): boolean {
    if (client.permissions.includes('*')) return true;

    const channelPermissions: Record<string, string[]> = {
      'feature_flags': ['view_feature_flags', 'manage_feature_flags'],
      'system_alerts': ['view_system_alerts', 'manage_alerts'],
      'metrics': ['view_system_metrics'],
      'rollbacks': ['view_rollbacks', 'execute_rollbacks']
    };

    const requiredPermissions = channelPermissions[channel] || [];
    return requiredPermissions.some(perm => client.permissions.includes(perm));
  }

  /**
   * Send initial data for a channel
   */
  private async sendInitialChannelData(clientId: string, channel: string): Promise<void> {
    try {
      switch (channel) {
        case 'feature_flags':
          const flags = await featureFlagService.getAllFlags();
          this.sendToClient(clientId, {
            type: 'feature_flags_initial',
            payload: { flags },
            timestamp: Date.now()
          });
          break;

        case 'system_alerts':
          // Send current system health as initial alert data
          const health = await metricsService.getSystemHealth();
          if (health.criticalAlerts > 0) {
            this.sendToClient(clientId, {
              type: 'system_alert',
              payload: {
                alertId: 'system_health',
                severity: 'critical' as const,
                message: `${health.criticalAlerts} critical alerts active`,
                component: 'system',
                timestamp: new Date()
              },
              timestamp: Date.now()
            });
          }
          break;

        default:
          // No initial data for other channels
          break;
      }
    } catch (error) {
      console.error(`Error sending initial data for channel ${channel}:`, error);
    }
  }

  /**
   * Setup service subscriptions for real-time updates
   */
  private setupServiceSubscriptions(): void {
    // Subscribe to feature flag changes
    featureFlagService.subscribe((flagSummary) => {
      this.broadcastToSubscribers('feature_flags', {
        type: 'feature_flag_update',
        payload: flagSummary,
        timestamp: Date.now()
      });
    });

    // Subscribe to metrics updates (would be implemented in metrics service)
    // metricsService.subscribe((metrics) => { ... });

    console.info('📡 Service subscriptions setup complete');
  }

  /**
   * Setup heartbeat to detect disconnected clients
   */
  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 1 minute timeout

      for (const [clientId, client] of this.clients.entries()) {
        if (now - client.lastPing > timeout) {
          console.warn(`💔 Client ${clientId} timed out, disconnecting`);
          client.ws.terminate();
          this.handleDisconnection(clientId);
        }
      }
    }, this.heartbeatIntervalMs);
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      console.info(`🔌 WebSocket client disconnected: ${clientId}`);
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    }
  }

  /**
   * Send error message to client
   */
  private sendError(clientId: string, error: string, requestId?: string): void {
    this.sendToClient(clientId, {
      type: 'error',
      payload: { error },
      requestId,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast message to all clients subscribed to a channel
   */
  private broadcastToSubscribers(channel: string, message: WebSocketMessage): void {
    let sentCount = 0;

    for (const client of this.clients.values()) {
      if (client.subscriptions.has(channel) && client.authenticated) {
        this.sendToClient(client.id, message);
        sentCount++;
      }
    }

    console.debug(`📡 Broadcasted to ${sentCount} subscribers on channel: ${channel}`);
  }

  /**
   * Broadcast emergency alert to all admin clients
   */
  broadcastEmergencyAlert(alert: SystemAlert['payload']): void {
    const message: SystemAlert = {
      type: 'system_alert',
      payload: alert
    };

    let sentCount = 0;

    for (const client of this.clients.values()) {
      if (client.isAdmin && client.authenticated) {
        this.sendToClient(client.id, {
          ...message,
          timestamp: Date.now()
        });
        sentCount++;
      }
    }

    console.warn(`🚨 Emergency alert sent to ${sentCount} admin clients: ${alert.message}`);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalClients: number;
    authenticatedClients: number;
    adminClients: number;
    subscriptionCounts: Record<string, number>;
  } {
    let authenticatedClients = 0;
    let adminClients = 0;
    const subscriptionCounts: Record<string, number> = {};

    for (const client of this.clients.values()) {
      if (client.authenticated) {
        authenticatedClients++;
        if (client.isAdmin) adminClients++;

        for (const subscription of client.subscriptions) {
          subscriptionCounts[subscription] = (subscriptionCounts[subscription] || 0) + 1;
        }
      }
    }

    return {
      totalClients: this.clients.size,
      authenticatedClients,
      adminClients,
      subscriptionCounts
    };
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const client of this.clients.values()) {
      client.ws.terminate();
    }

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }

    console.info('🔌 Enterprise WebSocket server shutdown complete');
  }
}

// Export singleton instance
export const enterpriseWebSocket = new EnterpriseWebSocketService();
export default enterpriseWebSocket;