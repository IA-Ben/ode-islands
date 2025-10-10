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

type ConnectionStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error' | 'circuit_open';

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
  
  // De-duplication for notification messages
  private notificationCache = new Set<string>();
  private cacheCleanupInterval: NodeJS.Timeout | null = null;
  private lastCacheCleanup = Date.now();
  
  private config: Required<WebSocketServiceConfig>;
  private connectionStatus: ConnectionStatus = 'closed';
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private isOnline = true;

  private lastConnectionAttempt = 0;
  private circuitBreakerUntil = 0;
  private isIntentionalClose = false;

  constructor(config: WebSocketServiceConfig = {}) {
    this.config = {
      url: '/ws',
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      heartbeatTimeout: 35000,
      ...config
    };

    // Disable WebSocket on Vercel (serverless platform doesn't support WebSockets)
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isVercel = hostname.includes('vercel.app') || process.env.NEXT_PUBLIC_VERCEL_ENV;

      if (isVercel) {
        console.log('WebSocket disabled on Vercel platform');
        this.connectionStatus = 'closed';
        return; // Skip initialization
      }
    }

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

    // Start cache cleanup interval (clean every 5 minutes)
    this.startCacheCleanup();
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
      console.log('WebSocket already connected/connecting or offline, skipping');
      return;
    }

    const now = Date.now();

    if (this.circuitBreakerUntil > now) {
      console.log(`🔌 Circuit breaker open until ${new Date(this.circuitBreakerUntil).toISOString()}`);
      this.setStatus('circuit_open');
      return;
    }

    const timeSinceLastAttempt = now - this.lastConnectionAttempt;
    const minDelay = 1000;

    if (timeSinceLastAttempt < minDelay) {
      console.log('⏱️ Rate limit: Connection attempt too soon, waiting...');
      setTimeout(() => this.connect(), minDelay - timeSinceLastAttempt);
      return;
    }

    try {
      this.lastConnectionAttempt = now;
      this.setStatus('connecting');
      
      // Construct WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}${this.config.url}`;
      
      console.log(`WebSocket connecting (attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts}) to:`, wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully with enhanced resilience');
        this.setStatus('open');
        this.reconnectAttempts = 0;
        this.circuitBreakerUntil = 0;
        this.isIntentionalClose = false;
        this.lastHeartbeat = Date.now();
        this.startHeartbeat();
        this.flushMessageQueue();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
        
        if (this.isIntentionalClose) {
          console.log('Intentional close, not reconnecting');
          this.setStatus('closed');
          this.stopHeartbeat();
          return;
        }

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
    console.log('Manual reconnect requested');
    this.isIntentionalClose = true;

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Manual reconnect');
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.circuitBreakerUntil = 0;
    this.isIntentionalClose = false;

    const reconnectDelay = this.getReconnectDelay(0);
    console.log(`Reconnecting in ${reconnectDelay}ms...`);
    setTimeout(() => this.connect(), reconnectDelay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.isIntentionalClose = true;
    this.stopHeartbeat();
    this.stopCacheCleanup();
    
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client initiated disconnect');
      this.ws = null;
    }
    
    this.reconnectAttempts = 0;
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
    // De-duplicate notification messages to prevent duplicate processing during reconnections
    if (message.type === 'notification' && message.payload?.id) {
      const notificationId = message.payload.id;
      if (this.notificationCache.has(notificationId)) {
        // Skip duplicate notification
        return;
      }
      // Add to cache with current timestamp
      this.notificationCache.add(`${notificationId}-${Date.now()}`);
    }

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
    if (!this.isOnline) {
      console.warn('Offline, not scheduling reconnect');
      return;
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.config.maxReconnectAttempts}) reached. Opening circuit breaker for 5 minutes.`);
      this.circuitBreakerUntil = Date.now() + (5 * 60 * 1000);
      this.setStatus('circuit_open');
      return;
    }

    const delay = this.getReconnectDelay(this.reconnectAttempts);
    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts} in ${Math.round(delay / 1000)}s (exponential backoff + jitter)...`);
    
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private getReconnectDelay(attempt: number): number {
    const baseDelay = this.config.reconnectInterval;
    const maxDelay = 60000;
    
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    
    const jitter = Math.random() * exponentialDelay * 0.3;
    
    return Math.floor(exponentialDelay + jitter);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }

  /**
   * Start cache cleanup interval for notification de-duplication
   */
  private startCacheCleanup(): void {
    this.stopCacheCleanup();
    
    // Clean cache every 5 minutes
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupNotificationCache();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cache cleanup interval
   */
  private stopCacheCleanup(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
  }

  /**
   * Clean up old notification cache entries (older than 10 minutes)
   */
  private cleanupNotificationCache(): void {
    const now = Date.now();
    const tenMinutesAgo = now - (10 * 60 * 1000);
    
    // Convert Set to Array for filtering
    const cacheEntries = Array.from(this.notificationCache);
    const validEntries = cacheEntries.filter(entry => {
      // Extract timestamp from cache key (format: "id-timestamp")
      const parts = entry.split('-');
      if (parts.length < 2) return false;
      
      const timestamp = parseInt(parts[parts.length - 1], 10);
      return !isNaN(timestamp) && timestamp > tenMinutesAgo;
    });
    
    // Replace cache with cleaned entries
    this.notificationCache.clear();
    validEntries.forEach(entry => this.notificationCache.add(entry));
    
    this.lastCacheCleanup = now;
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