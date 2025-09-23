'use client';

// DEPRECATION NOTICE: This file now delegates to UnifiedWebSocketContext
// Use UnifiedWebSocketContext and useUnifiedWebSocket for new code
// This file maintained for backward compatibility only

import React, { ReactNode } from 'react';
import { 
  UnifiedWebSocketProvider, 
  useUnifiedWebSocket
} from './UnifiedWebSocketContext';

// Re-export types for backward compatibility
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
  disconnect: () => void;
  isConnected: boolean;
  isOnline: boolean; // Legacy property for backward compatibility
}

interface WebSocketProviderProps {
  children: ReactNode;
  url?: string;
}

// Legacy provider - delegates to UnifiedWebSocketProvider
export function WebSocketProvider({ children, url = '/ws' }: WebSocketProviderProps) {
  return (
    <UnifiedWebSocketProvider url={url} autoConnect={true}>
      {children}
    </UnifiedWebSocketProvider>
  );
}

// Legacy hook - delegates to useUnifiedWebSocket with compatibility layer
export const useSharedWebSocket = (): WebSocketContextType => {
  const unifiedContext = useUnifiedWebSocket();
  
  return {
    connectionStatus: unifiedContext.connectionStatus,
    lastMessage: unifiedContext.lastMessage,
    sendMessage: unifiedContext.sendMessage,
    reconnect: unifiedContext.reconnect,
    disconnect: unifiedContext.disconnect,
    isConnected: unifiedContext.isConnected,
    isOnline: true, // Legacy property - assume online if service is running
  };
};

// Re-export for additional backward compatibility
export { useSharedWebSocket as useWebSocket };
export type { WebSocketMessage, WebSocketContextType };