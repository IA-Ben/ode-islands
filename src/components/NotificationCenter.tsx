'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import NotificationCard from './NotificationCard';
import NotificationSettings from './NotificationSettings';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification } from '../../shared/schema';
import { NotificationSoundService } from '@/lib/notificationSounds';

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

  // Use the WebSocket-enabled notifications hook
  const {
    notifications,
    unreadCount,
    loading,
    error,
    connectionStatus,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

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

  // Handle notification action
  const handleNotificationAction = (notification: Notification) => {
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
      {/* Bell Icon Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchNotifications(filter);
          }
        }}
        className={`relative p-2 text-white/70 hover:text-white transition-all duration-200 rounded-lg hover:bg-white/10 ${
          hasNewNotifications ? 'animate-pulse' : ''
        }`}
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg
          className="w-6 h-6"
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

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <div
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: theme.colors.error }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 max-w-[90vw] bg-black/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl z-50">
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex mt-3 space-x-1">
              <button
                onClick={() => {
                  setFilter('all');
                  fetchNotifications('all');
                }}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  filter === 'all'
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => {
                  setFilter('unread');
                  fetchNotifications('unread');
                }}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  filter === 'unread'
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Connection Status Indicator */}
            <div className="flex items-center mt-2">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                connectionStatus === 'open' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`} />
              <span className="text-xs text-white/60">
                {connectionStatus === 'open' ? 'Connected' :
                 connectionStatus === 'connecting' ? 'Connecting...' :
                 'Disconnected'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Mark all as read
                </button>
              )}
              
              <button
                onClick={() => setShowSettings(true)}
                className="text-sm text-white/60 hover:text-white/80 transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-white/60">
                <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full mx-auto mb-2"></div>
                Loading notifications...
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-400">
                <p>Failed to load notifications</p>
                <button
                  onClick={() => fetchNotifications(filter)}
                  className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  Try again
                </button>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-6 text-center text-white/60">
                <svg className="w-12 h-12 mx-auto mb-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-5-5V9.5a4.5 4.5 0 00-9 0V12L1 17h5m4 0v1a3 3 0 006 0v-1m-6 0H9" />
                </svg>
                <p>
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              <div>
                {filteredNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
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