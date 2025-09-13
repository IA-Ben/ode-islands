'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { notifications } from '../../shared/schema';

// Define Notification type based on the schema  
type Notification = typeof notifications.$inferSelect;
import { apiCallWithCSRF } from '@/lib/csrfUtils';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

export const useNotifications = () => {
  const [state, setState] = useState<NotificationsState>({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
  });

  // WebSocket connection for real-time notifications
  const wsUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    : null;

  const { connectionStatus, lastMessage, sendMessage } = useWebSocket(wsUrl, {
    onMessage: async (message) => {
      if (message.type === 'notification' && message.payload) {
        // Add new notification to the list
        const newNotification = message.payload as Notification;
        setState(prev => ({
          ...prev,
          notifications: [newNotification, ...prev.notifications],
          unreadCount: prev.unreadCount + 1,
        }));

        // Show browser notification and play sounds
        try {
          const { NotificationSoundService } = await import('@/lib/notificationSounds');
          
          // Play notification sound and feedback
          const soundType = newNotification.type === 'achievement' || newNotification.type === 'certificate' ? 'achievement' :
                          newNotification.type === 'reminder' ? 'urgent' : 'default';
          
          await NotificationSoundService.playNotificationFeedback(soundType, {
            sound: false, // Default to OFF until user enables
            vibration: false, // Default to OFF until user enables
            flash: true, // Visual feedback is non-intrusive
            browserNotification: {
              title: newNotification.title,
              options: {
                body: newNotification.message,
                icon: '/favicon.ico',
                tag: newNotification.id,
              }
            }
          });
        } catch (error) {
          console.warn('Failed to play notification feedback:', error);
        }
      }
    },
  });

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (filter: 'all' | 'unread' = 'all') => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const params = new URLSearchParams();
      if (filter === 'unread') {
        params.append('isRead', 'false');
      }
      params.append('limit', '50');

      const response = await fetch(`/api/notifications?${params}`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch notifications');
      }

      const notifications = data.notifications || [];
      const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

      setState(prev => ({
        ...prev,
        notifications,
        unreadCount,
        loading: false,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
      console.error('Notification fetch error:', error);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await apiCallWithCSRF('/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({
          notificationId,
          isRead: true,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to mark notification as read');
      }

      // Update local state
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true, readAt: new Date() }
            : notification
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));

      return true;

    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = state.notifications.filter(n => !n.isRead);
      
      // Mark all unread notifications as read
      const results = await Promise.allSettled(
        unreadNotifications.map(notification => markAsRead(notification.id))
      );

      // Count successful operations
      const successCount = results.filter(result => result.status === 'fulfilled' && result.value).length;
      
      return successCount === unreadNotifications.length;

    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return false;
    }
  }, [state.notifications, markAsRead]);

  // Subscribe to WebSocket notifications
  const subscribeToNotifications = useCallback(() => {
    if (sendMessage) {
      sendMessage({
        type: 'subscribe',
        payload: { type: 'notifications' },
      });
    }
  }, [sendMessage]);

  // Initial fetch and setup
  useEffect(() => {
    fetchNotifications();
    requestNotificationPermission();
  }, [fetchNotifications, requestNotificationPermission]);

  // Subscribe to WebSocket when connected
  useEffect(() => {
    if (connectionStatus === 'open') {
      subscribeToNotifications();
    }
  }, [connectionStatus, subscribeToNotifications]);

  return {
    ...state,
    connectionStatus,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    requestNotificationPermission,
    subscribeToNotifications,
  };
};