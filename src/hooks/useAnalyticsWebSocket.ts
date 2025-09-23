'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSharedWebSocket } from '@/contexts/WebSocketContext';

interface AnalyticsMessage {
  type: 'real_time_metrics' | 'user_activity' | 'content_interaction' | 'system_alert' | 'event_update';
  data: {
    activeUsers?: number;
    activeConnections?: number;
    systemLoad?: number;
    newInteraction?: any;
    alertLevel?: 'info' | 'warning' | 'error';
    eventId?: string;
    timestamp: string;
  };
}

interface UseAnalyticsWebSocketOptions {
  enabled?: boolean;
  onRealTimeUpdate?: (data: any) => void;
  onSystemAlert?: (alert: any) => void;
  onUserActivity?: (activity: any) => void;
}

export function useAnalyticsWebSocket(options: UseAnalyticsWebSocketOptions = {}) {
  const { enabled = true, onRealTimeUpdate, onSystemAlert, onUserActivity } = options;
  
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    activeUsers: 0,
    activeConnections: 0,
    systemLoad: 0,
    lastUpdate: null as string | null
  });

  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
  }>>([]);

  const [activityFeed, setActivityFeed] = useState<Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>>([]);

  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type?.startsWith('analytics_') || ['real_time_metrics', 'user_activity', 'content_interaction', 'system_alert', 'event_update'].includes(message.type)) {
      const analyticsMessage = message as AnalyticsMessage;
      
      switch (analyticsMessage.type) {
        case 'real_time_metrics':
          setRealTimeMetrics(prev => ({
            ...prev,
            ...analyticsMessage.data,
            lastUpdate: analyticsMessage.data.timestamp
          }));
          onRealTimeUpdate?.(analyticsMessage.data);
          break;

        case 'system_alert':
          const alert = {
            id: `alert-${Date.now()}`,
            type: analyticsMessage.data.alertLevel || 'info',
            message: (analyticsMessage.data as any).message || 'System alert',
            timestamp: analyticsMessage.data.timestamp
          };
          setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
          onSystemAlert?.(alert);
          break;

        case 'user_activity':
        case 'content_interaction':
          const activity = {
            id: `activity-${Date.now()}`,
            type: analyticsMessage.type,
            description: getActivityDescription(analyticsMessage),
            timestamp: analyticsMessage.data.timestamp
          };
          setActivityFeed(prev => [activity, ...prev.slice(0, 19)]); // Keep last 20 activities
          onUserActivity?.(activity);
          break;

        case 'event_update':
          // Handle event-specific updates
          onRealTimeUpdate?.({
            eventUpdate: analyticsMessage.data,
            timestamp: analyticsMessage.data.timestamp
          });
          break;
      }
    }
  }, [onRealTimeUpdate, onSystemAlert, onUserActivity]);

  const getActivityDescription = (message: AnalyticsMessage): string => {
    switch (message.type) {
      case 'user_activity':
        return `User activity: ${(message.data as any).description || 'New user session'}`;
      case 'content_interaction':
        return `Content interaction: ${(message.data as any).description || 'User engaged with content'}`;
      default:
        return 'Unknown activity';
    }
  };

  // Use the shared WebSocket connection instead of creating a new one
  const { connectionStatus, sendMessage, lastMessage } = useSharedWebSocket();

  // Handle messages from the shared WebSocket connection
  useEffect(() => {
    if (lastMessage && enabled) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage, enabled, handleWebSocketMessage]);

  // Subscribe to analytics updates when connection is established
  useEffect(() => {
    if (connectionStatus === 'open' && enabled) {
      console.log('Analytics WebSocket connected via shared connection');
      // Subscribe to analytics updates
      sendMessage({
        type: 'subscribe',
        payload: {
          channel: 'analytics',
          subscriptions: ['real_time_metrics', 'user_activity', 'content_interaction', 'system_alert', 'event_update']
        }
      });
    }
  }, [connectionStatus, enabled, sendMessage]);

  const subscribeToEvent = useCallback((eventId: string) => {
    sendMessage({
      type: 'subscribe_event',
      payload: { eventId }
    });
  }, [sendMessage]);

  const unsubscribeFromEvent = useCallback((eventId: string) => {
    sendMessage({
      type: 'unsubscribe_event',
      payload: { eventId }
    });
  }, [sendMessage]);

  const requestMetricsUpdate = useCallback(() => {
    sendMessage({
      type: 'request_metrics',
      payload: { timestamp: new Date().toISOString() }
    });
  }, [sendMessage]);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const clearActivityFeed = useCallback(() => {
    setActivityFeed([]);
  }, []);

  // Generate mock real-time data for development
  useEffect(() => {
    if (!enabled) return;

    const generateMockData = () => {
      // Simulate real-time metrics updates
      const mockMetrics = {
        activeUsers: Math.floor(Math.random() * 1000) + 500,
        activeConnections: Math.floor(Math.random() * 500) + 250,
        systemLoad: Math.random() * 100,
        timestamp: new Date().toISOString()
      };

      setRealTimeMetrics(prev => ({
        ...prev,
        ...mockMetrics,
        lastUpdate: mockMetrics.timestamp
      }));

      // Occasionally generate alerts
      if (Math.random() < 0.1) {
        const alertTypes = ['info', 'warning', 'error'] as const;
        const messages = [
          'High traffic detected',
          'Database response time increased',
          'New content published',
          'System performance optimal',
          'User engagement spike detected'
        ];
        
        const alert = {
          id: `mock-alert-${Date.now()}`,
          type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
          message: messages[Math.floor(Math.random() * messages.length)],
          timestamp: new Date().toISOString()
        };
        
        setAlerts(prev => [alert, ...prev.slice(0, 9)]);
      }

      // Generate activity updates
      if (Math.random() < 0.3) {
        const activities = [
          'User completed chapter',
          'New poll response',
          'Chat message sent',
          'Certificate earned',
          'Content interaction'
        ];
        
        const activity = {
          id: `mock-activity-${Date.now()}`,
          type: 'user_activity',
          description: activities[Math.floor(Math.random() * activities.length)],
          timestamp: new Date().toISOString()
        };
        
        setActivityFeed(prev => [activity, ...prev.slice(0, 19)]);
      }
    };

    const interval = setInterval(generateMockData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [enabled]);

  return {
    connectionStatus,
    realTimeMetrics,
    alerts,
    activityFeed,
    subscribeToEvent,
    unsubscribeFromEvent,
    requestMetricsUpdate,
    dismissAlert,
    clearActivityFeed,
    sendMessage,
    isConnected: connectionStatus === 'open'
  };
}