'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Notification } from '../../shared/schema';

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (notificationId: string) => void;
  onAction?: (notification: Notification) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onMarkAsRead,
  onAction,
}) => {
  const { theme } = useTheme();

  const getNotificationIcon = (type: string) => {
    const iconMap = {
      event: '🎪',
      content: '📖',
      achievement: '🏆',
      reminder: '⏰',
      certificate: '📜',
      poll: '📊',
      chat: '💬',
      progress: '📈',
    };
    return iconMap[type as keyof typeof iconMap] || '📢';
  };

  const getNotificationColor = (type: string) => {
    const colorMap = {
      event: theme.colors.accent,
      content: theme.colors.info,
      achievement: '#ffd700',
      reminder: theme.colors.warning,
      certificate: theme.colors.success,
      poll: '#9c27b0',
      chat: theme.colors.info,
      progress: theme.colors.success,
    };
    return colorMap[type as keyof typeof colorMap] || theme.colors.primary;
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleCardClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    
    if (onAction) {
      onAction(notification);
    } else if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <div
      className={`p-4 border-b border-white/10 hover:bg-white/5 transition-all duration-200 cursor-pointer ${
        !notification.isRead ? 'bg-white/5' : ''
      }`}
      onClick={handleCardClick}
    >
      <div className="flex items-start space-x-3">
        {/* Notification Icon */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{ backgroundColor: getNotificationColor(notification.type) + '20' }}
        >
          <span>{getNotificationIcon(notification.type)}</span>
        </div>

        {/* Notification Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4
              className={`text-sm font-medium ${
                !notification.isRead ? 'text-white' : 'text-white/80'
              }`}
            >
              {notification.title}
            </h4>
            
            {/* Time and Unread Indicator */}
            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
              <span className="text-xs text-white/60">
                {formatTime(notification.createdAt)}
              </span>
              {!notification.isRead && (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getNotificationColor(notification.type) }}
                />
              )}
            </div>
          </div>
          
          <p
            className={`text-sm mt-1 ${
              !notification.isRead ? 'text-white/90' : 'text-white/70'
            }`}
          >
            {notification.message}
          </p>

          {/* Action Button */}
          {notification.actionUrl && (
            <div className="mt-2">
              <span
                className="text-xs px-2 py-1 rounded"
                style={{
                  backgroundColor: getNotificationColor(notification.type) + '30',
                  color: getNotificationColor(notification.type),
                }}
              >
                View Details
              </span>
            </div>
          )}
        </div>

        {/* Mark as Read Button */}
        {!notification.isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs transition-colors"
            title="Mark as read"
          >
            ✓
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationCard;