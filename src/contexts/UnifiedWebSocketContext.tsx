'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { webSocketService, useWebSocketService } from '@/lib/webSocketService';

interface WebSocketMessage {
  type: string;
  payload?: any;
  timestamp: number;
}

interface UnifiedWebSocketContextType {
  connectionStatus: 'connecting' | 'open' | 'closing' | 'closed' | 'error' | 'circuit_open';
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => boolean;
  reconnect: () => void;
  disconnect: () => void;
  isConnected: boolean;
  subscribe: (pattern: string | RegExp, handler: (message: WebSocketMessage) => void) => () => void;
  subscribeToTypes: (types: string[], handler: (message: WebSocketMessage) => void) => () => void;
}

const UnifiedWebSocketContext = createContext<UnifiedWebSocketContextType | null>(null);

interface UnifiedWebSocketProviderProps {
  children: ReactNode;
  url?: string;
  autoConnect?: boolean;
}

export function UnifiedWebSocketProvider({ 
  children, 
  url = '/ws',
  autoConnect = false 
}: UnifiedWebSocketProviderProps) {
  // Use the singleton service instance to prevent multiple connections
  const service = useWebSocketService();
  
  // Note: Using singleton service instance - URL configuration handled at module level
  const [connectionStatus, setConnectionStatus] = useState(service.getStatus());
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    // Listen for status changes
    const unsubscribeStatus = service.onStatusChange(setConnectionStatus);

    // Subscribe to all messages to track the last one
    const unsubscribeMessages = service.subscribe(/./, (message: WebSocketMessage) => {
      setLastMessage(message);
    });

    // Handle content availability updates for cache clearing
    const unsubscribeContentAvailability = service.subscribe('content_available', async (message: WebSocketMessage) => {
      if (typeof window !== 'undefined') {
        try {
          const { ContentAvailabilityService } = await import('@/lib/contentAvailability');
          // Handle both payload and data patterns for message schema consistency
          const contentType = message.payload?.contentType || (message as any).data?.contentType;
          const contentId = message.payload?.contentId || (message as any).data?.contentId;
          ContentAvailabilityService.clearCache(contentType, contentId);
        } catch (error) {
          console.warn('Could not clear content availability cache:', error);
        }
      }
    });

    // Auto-connect if enabled
    if (autoConnect) {
      service.connect();
    }

    return () => {
      unsubscribeStatus();
      unsubscribeMessages();
      unsubscribeContentAvailability();
    };
  }, [service, autoConnect]);

  const contextValue: UnifiedWebSocketContextType = {
    connectionStatus,
    lastMessage,
    sendMessage: (message) => service.sendMessage(message),
    reconnect: () => service.reconnect(),
    disconnect: () => service.disconnect(),
    isConnected: service.isConnected(),
    subscribe: (pattern, handler) => service.subscribe(pattern, handler),
    subscribeToTypes: (types, handler) => service.subscribeToTypes(types, handler),
  };

  return (
    <UnifiedWebSocketContext.Provider value={contextValue}>
      {children}
    </UnifiedWebSocketContext.Provider>
  );
}

export const useUnifiedWebSocket = () => {
  const context = useContext(UnifiedWebSocketContext);
  if (!context) {
    throw new Error('useUnifiedWebSocket must be used within a UnifiedWebSocketProvider');
  }
  return context;
};

// Backward compatibility - alias to maintain existing usage
export const useSharedWebSocket = useUnifiedWebSocket;