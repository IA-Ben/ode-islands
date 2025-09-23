'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useUnifiedWebSocket } from './UnifiedWebSocketContext';
import { NotificationService, CreateNotificationParams } from '@/lib/notificationService';
import { NotificationSoundService } from '@/lib/notificationSounds';
import { apiCallWithCSRF } from '@/lib/csrfUtils';

// Type definitions
export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'event' | 'content' | 'achievement' | 'reminder' | 'certificate' | 'poll' | 'chat' | 'progress';
  actionUrl?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
}

export interface NotificationSettings {
  soundsEnabled: boolean;
  vibrationEnabled: boolean;
  browserNotifications: boolean;
  flashEnabled: boolean;
}

export interface UnifiedNotificationContextType {
  // State
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'open' | 'closing' | 'closed' | 'error';
  
  // Actions
  sendNotification: (params: CreateNotificationParams) => Promise<boolean>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  fetchNotifications: (filter?: 'all' | 'unread') => Promise<void>;
  
  // Settings
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  requestPermissions: () => Promise<boolean>;
  
  // Feedback
  playFeedback: (type?: 'default' | 'achievement' | 'urgent' | 'gentle', options?: {
    sound?: boolean;
    vibration?: boolean; 
    flash?: boolean;
    browserNotification?: { title: string; options?: NotificationOptions };
  }) => Promise<void>;
  
  // Legacy compatibility
  subscribeToNotifications: () => void;
}

// Default settings
const DEFAULT_SETTINGS: NotificationSettings = {
  soundsEnabled: false, // Default to OFF until user enables
  vibrationEnabled: false, // Default to OFF until user enables  
  browserNotifications: false,
  flashEnabled: true, // Visual feedback is non-intrusive
};

// Storage keys
const STORAGE_KEYS = {
  SOUNDS: 'ode-notifications-sounds',
  VIBRATION: 'ode-notifications-vibration', 
  BROWSER: 'ode-notifications-browser',
  FLASH: 'ode-notifications-flash',
};

