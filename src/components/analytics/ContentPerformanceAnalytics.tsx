'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ContentPerformanceProps {
  dateRange: { startDate: string; endDate: string };
  eventId: string;
  realTimeEnabled: boolean;
}

interface ContentView {
  contentId: string;
  contentType: string;
  views: number;
  clicks: number;
  completions: number;
  shares: number;
  avgDuration: number;
  engagementRate: number;
}

interface ContentEngagement {
  contentType: string;
  totalInteractions: number;
  uniqueUsers: number;
}

interface PopularContent {
  contentId: string;
  contentType: string;
  totalEngagement: number;
  uniqueUsers: number;
  avgEngagementTime: number;
}

interface TimingPattern {
  hour: number;
  interactions: number;
}

interface ContentPerformanceData {
  contentViews: ContentView[];
  engagementByType: ContentEngagement[];
  popularContent: PopularContent[];
  timingPatterns: TimingPattern[];
}

export default function ContentPerformanceAnalytics({ dateRange, eventId, realTimeEnabled }: ContentPerformanceProps) {
  const [data, setData] = useState<ContentPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'content' | 'timing' | 'trending'>('overview');

  useEffect(() => {
    fetchContentPerformanceData();
    
    if (realTimeEnabled) {
      const interval = setInterval(fetchContentPerformanceData, 45000); // Update every 45 seconds
      return () => clearInterval(interval);
    }
  }, [dateRange, eventId, realTimeEnabled]);

  const fetchContentPerformanceData = async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        type: 'content_performance',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(eventId && { eventId })
      });

      const response = await fetch(`/api/admin/analytics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch content performance data');
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to load data');
      }
    } catch (err) {
      console.error('Content performance data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content performance data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getContentIcon = (contentType: string): string => {
    const icons: Record<string, string> = {
      chapter: '📖',
      card: '🃏',
      video: '🎥',
      poll: '📊',
      ar: '🥽',
      image: '🖼️',
      audio: '🎵'
    };
    return icons[contentType] || '📄';
  };

  const getEngagementColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-400';
    if (rate >= 60) return 'text-yellow-400';
    if (rate >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-700 rounded w-1/3 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-gray-900 border-gray-700 animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-6 bg-gray-700 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-900/20 border-red-500/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-300 mb-2">Error Loading Content Performance</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchContentPerformanceData}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header with View Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Content Performance Analytics</h2>
        <div className="flex items-center gap-2">
          {['overview', 'content', 'timing', 'trending'].map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view as any)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedView === view
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Overview View */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Content Type Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.engagementByType.map((type) => (
              <Card key={type.contentType} className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    {getContentIcon(type.contentType)} {type.contentType.charAt(0).toUpperCase() + type.contentType.slice(1)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Total Interactions</span>
                      <span className="text-lg font-bold text-white">
                        {formatNumber(type.totalInteractions)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Unique Users</span>
                      <span className="text-lg font-bold text-blue-400">
                        {formatNumber(type.uniqueUsers)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Avg per User</span>
                      <span className="text-lg font-bold text-green-400">
                        {type.uniqueUsers > 0 ? (type.totalInteractions / type.uniqueUsers).toFixed(1) : '0'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Top Performing Content */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Top Performing Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.popularContent.slice(0, 5).map((content, index) => (
                  <div key={content.contentId} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          {getContentIcon(content.contentType)}
                          {content.contentType} - {content.contentId}
                        </div>
                        <div className="text-sm text-gray-400">
                          {content.uniqueUsers} users • {formatDuration(content.avgEngagementTime)} avg time
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        {formatNumber(content.totalEngagement)}
                      </div>
                      <div className="text-sm text-gray-400">interactions</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content View */}
      {selectedView === 'content' && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Detailed Content Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.contentViews.map((content) => (
                <div key={`${content.contentType}-${content.contentId}`} className="p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-white flex items-center gap-2">
                      {getContentIcon(content.contentType)}
                      {content.contentType} - {content.contentId}
                    </h4>
                    <div className={`text-lg font-bold ${getEngagementColor(content.engagementRate)}`}>
                      {content.engagementRate}%
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Views</div>
                      <div className="text-white font-semibold">{formatNumber(content.views)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Clicks</div>
                      <div className="text-blue-400 font-semibold">{formatNumber(content.clicks)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Completions</div>
                      <div className="text-green-400 font-semibold">{formatNumber(content.completions)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Shares</div>
                      <div className="text-purple-400 font-semibold">{formatNumber(content.shares)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Avg Duration</div>
                      <div className="text-yellow-400 font-semibold">{formatDuration(content.avgDuration)}</div>
                    </div>
                  </div>
                  
                  {/* Engagement funnel visualization */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 text-xs text-gray-400">Views</div>
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                      <div className="w-12 text-xs text-white text-right">{content.views}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 text-xs text-gray-400">Clicks</div>
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${content.views > 0 ? (content.clicks / content.views) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <div className="w-12 text-xs text-blue-400 text-right">{content.clicks}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 text-xs text-gray-400">Complete</div>
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${content.views > 0 ? (content.completions / content.views) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <div className="w-12 text-xs text-green-400 text-right">{content.completions}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timing View */}
      {selectedView === 'timing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hourly Activity Pattern */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Activity by Hour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.timingPatterns.map((pattern) => {
                  const maxInteractions = Math.max(...data.timingPatterns.map(p => p.interactions));
                  const percentage = maxInteractions > 0 ? (pattern.interactions / maxInteractions) * 100 : 0;
                  
                  return (
                    <div key={pattern.hour} className="flex items-center gap-3">
                      <div className="w-12 text-sm text-gray-400 text-right">
                        {pattern.hour.toString().padStart(2, '0')}:00
                      </div>
                      <div className="flex-1 bg-gray-700 rounded-full h-4">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="w-16 text-sm text-white text-right">
                        {formatNumber(pattern.interactions)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Peak Hours Analysis */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Peak Activity Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.timingPatterns
                  .sort((a, b) => b.interactions - a.interactions)
                  .slice(0, 6)
                  .map((pattern, index) => (
                    <div key={pattern.hour} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 bg-orange-600 rounded-full text-white font-bold text-xs">
                          {index + 1}
                        </div>
                        <div className="font-medium text-white">
                          {pattern.hour.toString().padStart(2, '0')}:00 - {(pattern.hour + 1).toString().padStart(2, '0')}:00
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-orange-400">
                          {formatNumber(pattern.interactions)}
                        </div>
                        <div className="text-sm text-gray-400">interactions</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trending View */}
      {selectedView === 'trending' && (
        <div className="space-y-6">
          {/* Trending Content */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">🔥 Trending Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.popularContent.slice(0, 8).map((content, index) => (
                  <div key={content.contentId} className="p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getContentIcon(content.contentType)}</span>
                        <span className="font-medium text-white text-sm">
                          {content.contentType} - {content.contentId}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">#{index + 1}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-gray-400">Engagement</div>
                        <div className="text-white font-semibold">{formatNumber(content.totalEngagement)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Users</div>
                        <div className="text-blue-400 font-semibold">{formatNumber(content.uniqueUsers)}</div>
                      </div>
                    </div>
                    
                    {/* Trend indicator */}
                    <div className="mt-2 flex items-center gap-1">
                      <div className="text-green-400 text-xs">📈</div>
                      <div className="text-xs text-green-400">Trending up</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Content Performance Comparison */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.engagementByType.map((type) => {
                  const totalEngagement = data.engagementByType.reduce((sum, t) => sum + t.totalInteractions, 0);
                  const percentage = totalEngagement > 0 ? (type.totalInteractions / totalEngagement) * 100 : 0;
                  
                  return (
                    <div key={type.contentType} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium flex items-center gap-2">
                          {getContentIcon(type.contentType)}
                          {type.contentType.charAt(0).toUpperCase() + type.contentType.slice(1)}
                        </span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">{percentage.toFixed(1)}%</div>
                          <div className="text-sm text-gray-400">{formatNumber(type.totalInteractions)}</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Refresh Info */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date().toLocaleString()}
        {realTimeEnabled && ' • Updates every 45 seconds'}
      </div>
    </div>
  );
}