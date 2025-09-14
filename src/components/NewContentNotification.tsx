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
    <div className="fixed top-6 right-6 z-50 space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-white/95 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl p-6 max-w-sm animate-slide-in-right overflow-hidden"
          style={{
            animation: 'slideInRight 0.4s ease-out'
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              {/* Content Icon - Professional Design */}
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <div className="text-white text-lg">
                  {ContentTypeUtils.getContentIcon(alert.contentType)}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 text-sm leading-5 pr-2">{alert.title}</h4>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 whitespace-nowrap">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></div>
                    New
                  </span>
                </div>
                
                {alert.description && (
                  <p className="text-sm text-gray-600 mb-3 leading-relaxed">{alert.description}</p>
                )}
                
                {/* Action Buttons - Professional Design */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigateToContent(alert)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Now
                  </button>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-all duration-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
            
            {/* Close Button - Clean Design */}
            <button
              onClick={() => dismissAlert(alert.id)}
              className="text-gray-400 hover:text-gray-600 ml-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}