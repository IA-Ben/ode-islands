'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ContentAvailabilityService, ContentTypeUtils } from '@/lib/contentAvailability';
import { useUnifiedWebSocket } from '@/contexts/UnifiedWebSocketContext';

interface UpcomingContent {
  contentType: string;
  contentId: string;
  title: string;
  description?: string;
  scheduledFor: string;
}

interface UpcomingContentWidgetProps {
  limit?: number;
  showRefreshButton?: boolean;
  onContentClick?: (content: UpcomingContent) => void;
}

export default function UpcomingContentWidget({
  limit = 5,
  showRefreshButton = true,
  onContentClick
}: UpcomingContentWidgetProps) {
  const [upcomingContent, setUpcomingContent] = useState<UpcomingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use unified WebSocket service for real-time updates
  const { subscribeToTypes } = useUnifiedWebSocket();

  // Subscribe to content scheduling messages
  useEffect(() => {
    const unsubscribe = subscribeToTypes(['content_scheduled', 'content_available'], (message) => {
      if (message.type === 'content_scheduled' || message.type === 'content_available') {
        loadUpcomingContent(); // Refresh the list
      }
    });

    return () => unsubscribe();
  }, [subscribeToTypes]);

  useEffect(() => {
    loadUpcomingContent();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadUpcomingContent, 60000);
    return () => clearInterval(interval);
  }, [limit]);

  const loadUpcomingContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const content = await ContentAvailabilityService.getUpcomingContent(limit);
      setUpcomingContent(content);
    } catch (err) {
      console.error('Error loading upcoming content:', err);
      setError('Failed to load upcoming content');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeUntilRelease = (scheduledFor: string): string => {
    const now = new Date();
    const releaseDate = new Date(scheduledFor);
    const diff = releaseDate.getTime() - now.getTime();

    if (diff <= 0) {
      return 'Available now!';
    }

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m remaining`;
    } else if (minutes > 0) {
      return `${minutes}m remaining`;
    } else {
      return 'Less than 1 minute';
    }
  };

  const getProgressPercentage = (scheduledFor: string): number => {
    // For demonstration, show a progress bar based on how close we are to release
    const now = new Date();
    const releaseDate = new Date(scheduledFor);
    const totalTime = 24 * 60 * 60 * 1000; // Assume 24 hours as full cycle
    const timeRemaining = releaseDate.getTime() - now.getTime();
    
    if (timeRemaining <= 0) return 100;
    if (timeRemaining >= totalTime) return 0;
    
    return Math.max(0, Math.min(100, ((totalTime - timeRemaining) / totalTime) * 100));
  };

  if (loading && upcomingContent.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600">Loading upcoming content...</span>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️ {error}</div>
          <Button size="sm" onClick={loadUpcomingContent}>
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Content</h3>
        {showRefreshButton && (
          <Button
            size="sm"
            variant="outline"
            onClick={loadUpcomingContent}
            disabled={loading}
            className="text-xs"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        )}
      </div>

      {upcomingContent.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-2xl mb-2">🎉</div>
          <p>No upcoming content scheduled</p>
          <p className="text-sm">All available content has been released!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {upcomingContent.map((content, index) => (
            <div
              key={`${content.contentType}-${content.contentId}-${index}`}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onContentClick?.(content)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">
                    {ContentTypeUtils.getContentIcon(content.contentType)}
                  </span>
                  <div>
                    <h4 className="font-medium text-gray-900">{content.title}</h4>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                      {ContentTypeUtils.getContentLabel(content.contentType)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-600">
                    {formatTimeUntilRelease(content.scheduledFor)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(content.scheduledFor).toLocaleDateString()} at{' '}
                    {new Date(content.scheduledFor).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              {content.description && (
                <p className="text-sm text-gray-600 mb-3">{content.description}</p>
              )}

              {/* Progress bar showing time until release */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage(content.scheduledFor)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {upcomingContent.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Content will be automatically available when scheduled
          </p>
        </div>
      )}
    </Card>
  );
}