'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import NotificationCard from './NotificationCard';
import NotificationSettings from './NotificationSettings';
import { useUnifiedNotifications, useNotificationSettings, type NotificationItem } from '@/hooks/useUnifiedNotifications';
import { NotificationSoundService } from '@/lib/notificationSounds';
import { notifications } from '../../shared/schema';

// Legacy notification type for NotificationCard compatibility
type LegacyNotification = typeof notifications.$inferSelect;

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className }) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use the unified notifications system
  const {
    notifications,
    unreadCount,
    loading,
    error,
    connectionStatus,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useUnifiedNotifications();

  // Use notification settings hook for settings management
  const { settings, testNotifications } = useNotificationSettings();

  // Initialize notification sounds on first interaction
  useEffect(() => {
    const initializeAudio = async () => {
      await NotificationSoundService.initializeAudio();
    };
    initializeAudio();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSettings(false);
      }
    };

    if (isOpen || showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, showSettings]);

  // Convert NotificationItem to legacy format for NotificationCard
  const toLegacyNotification = (notification: NotificationItem): LegacyNotification => ({
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
  });

  // Handle notification action
  const handleNotificationAction = (notification: LegacyNotification) => {
    if (notification.actionUrl) {
      // Close dropdown first
      setIsOpen(false);
      
      // Navigate to action URL
      if (notification.actionUrl.startsWith('/')) {
        window.location.href = notification.actionUrl;
      } else {
        window.open(notification.actionUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  // Animate new notifications
  useEffect(() => {
    if (unreadCount > 0 && !hasNewNotifications) {
      setHasNewNotifications(true);
      setTimeout(() => setHasNewNotifications(false), 2000);
    }
  }, [unreadCount, hasNewNotifications]);

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Icon Button - Enhanced Lumus Style */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchNotifications(filter);
          }
        }}
        className={`relative group p-3 text-white/80 hover:text-white transition-all duration-300 rounded-xl hover:bg-white/5 backdrop-blur-sm ${
          hasNewNotifications ? 'animate-pulse' : ''
        } ${isOpen ? 'bg-white/10 text-white' : ''}`}
        aria-label="Notifications"
      >
        {/* Bell Icon - Professional styling */}
        <svg
          className="w-6 h-6 transition-transform duration-200 group-hover:scale-110"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-5 -5V9.5a4.5 4.5 0 0 0-9 0V12L1 17h5m4 0v1a3 3 0 0 0 6 0v-1m-6 0H9"
          />
        </svg>

        {/* Unread Count Badge - Clean Design */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full flex items-center justify-center text-xs font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 shadow-lg border-2 border-white/20">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Notification Dropdown - Enhanced Lumus Design */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-[420px] max-w-[95vw] bg-white/95 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header - Clean Professional Design */}
          <div className="px-6 py-5 border-b border-black/10 bg-gradient-to-r from-gray-50/50 to-white/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 tracking-tight">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-black/5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filter Tabs - Professional Design */}
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setFilter('all');
                  fetchNotifications('all');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => {
                  setFilter('unread');
                  fetchNotifications('unread');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Connection Status Indicator - Professional Design */}
            <div className="flex items-center mt-4 px-3 py-2 bg-gray-50/50 rounded-lg">
              <div className={`w-2 h-2 rounded-full mr-3 ${
                connectionStatus === 'open' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' :
                'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600 font-medium">
                {connectionStatus === 'open' ? 'Live Updates Active' :
                 connectionStatus === 'connecting' ? 'Connecting...' :
                 'Connection Lost'}
              </span>
            </div>

            {/* Actions - Clean Professional Layout */}
            <div className="flex items-center justify-between mt-4">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors px-3 py-1 rounded-lg hover:bg-blue-50"
                >
                  Mark all as read
                </button>
              )}
              
              <button
                onClick={() => setShowSettings(true)}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center space-x-2 px-3 py-1 rounded-lg hover:bg-gray-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
            </div>
          </div>

          {/* Notifications List - Professional Design */}
          <div className="max-h-[28rem] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-3 border-gray-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium mb-2">Failed to load notifications</p>
                <button
                  onClick={() => fetchNotifications(filter)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Try again
                </button>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-5-5V9.5a4.5 4.5 0 00-9 0V12L1 17h5m4 0v1a3 3 0 006 0v-1m-6 0H9" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium mb-1">
                  {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                </p>
                <p className="text-gray-500 text-sm">
                  {filter === 'unread' ? 'You have no unread notifications' : 'We\'ll notify you when something new happens'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={toLegacyNotification(notification)}
                    onMarkAsRead={markAsRead}
                    onAction={handleNotificationAction}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification Settings Modal */}
      <NotificationSettings 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default NotificationCenter;