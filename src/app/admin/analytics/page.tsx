'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAnalyticsWebSocket } from '@/hooks/useAnalyticsWebSocket';

// Analytics component imports (we'll create these next)
import OverviewDashboard from '@/components/analytics/OverviewDashboard';
import UserEngagementAnalytics from '@/components/analytics/UserEngagementAnalytics';
import ContentPerformanceAnalytics from '@/components/analytics/ContentPerformanceAnalytics';
import InteractiveFeaturesAnalytics from '@/components/analytics/InteractiveFeaturesAnalytics';
import EventManagementDashboard from '@/components/analytics/EventManagementDashboard';
import AdvancedAnalytics from '@/components/analytics/AdvancedAnalytics';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
}

type AnalyticsTab = 'overview' | 'user_engagement' | 'content_performance' | 'interactive_features' | 'event_management' | 'advanced';

interface DateRange {
  startDate: string;
  endDate: string;
}

export default function AdminAnalyticsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);

  // Real-time analytics WebSocket connection
  const {
    connectionStatus,
    realTimeMetrics,
    alerts,
    activityFeed,
    subscribeToEvent,
    unsubscribeFromEvent,
    dismissAlert,
    clearActivityFeed,
    isConnected
  } = useAnalyticsWebSocket({
    enabled: realTimeEnabled,
    onRealTimeUpdate: (data) => {
      console.log('Real-time analytics update:', data);
    },
    onSystemAlert: (alert) => {
      console.log('System alert:', alert);
    },
    onUserActivity: (activity) => {
      console.log('User activity:', activity);
    }
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check if user is authenticated and has admin privileges
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        if (userData.isAdmin) {
          setUser(userData);
        } else {
          window.location.href = '/cms'; // Redirect to CMS if not admin
        }
      } else {
        window.location.href = '/cms'; // Redirect to login if not authenticated
      }
    } catch (error) {
      console.error('Auth check error:', error);
      window.location.href = '/cms';
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
  };

  // Handle real-time toggle
  const handleRealTimeToggle = () => {
    setRealTimeEnabled(!realTimeEnabled);
    if (selectedEventId) {
      if (!realTimeEnabled) {
        subscribeToEvent(selectedEventId);
      } else {
        unsubscribeFromEvent(selectedEventId);
      }
    }
  };

  const handleExportData = async (type: string, format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({
        type: 'export',
        exportType: type,
        format,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(selectedEventId && { eventId: selectedEventId })
      });

      const response = await fetch(`/api/admin/analytics?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${type}_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const tabs = [
    { id: 'overview' as const, name: 'Overview', icon: '📊' },
    { id: 'user_engagement' as const, name: 'User Engagement', icon: '👥' },
    { id: 'content_performance' as const, name: 'Content Performance', icon: '📈' },
    { id: 'interactive_features' as const, name: 'Interactive Features', icon: '🎯' },
    { id: 'event_management' as const, name: 'Event Management', icon: '🎪' },
    { id: 'advanced' as const, name: 'Advanced Analytics', icon: '🔬' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Loading Analytics Dashboard...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">Admin privileges required to access analytics dashboard.</p>
          <Button onClick={() => window.location.href = '/cms'}>Return to CMS</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
              <p className="text-gray-400 mt-1">The Ode Islands - Event Analytics & Insights</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Real-time toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Real-time</span>
                <button
                  onClick={handleRealTimeToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    realTimeEnabled ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      realTimeEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                {realTimeEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs text-green-400">
                      {isConnected ? 'Connected' : 'Connecting...'}
                    </span>
                  </div>
                )}
              </div>

              {/* User info */}
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>

              {/* Back to CMS */}
              <Button
                variant="outline"
                onClick={() => window.location.href = '/cms'}
                className="text-gray-300 border-gray-600 hover:bg-gray-800"
              >
                ← Back to CMS
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="border-b border-gray-800 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Date Range Selector */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">From:</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange({ ...dateRange, startDate: e.target.value })}
                  className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">To:</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange({ ...dateRange, endDate: e.target.value })}
                  className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Event:</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                >
                  <option value="">All Events</option>
                  {/* TODO: Populate with actual events */}
                </select>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportData(activeTab, 'csv')}
                className="text-gray-300 border-gray-600 hover:bg-gray-800"
              >
                📊 Export CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportData(activeTab, 'json')}
                className="text-gray-300 border-gray-600 hover:bg-gray-800"
              >
                📋 Export JSON
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Real-time Alerts */}
      {realTimeEnabled && alerts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="space-y-2">
            {alerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border-l-4 flex items-center justify-between ${
                  alert.type === 'error' ? 'bg-red-900/20 border-red-500' :
                  alert.type === 'warning' ? 'bg-yellow-900/20 border-yellow-500' :
                  'bg-blue-900/20 border-blue-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {alert.type === 'error' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
                  </span>
                  <div>
                    <div className="text-white font-medium">{alert.message}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <OverviewDashboard
              dateRange={dateRange}
              eventId={selectedEventId}
              realTimeEnabled={realTimeEnabled}
              realTimeMetrics={realTimeEnabled ? realTimeMetrics : undefined}
            />
          )}
          
          {activeTab === 'user_engagement' && (
            <UserEngagementAnalytics
              dateRange={dateRange}
              eventId={selectedEventId}
              realTimeEnabled={realTimeEnabled}
            />
          )}
          
          {activeTab === 'content_performance' && (
            <ContentPerformanceAnalytics
              dateRange={dateRange}
              eventId={selectedEventId}
              realTimeEnabled={realTimeEnabled}
            />
          )}
          
          {activeTab === 'interactive_features' && (
            <InteractiveFeaturesAnalytics
              dateRange={dateRange}
              eventId={selectedEventId}
              realTimeEnabled={realTimeEnabled}
            />
          )}
          
          {activeTab === 'event_management' && (
            <EventManagementDashboard
              dateRange={dateRange}
              eventId={selectedEventId}
              realTimeEnabled={realTimeEnabled}
            />
          )}
          
          {activeTab === 'advanced' && (
            <AdvancedAnalytics
              dateRange={dateRange}
              eventId={selectedEventId}
              realTimeEnabled={realTimeEnabled}
            />
          )}
        </div>
      </div>

      {/* Real-time Activity Feed */}
      {realTimeEnabled && activityFeed.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  📊 Live Activity Feed
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearActivityFeed}
                  className="text-gray-400 border-gray-600 hover:bg-gray-800"
                >
                  Clear Feed
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {activityFeed.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-2 bg-gray-800 rounded text-sm">
                    <span className="text-white">{activity.description}</span>
                    <span className="text-gray-400">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-800 bg-gray-900/30 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              © 2025 The Ode Islands Analytics Dashboard
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>Last updated: {new Date().toLocaleString()}</span>
              <span>•</span>
              <span>Status: {realTimeEnabled ? '🟢 Live' : '🟡 Static'}</span>
              {realTimeEnabled && (
                <>
                  <span>•</span>
                  <span>Connection: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}