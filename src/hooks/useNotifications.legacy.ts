'use client';

/**
 * BACKWARD COMPATIBILITY LAYER FOR EXISTING useNotifications HOOK
 * 
 * This file provides the exact same interface as the original useNotifications hook
 * but delegates all operations to the unified notification system.
 * 
 * This ensures existing components continue to work without modification
 * while benefiting from the new unified architecture.
 */

import { useUnifiedNotifications } from './useUnifiedNotifications';
import { notifications } from '../../shared/schema';

// Legacy type definition from original hook
type LegacyNotification = typeof notifications.$inferSelect;

interface LegacyNotificationsState {
  notifications: LegacyNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

/**
 * Legacy useNotifications hook - provides exact same interface as original
 * @deprecated Use useUnifiedNotifications instead
 */
export const useNotificationsLegacy = () => {
  const unifiedContext = useUnifiedNotifications();
  
  // Transform unified notifications to legacy format
  const legacyNotifications: LegacyNotification[] = unifiedContext.notifications.map(notification => ({
    id: notification.id,
    userId: notification.userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    actionUrl: notification.actionUrl || null,
    metadata: notification.metadata || null,
    isRead: notification.isRead,
    readAt: notification.readAt || null,
    createdAt: notification.createdAt,
  }));
  
  // Map unified interface to legacy interface
  return {
    // State - exact same structure as original
    notifications: legacyNotifications,
    unreadCount: unifiedContext.unreadCount,
    loading: unifiedContext.loading,
    error: unifiedContext.error,
    connectionStatus: unifiedContext.connectionStatus,
    
    // Methods - exact same signatures as original
    fetchNotifications: unifiedContext.fetchNotifications,
    markAsRead: unifiedContext.markAsRead,
    markAllAsRead: unifiedContext.markAllAsRead,
    requestNotificationPermission: unifiedContext.requestPermissions,
    subscribeToNotifications: unifiedContext.subscribeToNotifications,
  };
};