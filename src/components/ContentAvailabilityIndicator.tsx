'use client';

import React, { useState, useEffect } from 'react';
import { ContentAvailabilityService, ContentTypeUtils } from '@/lib/contentAvailability';
import { useWebSocket } from '@/hooks/useWebSocket';

interface ContentAvailabilityIndicatorProps {
  contentType: string;
  contentId: string;
  children: React.ReactNode;
  showScheduledTime?: boolean;
  onContentAvailable?: () => void;
}

export default function ContentAvailabilityIndicator({
  contentType,
  contentId,
  children,
  showScheduledTime = true,
  onContentAvailable
}: ContentAvailabilityIndicatorProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [reason, setReason] = useState<string>('');

  // WebSocket connection for real-time updates
  const wsUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    : null;

  const { lastMessage } = useWebSocket(wsUrl, {
    onMessage: (message) => {
      if (message.type === 'content_available' && 
          message.payload?.contentType === contentType && 
          message.payload?.contentId === contentId) {
        setIsAvailable(true);
        setScheduledFor(null);
        setReason('');
        onContentAvailable?.();
      }
    }
  });

  useEffect(() => {
    checkAvailability();
  }, [contentType, contentId]);

  const checkAvailability = async () => {
    setIsLoading(true);
    try {
      const status = await ContentAvailabilityService.isContentAvailable(contentType, contentId);
      setIsAvailable(status.isAvailable);
      setScheduledFor(status.scheduledFor || null);
      setReason(status.reason || '');
    } catch (error) {
      console.error('Error checking content availability:', error);
      setIsAvailable(false);
      setReason('Unable to check availability');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentClick = async () => {
    if (isAvailable) {
      // Mark content as accessed for analytics
      await ContentAvailabilityService.markContentAccessed(contentType, contentId);
    }
  };

  if (isLoading) {
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-600">Checking availability...</span>
          </div>
        </div>
      </div>
    );
  }

  if (isAvailable) {
    return (
      <div className="relative group" onClick={handleContentClick}>
        {children}
        <div className="absolute -top-2 -right-2 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="opacity-40 pointer-events-none filter grayscale">
        {children}
      </div>
      
      {/* Overlay with scheduling information */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
        <div className="text-center text-white p-4">
          <div className="text-lg mb-2">
            {ContentTypeUtils.getContentIcon(contentType)}
          </div>
          
          {scheduledFor && showScheduledTime ? (
            <div>
              <div className="text-sm font-medium mb-1">Coming Soon</div>
              <div className="text-xs opacity-90">
                {ContentTypeUtils.formatScheduledTime(scheduledFor)}
              </div>
            </div>
          ) : (
            <div className="text-sm font-medium">
              {reason || 'Not Available'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}