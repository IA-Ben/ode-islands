'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ContentTypeUtils } from '@/lib/contentAvailability';
import { useWebSocket } from '@/hooks/useWebSocket';

interface NewContentAlert {
  id: string;
  contentType: string;
  contentId: string;
  title: string;
  description?: string;
  timestamp: number;
}

export default function NewContentNotification() {
  const [alerts, setAlerts] = useState<NewContentAlert[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // WebSocket connection for real-time content updates
  const wsUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    : null;

  const { lastMessage } = useWebSocket(wsUrl, {
    onMessage: (message) => {
      if (message.type === 'content_available') {
        const newAlert: NewContentAlert = {
          id: `${message.payload.contentType}-${message.payload.contentId}-${Date.now()}`,
          contentType: message.payload.contentType,
          contentId: message.payload.contentId,
          title: message.payload.title || `New ${ContentTypeUtils.getContentLabel(message.payload.contentType)} Available`,
          description: message.payload.description,
          timestamp: Date.now()
        };

        setAlerts(prev => [newAlert, ...prev.slice(0, 4)]); // Keep max 5 alerts
        setIsVisible(true);

        // Auto-hide after 8 seconds
        setTimeout(() => {
          setAlerts(prev => prev.filter(alert => alert.id !== newAlert.id));
        }, 8000);
      }
    }
  });

  useEffect(() => {
    if (alerts.length > 0) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [alerts]);

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const navigateToContent = (alert: NewContentAlert) => {
    const url = ContentTypeUtils.getContentUrl(alert.contentType, alert.contentId);
    if (url !== '/') {
      window.location.href = url;
    }
    dismissAlert(alert.id);
  };

  if (!isVisible || alerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-white border border-green-200 rounded-lg shadow-lg p-4 max-w-sm animate-slide-in-right"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="text-2xl">
                {ContentTypeUtils.getContentIcon(alert.contentType)}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-gray-900 text-sm">{alert.title}</h4>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    New
                  </span>
                </div>
                {alert.description && (
                  <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                )}
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => navigateToContent(alert)}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                  >
                    View Now
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => dismissAlert(alert.id)}
                    className="text-xs px-3 py-1"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}