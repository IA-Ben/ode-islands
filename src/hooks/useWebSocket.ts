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
    maxReconnectAttempts = 5,
    onOpen,
    onClose,
    onError,
    onMessage,
  } = options;

  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutId = useRef<NodeJS.Timeout | null>(null);
  
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'open' | 'closing' | 'closed' | 'error'
  >('closed');

  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const connect = useCallback(() => {
    if (!url || ws.current?.readyState === WebSocket.OPEN) return;

    try {
      setConnectionStatus('connecting');
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('open');
        reconnectAttempts.current = 0;
        onOpen?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Handle content availability updates for real-time cache clearing
          if (message.type === 'content_available' && typeof window !== 'undefined') {
            try {
              // Use dynamic import for browser compatibility (require is not available in browser)
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

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('closed');
        onClose?.();
        
        // Attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutId.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        onError?.(error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [url, maxReconnectAttempts, reconnectInterval, onOpen, onClose, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutId.current) {
      clearTimeout(reconnectTimeoutId.current);
      reconnectTimeoutId.current = null;
    }

    if (ws.current) {
      setConnectionStatus('closing');
      ws.current.close();
      ws.current = null;
    }
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
    return false;
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  useEffect(() => {
    if (url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, connect, disconnect]);

  return {
    connectionStatus,
    lastMessage,
    sendMessage,
    reconnect,
    disconnect,
  };
};