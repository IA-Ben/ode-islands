'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';

interface WebSocketMessage {
  type: string;
  payload?: any;
  timestamp: number;
}

interface WebSocketContextType {
  connectionStatus: 'connecting' | 'open' | 'closing' | 'closed' | 'error';
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => boolean;
  reconnect: () => void;
  isOnline: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  url?: string;
}

export function WebSocketProvider({ children, url = '/ws' }: WebSocketProviderProps) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalId = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeat = useRef<number>(Date.now());
  const messageQueue = useRef<any[]>([]);
  
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'open' | 'closing' | 'closed' | 'error'
  >('closed');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [isOnline, setIsOnline] = useState(true); // Default to true, will be updated in useEffect

  // Exponential backoff with jitter
  const getReconnectDelay = useCallback((attempt: number): number => {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    // Add jitter (±25% of the delay)
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.max(500, exponentialDelay + jitter);
  }, []);

  // Enhanced heartbeat with timeout detection
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalId.current) {
      clearInterval(heartbeatIntervalId.current);
    }
    
    heartbeatIntervalId.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        // Check if we've received a heartbeat recently (within 35 seconds)
        const timeSinceLastHeartbeat = Date.now() - lastHeartbeat.current;
        if (timeSinceLastHeartbeat > 35000) {
          console.warn('Heartbeat timeout detected, reconnecting...');
          reconnect();
          return;
        }
        
        // Send ping
        ws.current.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));
      }
    }, 30000); // Send ping every 30 seconds
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalId.current) {
      clearInterval(heartbeatIntervalId.current);
      heartbeatIntervalId.current = null;
    }
  }, []);

  // Process queued messages when connection is restored
  const processMessageQueue = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN && messageQueue.current.length > 0) {
      console.log(`Processing ${messageQueue.current.length} queued messages`);
      while (messageQueue.current.length > 0) {
        const queuedMessage = messageQueue.current.shift();
        try {
          ws.current.send(JSON.stringify(queuedMessage));
        } catch (error) {
          console.error('Failed to send queued message:', error);
          // Re-queue the message if it failed
          messageQueue.current.unshift(queuedMessage);
          break;
        }
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (!url || ws.current?.readyState === WebSocket.OPEN) return;

    try {
      setConnectionStatus('connecting');
      
      // Enhanced WebSocket URL construction with better production support
      let wsUrl: string;
      
      if (url.startsWith('/')) {
        // For relative URLs, construct the full WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        wsUrl = `${protocol}//${host}${url}`;
        
        // Log the constructed URL for debugging
        console.log('WebSocket connecting to:', wsUrl);
      } else {
        // For absolute URLs, use as-is
        wsUrl = url;
      }
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected with enhanced resilience');
        setConnectionStatus('open');
        lastHeartbeat.current = Date.now();
        
        // Send immediate hello message to establish connection
        try {
          ws.current?.send(JSON.stringify({
            type: 'hello',
            timestamp: Date.now()
          }));
        } catch (error) {
          console.warn('Failed to send hello message:', error);
        }
        
        startHeartbeat();
        processMessageQueue(); // Send any queued messages
        
        // Only reset reconnect attempts after a stable connection (5 seconds)
        setTimeout(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            reconnectAttempts.current = 0;
            console.log('WebSocket connection stabilized, reset reconnect attempts');
          }
        }, 5000);
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle heartbeat responses (update internal state but also propagate to components)
          if (message.type === 'pong' || message.type === 'heartbeat') {
            lastHeartbeat.current = Date.now();
            // Still propagate heartbeat messages to components for timecode sync
          }
          
          setLastMessage(message);
          
          // Handle content availability updates for real-time cache clearing
          if (message.type === 'content_available' && typeof window !== 'undefined') {
            try {
              import('@/lib/contentAvailability').then(({ ContentAvailabilityService }) => {
                ContentAvailabilityService.clearCache(
                  message.payload?.contentType, 
                  message.payload?.contentId
                );
              }).catch(error => {
                console.warn('Could not clear content availability cache:', error);
              });
            } catch (error) {
              console.warn('Could not clear content availability cache:', error);
            }
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected', { code: event.code, reason: event.reason });
        setConnectionStatus('closed');
        stopHeartbeat();
        
        // Circuit breaker pattern - only reconnect if we haven't exceeded max attempts
        if (isOnline && reconnectAttempts.current < 5) { // Reduced max attempts to prevent endless loops
          const delay = getReconnectDelay(reconnectAttempts.current);
          reconnectAttempts.current++;
          console.log(`Attempting to reconnect (${reconnectAttempts.current}/5) in ${Math.round(delay/1000)}s...`);
          
          reconnectTimeoutId.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.log('Max reconnection attempts reached or offline. WebSocket will remain disconnected until manual reconnect.');
          setConnectionStatus('error');
          // Stop trying to reconnect to prevent infinite loops
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.error('WebSocket URL was:', wsUrl);
        console.error('Current protocol:', window.location.protocol);
        console.error('Current host:', window.location.host);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [url, isOnline, getReconnectDelay, startHeartbeat, stopHeartbeat, processMessageQueue]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutId.current) {
      clearTimeout(reconnectTimeoutId.current);
      reconnectTimeoutId.current = null;
    }

    stopHeartbeat();

    if (ws.current) {
      setConnectionStatus('closing');
      ws.current.close();
      ws.current = null;
    }
  }, [stopHeartbeat]);

  const sendMessage = useCallback((message: any) => {
    const messageToSend: WebSocketMessage = {
      type: message.type || 'message',
      payload: message.payload || message,
      timestamp: Date.now(),
    };

    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(messageToSend));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        // Queue the message for retry
        messageQueue.current.push(messageToSend);
        return false;
      }
    } else {
      // Queue the message for when connection is restored
      console.log('WebSocket not ready, queueing message');
      messageQueue.current.push(messageToSend);
      return false;
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  // Initialize online status on client-side
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network back online, reconnecting WebSocket...');
      setIsOnline(true);
      if (connectionStatus !== 'open') {
        reconnect();
      }
    };

    const handleOffline = () => {
      console.log('Network offline, WebSocket will pause reconnection');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionStatus, reconnect]);

  // Initialize connection
  useEffect(() => {
    if (url && isOnline) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, connect, disconnect, isOnline]);

  return (
    <WebSocketContext.Provider
      value={{
        connectionStatus,
        lastMessage,
        sendMessage,
        reconnect,
        isOnline,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export const useSharedWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useSharedWebSocket must be used within a WebSocketProvider');
  }
  return context;
};