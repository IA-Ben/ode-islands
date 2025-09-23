'use client';

interface WebSocketMessage {
  type: string;
  payload?: any;
  timestamp: number;
}

interface WebSocketServiceConfig {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
}

interface ChannelSubscription {
  id: string;
  pattern: string | RegExp;
  handler: (message: WebSocketMessage) => void | Promise<void>;
}

type ConnectionStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error';

/**
 * Unified WebSocket Service with channel-based message routing
 * Consolidates useWebSocket, WebSocketContext patterns into single service
 */
class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private heartbeatIntervalId: NodeJS.Timeout | null = null;
  private lastHeartbeat = Date.now();
  private messageQueue: any[] = [];
  private subscriptions = new Map<string, ChannelSubscription>();
  private subscriptionCounter = 0;
  
  private config: Required<WebSocketServiceConfig>;
  private connectionStatus: ConnectionStatus = 'closed';
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private isOnline = true;

  constructor(config: WebSocketServiceConfig = {}) {
    this.config = {
      url: '/ws',
      reconnectInterval: 1000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      heartbeatTimeout: 35000,
      ...config
    };

    // Listen for online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        if (this.connectionStatus === 'closed') {
          this.connect();
        }
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  /**
   * Subscribe to messages matching a pattern or type
   */
  subscribe(pattern: string | RegExp, handler: (message: WebSocketMessage) => void | Promise<void>): () => void {
    const id = `sub_${++this.subscriptionCounter}`;
    this.subscriptions.set(id, { id, pattern, handler });
    
    return () => {
      this.subscriptions.delete(id);
    };
  }

  /**
   * Subscribe to specific message types (convenience method)
   */
  subscribeToTypes(types: string[], handler: (message: WebSocketMessage) => void | Promise<void>): () => void {
    return this.subscribe(new RegExp(`^(${types.join('|')})$`), handler);
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Listen for connection status changes
   */
  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Send a message through the WebSocket
   */
  sendMessage(message: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
      
      // Try to reconnect if not already connecting
      if (this.connectionStatus === 'closed') {
        this.connect();
      }
      
      return false;
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (!this.isOnline || 
        this.ws?.readyState === WebSocket.OPEN || 
        this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      this.setStatus('connecting');
      
      // Construct WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}${this.config.url}`;
      
      console.log('WebSocket connecting to:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected with enhanced resilience');
        this.setStatus('open');
        this.reconnectAttempts = 0;
        this.lastHeartbeat = Date.now(); // Reset heartbeat timestamp
        this.startHeartbeat();
        this.flushMessageQueue();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected', { code: event.code, reason: event.reason });
        this.setStatus('closed');
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.error('WebSocket URL was:', wsUrl);
        console.error('Current protocol:', window.location.protocol);
        console.error('Current host:', window.location.host);
        this.setStatus('error');
        this.stopHeartbeat();
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  /**
   * Manually reconnect
   */
  reconnect(): void {
    this.disconnect();
    setTimeout(() => this.connect(), 100);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.setStatus('closed');
  }

  /**
   * Check if online and connected
   */
  isConnected(): boolean {
    return this.isOnline && this.connectionStatus === 'open';
  }

  // Private methods

  private setStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.statusListeners.forEach(listener => listener(status));
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Update heartbeat timestamp for any message (not just pong)
      this.lastHeartbeat = Date.now();
      
      // Skip routing pong messages as they're internal
      if (message.type === 'pong') {
        return;
      }

      // Route message to subscribers
      this.routeMessage(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private routeMessage(message: WebSocketMessage): void {
    this.subscriptions.forEach(({ pattern, handler }) => {
      const matches = typeof pattern === 'string' 
        ? message.type === pattern
        : pattern.test(message.type);

      if (matches) {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in WebSocket message handler:', error);
        }
      }
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatIntervalId = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Check for heartbeat timeout
        const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
        if (timeSinceLastHeartbeat > this.config.heartbeatTimeout) {
          console.warn('Heartbeat timeout detected, reconnecting...');
          this.reconnect();
          return;
        }
        
        // Send ping and update heartbeat
        this.lastHeartbeat = Date.now();
        this.sendMessage({
          type: 'ping',
          timestamp: Date.now()
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts || !this.isOnline) {
      console.warn('Max reconnection attempts reached or offline');
      return;
    }

    const delay = this.getReconnectDelay(this.reconnectAttempts);
    console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts}) in ${Math.round(delay / 1000)}s...`);
    
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private getReconnectDelay(attempt: number): number {
    const baseDelay = this.config.reconnectInterval;
    const maxDelay = 30000; // 30 seconds max
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    // Add jitter (±25% of the delay)
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.max(500, exponentialDelay + jitter);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }
}

// Default service instance
export const webSocketService = new WebSocketService();

// Export the class for custom instantiation
export { WebSocketService };

// Hook for React components
export function useWebSocketService() {
  return webSocketService;
}