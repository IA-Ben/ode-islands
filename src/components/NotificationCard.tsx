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
      event: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      content: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      achievement: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      reminder: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      certificate: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      poll: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      chat: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      progress: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    };
    return iconMap[type as keyof typeof iconMap] || (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5V9.5a4.5 4.5 0 00-9 0V12L1 17h5m4 0v1a3 3 0 006 0v-1m-6 0H9" />
      </svg>
    );
  };

  const getNotificationColor = (type: string) => {
    const colorMap = {
      event: '#3b82f6', // blue-500
      content: '#06b6d4', // cyan-500
      achievement: '#f59e0b', // amber-500
      reminder: '#f97316', // orange-500
      certificate: '#10b981', // emerald-500
      poll: '#8b5cf6', // violet-500
      chat: '#06b6d4', // cyan-500
      progress: '#10b981', // emerald-500
    };
    return colorMap[type as keyof typeof colorMap] || '#6b7280'; // gray-500
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
      className={`p-6 hover:bg-gray-50/80 transition-all duration-200 cursor-pointer group ${
        !notification.isRead ? 'bg-blue-50/30' : ''
      }`}
      onClick={handleCardClick}
    >
      <div className="flex items-start space-x-4">
        {/* Notification Icon - Professional Design */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border"
          style={{ 
            backgroundColor: getNotificationColor(notification.type) + '10',
            borderColor: getNotificationColor(notification.type) + '20',
            color: getNotificationColor(notification.type)
          }}
        >
          {getNotificationIcon(notification.type)}
        </div>

        {/* Notification Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4
              className={`text-sm font-semibold leading-5 ${
                !notification.isRead ? 'text-gray-900' : 'text-gray-700'
              }`}
            >
              {notification.title}
            </h4>
            
            {/* Time and Unread Indicator */}
            <div className="flex items-center space-x-3 flex-shrink-0 ml-3">
              <span className="text-xs text-gray-500 font-medium">
                {notification.createdAt ? formatTime(notification.createdAt) : 'Just now'}
              </span>
              {!notification.isRead && (
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getNotificationColor(notification.type) }}
                />
              )}
            </div>
          </div>
          
          <p
            className={`text-sm mt-2 leading-relaxed ${
              !notification.isRead ? 'text-gray-700' : 'text-gray-600'
            }`}
          >
            {notification.message}
          </p>

          {/* Action Button - Professional Design */}
          {notification.actionUrl && (
            <div className="mt-3">
              <span
                className="inline-flex items-center text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:bg-opacity-80"
                style={{
                  backgroundColor: getNotificationColor(notification.type) + '15',
                  color: getNotificationColor(notification.type),
                }}
              >
                <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Details
              </span>
            </div>
          )}
        </div>

        {/* Mark as Read Button - Professional Design */}
        {!notification.isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-700 transition-all opacity-0 group-hover:opacity-100"
            title="Mark as read"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationCard;