'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  payload?: any;
  timestamp: number;
}

interface UseWebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void | Promise<void>;
}

export const useWebSocket = (
  url: string | null,
  options: UseWebSocketOptions = {}
) => {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    onOpen,
    onClose,
    onError,
    onMessage,
  } = options;

  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const lastConnectionAttempt = useRef<number>(0);
  const circuitBreakerUntil = useRef<number>(0);
  const isIntentionalClose = useRef(false);
  
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'open' | 'closing' | 'closed' | 'error' | 'circuit_open'
  >('closed');

  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const calculateBackoff = useCallback((attempt: number): number => {
    const baseDelay = reconnectInterval;
    const maxDelay = 60000;
    
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, attempt),
      maxDelay
    );
    
    const jitter = Math.random() * exponentialDelay * 0.3;
    
    return Math.floor(exponentialDelay + jitter);
  }, [reconnectInterval]);

  const connect = useCallback(() => {
    if (!url) return;
    
    if (ws.current?.readyState === WebSocket.OPEN || 
        ws.current?.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket already connected or connecting, skipping duplicate connection');
      return;
    }

    const now = Date.now();
    
    if (circuitBreakerUntil.current > now) {
      console.log(`Circuit breaker open until ${new Date(circuitBreakerUntil.current).toISOString()}`);
      setConnectionStatus('circuit_open');
      return;
    }

    const timeSinceLastAttempt = now - lastConnectionAttempt.current;
    const minDelay = 1000;
    
    if (timeSinceLastAttempt < minDelay) {
      console.log('Rate limit: Connection attempt too soon, waiting...');
      setTimeout(() => connect(), minDelay - timeSinceLastAttempt);
      return;
    }

    try {
      lastConnectionAttempt.current = now;
      setConnectionStatus('connecting');
      
      console.log(`WebSocket connecting (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})...`);
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setConnectionStatus('open');
        reconnectAttempts.current = 0;
        circuitBreakerUntil.current = 0;
        isIntentionalClose.current = false;
        onOpen?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
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
          
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log(`WebSocket disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
        
        if (isIntentionalClose.current) {
          console.log('Intentional close, not reconnecting');
          setConnectionStatus('closed');
          onClose?.();
          return;
        }
        
        setConnectionStatus('closed');
        onClose?.();
        
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error(`❌ Max reconnection attempts (${maxReconnectAttempts}) reached. Opening circuit breaker for 5 minutes.`);
          circuitBreakerUntil.current = Date.now() + (5 * 60 * 1000);
          setConnectionStatus('circuit_open');
          return;
        }
        
        reconnectAttempts.current++;
        const backoffDelay = calculateBackoff(reconnectAttempts.current - 1);
        
        console.log(`🔄 Scheduling reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts} in ${backoffDelay}ms (exponential backoff + jitter)`);
        
        reconnectTimeoutId.current = setTimeout(() => {
          connect();
        }, backoffDelay);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        onError?.(error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        const backoffDelay = calculateBackoff(reconnectAttempts.current - 1);
        reconnectTimeoutId.current = setTimeout(() => connect(), backoffDelay);
      }
    }
  }, [url, maxReconnectAttempts, calculateBackoff, onOpen, onClose, onError, onMessage]);

  const disconnect = useCallback(() => {
    isIntentionalClose.current = true;
    
    if (reconnectTimeoutId.current) {
      clearTimeout(reconnectTimeoutId.current);
      reconnectTimeoutId.current = null;
    }

    if (ws.current) {
      setConnectionStatus('closing');
      ws.current.close(1000, 'Client initiated disconnect');
      ws.current = null;
    }
    
    reconnectAttempts.current = 0;
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        const messageToSend: WebSocketMessage = {
          type: message.type || 'message',
          payload: message.payload || message,
          timestamp: Date.now(),
        };
        ws.current.send(JSON.stringify(messageToSend));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    }
    console.warn('Cannot send message: WebSocket not open');
    return false;
  }, []);

  const reconnect = useCallback(() => {
    console.log('Manual reconnect requested');
    isIntentionalClose.current = true;
    
    if (reconnectTimeoutId.current) {
      clearTimeout(reconnectTimeoutId.current);
      reconnectTimeoutId.current = null;
    }

    if (ws.current) {
      ws.current.close(1000, 'Manual reconnect');
      ws.current = null;
    }
    
    reconnectAttempts.current = 0;
    circuitBreakerUntil.current = 0;
    isIntentionalClose.current = false;
    
    const reconnectDelay = calculateBackoff(0);
    console.log(`Reconnecting in ${reconnectDelay}ms...`);
    setTimeout(() => {
      connect();
    }, reconnectDelay);
  }, [connect, calculateBackoff]);

  useEffect(() => {
    if (url) {
      isIntentionalClose.current = false;
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url]);

  return {
    connectionStatus,
    lastMessage,
    sendMessage,
    reconnect,
    disconnect,
  };
};