const UnifiedNotificationContext = createContext<UnifiedNotificationContextType | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  // State management
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);

  // WebSocket integration
  const { connectionStatus, lastMessage, sendMessage, subscribeToTypes } = useUnifiedWebSocket();

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      if (typeof window === 'undefined') return;
      
      try {
        const loadedSettings: NotificationSettings = {
          soundsEnabled: localStorage.getItem(STORAGE_KEYS.SOUNDS) === 'true',
          vibrationEnabled: localStorage.getItem(STORAGE_KEYS.VIBRATION) === 'true',
          browserNotifications: typeof window !== 'undefined' && 'Notification' in window && 
                               Notification.permission === 'granted' && 
                               localStorage.getItem(STORAGE_KEYS.BROWSER) !== 'false',
          flashEnabled: localStorage.getItem(STORAGE_KEYS.FLASH) !== 'false',
        };
        
        setSettings(loadedSettings);
        
        // Sync with NotificationSoundService
        NotificationSoundService.setSoundsEnabled(loadedSettings.soundsEnabled);
        NotificationSoundService.setVibrationEnabled(loadedSettings.vibrationEnabled);
      } catch (error) {
        console.warn('Failed to load notification settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: NotificationSettings) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEYS.SOUNDS, newSettings.soundsEnabled.toString());
      localStorage.setItem(STORAGE_KEYS.VIBRATION, newSettings.vibrationEnabled.toString());
      localStorage.setItem(STORAGE_KEYS.BROWSER, newSettings.browserNotifications.toString());
      localStorage.setItem(STORAGE_KEYS.FLASH, newSettings.flashEnabled.toString());
      
      // Sync with NotificationSoundService
      NotificationSoundService.setSoundsEnabled(newSettings.soundsEnabled);
      NotificationSoundService.setVibrationEnabled(newSettings.vibrationEnabled);
    } catch (error) {
      console.warn('Failed to save notification settings:', error);
    }
  }, []);

  // Handle WebSocket notification messages
  useEffect(() => {
    const unsubscribe = subscribeToTypes(['notification'], (message) => {
      if (message.payload) {
        const newNotification = message.payload as NotificationItem;
        
        // Add to notifications list
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Play feedback based on settings
        playFeedback(
          newNotification.type === 'achievement' || newNotification.type === 'certificate' ? 'achievement' :
          newNotification.type === 'reminder' ? 'urgent' : 'default',
          {
            sound: settings.soundsEnabled,
            vibration: settings.vibrationEnabled,
            flash: settings.flashEnabled,
            browserNotification: settings.browserNotifications ? {
              title: newNotification.title,
              options: {
                body: newNotification.message,
                icon: '/favicon.ico',
                tag: newNotification.id,
              }
            } : undefined,
          }
        );
      }
    });

    return unsubscribe;
  }, [settings, subscribeToTypes]);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (filter: 'all' | 'unread' = 'all') => {
    try {
      setLoading(true);
      setError(null);

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

      const fetchedNotifications = (data.notifications || []).map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        readAt: n.readAt ? new Date(n.readAt) : null,
        metadata: typeof n.metadata === 'string' ? JSON.parse(n.metadata || '{}') : (n.metadata || {}),
      }));

      setNotifications(fetchedNotifications);
      setUnreadCount(fetchedNotifications.filter((n: NotificationItem) => !n.isRead).length);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
      setError(errorMessage);
      console.error('Notification fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Send notification (unified API for both WebSocket and persistent)
  const sendNotification = useCallback(async (params: CreateNotificationParams): Promise<boolean> => {
    try {
      return await NotificationService.createNotification(params);
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
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
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true, readAt: new Date() }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      return true;

    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
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
  }, [notifications, markAsRead]);

  // Request notification permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    
    try {
      // Initialize audio context for sound permissions
      await NotificationSoundService.initializeAudio();
      
      // Request browser notification permission - now properly guarded
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          const granted = permission === 'granted';
          
          // Update settings if permission granted
          if (granted) {
            updateSettings({ browserNotifications: true });
          }
          
          return granted;
        }
        
        return Notification.permission === 'granted';
      }
      
      return false;
    } catch (error) {
      console.warn('Failed to request notification permissions:', error);
      return false;
    }
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const updatedSettings = { ...prev, ...newSettings };
      saveSettings(updatedSettings);
      return updatedSettings;
    });
  }, [saveSettings]);

  // Play notification feedback (unified interface)
  const playFeedback = useCallback(async (
    type: 'default' | 'achievement' | 'urgent' | 'gentle' = 'default',
    options: {
      sound?: boolean;
      vibration?: boolean;
      flash?: boolean;
      browserNotification?: { title: string; options?: NotificationOptions };
    } = {}
  ) => {
    const {
      sound = settings.soundsEnabled,
      vibration = settings.vibrationEnabled,
      flash = settings.flashEnabled,
      browserNotification
    } = options;

    try {
      await NotificationSoundService.playNotificationFeedback(type, {
        sound,
        vibration,
        flash,
        browserNotification: browserNotification && settings.browserNotifications ? browserNotification : undefined,
      });
    } catch (error) {
      console.warn('Failed to play notification feedback:', error);
    }
  }, [settings]);

  // Subscribe to WebSocket notifications (legacy compatibility)
  const subscribeToNotifications = useCallback(() => {
    if (sendMessage) {
      sendMessage({
        type: 'subscribe',
        payload: { type: 'notifications' },
      });
    }
  }, [sendMessage]);

  // Initial setup
  useEffect(() => {
    fetchNotifications();
    requestPermissions();
  }, [fetchNotifications, requestPermissions]);

  // Subscribe to WebSocket when connected
  useEffect(() => {
    if (connectionStatus === 'open') {
      subscribeToNotifications();
    }
  }, [connectionStatus, subscribeToNotifications]);

  const contextValue: UnifiedNotificationContextType = {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    connectionStatus,
    
    // Actions
    sendNotification,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    
    // Settings
    settings,
    updateSettings,
    requestPermissions,
    
    // Feedback
    playFeedback,
    
    // Legacy compatibility
    subscribeToNotifications,
  };

  return (
    <UnifiedNotificationContext.Provider value={contextValue}>
      {children}
    </UnifiedNotificationContext.Provider>
  );
}

export const useUnifiedNotifications = () => {
  const context = useContext(UnifiedNotificationContext);
  if (!context) {
    throw new Error('useUnifiedNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Export types for external use
export type { CreateNotificationParams };