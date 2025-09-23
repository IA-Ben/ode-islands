'use client';

import { useUnifiedNotifications as useUnifiedNotificationsContext } from '@/contexts/NotificationProvider';
import { NotificationService } from '@/lib/notificationService';
import { NotificationSoundService } from '@/lib/notificationSounds';

/**
 * Main interface hook for the unified notification system
 * 
 * This hook provides a clean, unified API that consolidates:
 * - Real-time WebSocket notifications
 * - Persistent API notifications  
 * - Audio/vibration feedback
 * - Settings management
 * - Browser notification permissions
 * 
 * @example
 * ```typescript
 * const {
 *   // State
 *   notifications, unreadCount, loading, error,
 *   // Actions  
 *   sendNotification, markAsRead, markAllAsRead,
 *   // Settings
 *   settings, updateSettings, requestPermissions,
 *   // Feedback
 *   playFeedback,
 * } = useUnifiedNotifications();
 * ```
 */
export const useUnifiedNotifications = () => {
  const context = useUnifiedNotificationsContext();
  
  return {
    // State - Real-time notification list and status
    notifications: context.notifications,
    unreadCount: context.unreadCount,
    loading: context.loading,
    error: context.error,
    connectionStatus: context.connectionStatus,
    
    // Actions - Unified notification operations
    sendNotification: context.sendNotification,
    markAsRead: context.markAsRead,
    markAllAsRead: context.markAllAsRead,
    fetchNotifications: context.fetchNotifications,
    
    // Settings - Centralized preference management
    settings: context.settings,
    updateSettings: context.updateSettings,
    requestPermissions: context.requestPermissions,
    
    // Feedback - Unified audio/visual/haptic feedback
    playFeedback: context.playFeedback,
    
    // Legacy compatibility for existing code
    subscribeToNotifications: context.subscribeToNotifications,
  };
};

/**
 * Simplified hook for just sending notifications
 * Useful for components that only need to send notifications
 */
export const useNotificationSender = () => {
  const { sendNotification, playFeedback } = useUnifiedNotifications();
  
  return {
    sendNotification,
    playFeedback,
    
    // Convenience methods for common notification types
    sendAchievement: async (userId: string, title: string, description: string) => {
      const success = await NotificationService.notifyAchievementUnlocked(userId, title, description);
      if (success) {
        await playFeedback('achievement');
      }
      return success;
    },
    
    sendCertificate: async (userId: string, certificateTitle: string, certificateId: string) => {
      const success = await NotificationService.notifyCertificateAwarded(userId, certificateTitle, certificateId);
      if (success) {
        await playFeedback('achievement');
      }
      return success;
    },
    
    sendProgress: async (userId: string, chapterTitle: string, chapterId: string) => {
      const success = await NotificationService.notifyChapterCompleted(userId, chapterTitle, chapterId);
      if (success) {
        await playFeedback('gentle');
      }
      return success;
    },
    
    sendEventAlert: async (userId: string, eventTitle: string, eventId: string) => {
      const success = await NotificationService.notifyEventStarting(userId, eventTitle, eventId);
      if (success) {
        await playFeedback('urgent');
      }
      return success;
    },
  };
};

/**
 * Hook for notification settings management
 * Useful for settings/preferences components
 */
export const useNotificationSettings = () => {
  const { settings, updateSettings, requestPermissions, playFeedback } = useUnifiedNotifications();
  
  return {
    settings,
    updateSettings,
    requestPermissions,
    
    // Convenience methods for toggling specific settings
    toggleSounds: (enabled?: boolean) => {
      const newValue = enabled ?? !settings.soundsEnabled;
      updateSettings({ soundsEnabled: newValue });
      if (newValue) {
        playFeedback('gentle', { sound: true, vibration: false, flash: false });
      }
    },
    
    toggleVibration: (enabled?: boolean) => {
      const newValue = enabled ?? !settings.vibrationEnabled;
      updateSettings({ vibrationEnabled: newValue });
      if (newValue) {
        playFeedback('gentle', { sound: false, vibration: true, flash: false });
      }
    },
    
    toggleBrowserNotifications: async (enabled?: boolean) => {
      if (enabled ?? !settings.browserNotifications) {
        const hasPermission = await requestPermissions();
        if (hasPermission) {
          updateSettings({ browserNotifications: true });
          await playFeedback('gentle');
        }
        return hasPermission;
      } else {
        updateSettings({ browserNotifications: false });
        return true;
      }
    },
    
    toggleFlash: (enabled?: boolean) => {
      const newValue = enabled ?? !settings.flashEnabled;
      updateSettings({ flashEnabled: newValue });
      if (newValue) {
        playFeedback('gentle', { sound: false, vibration: false, flash: true });
      }
    },
    
    // Test all notification types
    testNotifications: async () => {
      await playFeedback('default', {
        sound: settings.soundsEnabled,
        vibration: settings.vibrationEnabled,
        flash: settings.flashEnabled,
        browserNotification: settings.browserNotifications ? {
          title: 'Test Notification',
          options: {
            body: 'This is a test notification from The Ode Islands.',
            icon: '/favicon.ico',
          }
        } : undefined,
      });
    },
  };
};

/**
 * Hook for notification state without actions
 * Useful for read-only components like notification counters
 */
export const useNotificationState = () => {
  const { notifications, unreadCount, loading, error, connectionStatus } = useUnifiedNotifications();
  
  return {
    notifications,
    unreadCount,
    loading,
    error,
    connectionStatus,
    hasUnread: unreadCount > 0,
    isConnected: connectionStatus === 'open',
  };
};

// Re-export types for convenience
export type { 
  NotificationItem, 
  NotificationSettings, 
  UnifiedNotificationContextType,
  CreateNotificationParams,
} from '@/contexts/NotificationProvider';

// Legacy compatibility export
export { useUnifiedNotifications as useNotifications };

export default useUnifiedNotifications;