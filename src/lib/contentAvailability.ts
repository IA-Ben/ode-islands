// Content availability service for checking user access to scheduled content
import { apiCallWithCSRF } from './csrfUtils';

export interface AvailableContent {
  contentType: string;
  contentId: string;
  scheduleId: string;
  accessGrantedAt: string;
  personalizedData?: any;
  abTestVariant?: string;
}

export interface ContentAccessStatus {
  isAvailable: boolean;
  scheduledFor?: string;
  reason?: string;
  nextCheckTime?: string;
}

export class ContentAvailabilityService {
  private static cache = new Map<string, { data: any; expiry: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if specific content is available for the current user
   */
  static async isContentAvailable(contentType: string, contentId: string): Promise<ContentAccessStatus> {
    const cacheKey = `${contentType}:${contentId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    try {
      const response = await apiCallWithCSRF(
        `/api/content/availability?contentType=${contentType}&contentId=${contentId}`
      );
      
      if (!response.ok) {
        return { isAvailable: false, reason: 'Error checking availability' };
      }

      const data = await response.json();
      const status: ContentAccessStatus = {
        isAvailable: data.isAvailable,
        scheduledFor: data.scheduledFor,
        reason: data.reason,
        nextCheckTime: data.nextCheckTime
      };

      // Cache the result
      this.cache.set(cacheKey, { data: status, expiry: Date.now() + this.CACHE_TTL });
      
      return status;
    } catch (error) {
      console.error('Error checking content availability:', error);
      return { isAvailable: false, reason: 'Service unavailable' };
    }
  }

  /**
   * Get all available content for the current user
   */
  static async getUserAvailableContent(): Promise<AvailableContent[]> {
    try {
      const response = await apiCallWithCSRF('/api/content/available');
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.availableContent || [];
    } catch (error) {
      console.error('Error fetching available content:', error);
      return [];
    }
  }

  /**
   * Get upcoming scheduled content for the current user
   */
  static async getUpcomingContent(limit: number = 10): Promise<Array<{
    contentType: string;
    contentId: string;
    title: string;
    scheduledFor: string;
    description?: string;
  }>> {
    try {
      const response = await apiCallWithCSRF(`/api/content/upcoming?limit=${limit}`);
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.upcomingContent || [];
    } catch (error) {
      console.error('Error fetching upcoming content:', error);
      return [];
    }
  }

  /**
   * Check if user meets conditions for specific content
   */
  static async checkContentConditions(contentType: string, contentId: string): Promise<{
    canAccess: boolean;
    missingConditions: Array<{
      type: string;
      description: string;
      progress?: number;
    }>;
  }> {
    try {
      const response = await apiCallWithCSRF(
        `/api/content/conditions?contentType=${contentType}&contentId=${contentId}`
      );
      
      if (!response.ok) {
        return { canAccess: false, missingConditions: [] };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking content conditions:', error);
      return { canAccess: false, missingConditions: [] };
    }
  }

  /**
   * Clear cache for specific content or all content
   */
  static clearCache(contentType?: string, contentId?: string): void {
    if (contentType && contentId) {
      this.cache.delete(`${contentType}:${contentId}`);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Subscribe to content availability updates via WebSocket
   */
  static subscribeToContentUpdates(callback: (update: {
    type: 'content_available' | 'content_scheduled' | 'content_conditions_met';
    contentType: string;
    contentId: string;
    data: any;
  }) => void): () => void {
    // This would integrate with the existing WebSocket system
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'content_update') {
          callback(message.payload);
          // Clear relevant cache entries
          this.clearCache(message.payload.contentType, message.payload.contentId);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    // Add event listener to existing WebSocket connection
    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }

    return () => {};
  }

  /**
   * Mark content as accessed by user
   */
  static async markContentAccessed(contentType: string, contentId: string): Promise<void> {
    try {
      await apiCallWithCSRF('/api/content/accessed', {
        method: 'POST',
        body: JSON.stringify({ contentType, contentId })
      });
    } catch (error) {
      console.error('Error marking content as accessed:', error);
    }
  }

  /**
   * Get content access analytics for user
   */
  static async getUserContentAnalytics(): Promise<{
    totalAccessed: number;
    recentlyAccessed: Array<{
      contentType: string;
      contentId: string;
      accessedAt: string;
    }>;
    upcomingCount: number;
  }> {
    try {
      const response = await apiCallWithCSRF('/api/content/analytics');
      
      if (!response.ok) {
        return { totalAccessed: 0, recentlyAccessed: [], upcomingCount: 0 };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching content analytics:', error);
      return { totalAccessed: 0, recentlyAccessed: [], upcomingCount: 0 };
    }
  }
}

// Utility functions for content type handling
export const ContentTypeUtils = {
  getContentLabel(contentType: string): string {
    const labels: Record<string, string> = {
      chapter: 'Chapter',
      poll: 'Poll',
      certificate: 'Certificate',
      event: 'Event',
      memory: 'Memory',
      notification: 'Notification'
    };
    return labels[contentType] || contentType;
  },

  getContentIcon(contentType: string): string {
    const icons: Record<string, string> = {
      chapter: '📖',
      poll: '📊',
      certificate: '🏆',
      event: '🎉',
      memory: '💭',
      notification: '🔔'
    };
    return icons[contentType] || '📄';
  },

  getContentUrl(contentType: string, contentId: string): string {
    const urls: Record<string, (id: string) => string> = {
      chapter: (id) => `/before/${id}`,
      poll: (id) => `/event#poll-${id}`,
      certificate: (id) => `/certificates/${id}`,
      event: () => '/event',
      memory: (id) => `/after#memory-${id}`,
      notification: () => '/'
    };
    
    const urlGenerator = urls[contentType];
    return urlGenerator ? urlGenerator(contentId) : '/';
  },

  formatScheduledTime(scheduledFor: string): string {
    const date = new Date(scheduledFor);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) {
      return 'Available now';
    }
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `Available in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `Available in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `Available in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return 'Available very soon';
    }
  }
};