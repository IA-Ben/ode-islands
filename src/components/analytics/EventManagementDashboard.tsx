'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EventManagementProps {
  dateRange: { startDate: string; endDate: string };
  eventId: string;
  realTimeEnabled: boolean;
}

interface CurrentEvent {
  id: string;
  title: string;
  isActive: boolean;
  participantCount: number;
  startTime: string;
  endTime: string;
}

interface SystemHealth {
  dbResponseTime: number;
  apiResponseTime: number;
  errorRate: number;
  uptime: number;
}

interface LiveMetrics {
  concurrentUsers: number;
  activeConnections: number;
  bandwidthUsage: number;
}

interface EventManagementData {
  currentEvents: CurrentEvent[];
  systemHealth: SystemHealth;
  liveMetrics: LiveMetrics;
}

export default function EventManagementDashboard({ dateRange, eventId, realTimeEnabled }: EventManagementProps) {
  const [data, setData] = useState<EventManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'events' | 'system' | 'monitoring'>('overview');
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
  }>>([]);

  useEffect(() => {
    fetchEventManagementData();
    
    if (realTimeEnabled) {
      const interval = setInterval(fetchEventManagementData, 15000); // Update every 15 seconds
      return () => clearInterval(interval);
    }
  }, [dateRange, eventId, realTimeEnabled]);

  const fetchEventManagementData = async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        type: 'event_management',
        ...(eventId && { eventId })
      });

      const response = await fetch(`/api/admin/analytics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch event management data');
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
        checkForAlerts(result.data);
      } else {
        throw new Error(result.message || 'Failed to load data');
      }
    } catch (err) {
      console.error('Event management data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load event management data');
    } finally {
      setLoading(false);
    }
  };

  const checkForAlerts = (data: EventManagementData) => {
    const newAlerts: typeof alerts = [];
    
    // Check system health
    if (data.systemHealth.errorRate > 5) {
      newAlerts.push({
        id: 'high-error-rate',
        type: 'error',
        message: `High error rate detected: ${data.systemHealth.errorRate.toFixed(1)}%`,
        timestamp: new Date().toISOString()
      });
    }
    
    if (data.systemHealth.dbResponseTime > 1000) {
      newAlerts.push({
        id: 'slow-db',
        type: 'warning',
        message: `Database response time is slow: ${data.systemHealth.dbResponseTime}ms`,
        timestamp: new Date().toISOString()
      });
    }
    
    if (data.liveMetrics.concurrentUsers > 500) {
      newAlerts.push({
        id: 'high-traffic',
        type: 'info',
        message: `High traffic detected: ${data.liveMetrics.concurrentUsers} concurrent users`,
        timestamp: new Date().toISOString()
      });
    }
    
    setAlerts(newAlerts);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getHealthColor = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value <= thresholds.good) return 'text-green-400';
    if (value <= thresholds.warning) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusIcon = (isActive: boolean): string => {
    return isActive ? '🟢' : '🔴';
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
            <h3 className="text-lg font-semibold text-red-300 mb-2">Error Loading Event Management</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchEventManagementData}
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
      {/* Header with View Selector and Emergency Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Event Management Dashboard</h2>
        <div className="flex items-center gap-4">
          {/* View Selector */}
          <div className="flex items-center gap-2">
            {['overview', 'events', 'system', 'monitoring'].map((view) => (
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
          
          {/* Emergency Controls */}
          <Button
            variant="outline"
            size="sm"
            className="text-red-400 border-red-500 hover:bg-red-900/20"
            onClick={() => alert('Emergency controls would be implemented here')}
          >
            🚨 Emergency
          </Button>
        </div>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border-l-4 ${
                alert.type === 'error' ? 'bg-red-900/20 border-red-500' :
                alert.type === 'warning' ? 'bg-yellow-900/20 border-yellow-500' :
                'bg-blue-900/20 border-blue-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-white">{alert.message}</span>
                <span className="text-xs text-gray-400">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overview View */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Live Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  👥 Concurrent Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  {formatNumber(data.liveMetrics.concurrentUsers)}
                </div>
                <div className="text-sm text-gray-400">Currently online</div>
                {realTimeEnabled && (
                  <div className="mt-2 flex items-center gap-2 text-green-400 text-sm">
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  🔗 Active Connections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {formatNumber(data.liveMetrics.activeConnections)}
                </div>
                <div className="text-sm text-gray-400">WebSocket connections</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  📊 System Load
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold mb-2 ${getHealthColor(data.liveMetrics.bandwidthUsage, { good: 50, warning: 80 })}`}>
                  {data.liveMetrics.bandwidthUsage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">Bandwidth usage</div>
              </CardContent>
            </Card>
          </div>

          {/* System Health Overview */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">System Health Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getHealthColor(data.systemHealth.dbResponseTime, { good: 100, warning: 500 })}`}>
                    {data.systemHealth.dbResponseTime}ms
                  </div>
                  <div className="text-sm text-gray-400">DB Response</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getHealthColor(data.systemHealth.apiResponseTime, { good: 50, warning: 200 })}`}>
                    {data.systemHealth.apiResponseTime}ms
                  </div>
                  <div className="text-sm text-gray-400">API Response</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getHealthColor(data.systemHealth.errorRate, { good: 1, warning: 5 })}`}>
                    {data.systemHealth.errorRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">Error Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {data.systemHealth.uptime.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">Uptime</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Events View */}
      {selectedView === 'events' && (
        <div className="space-y-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Current Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.currentEvents.length > 0 ? (
                  data.currentEvents.map((event) => (
                    <div key={event.id} className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getStatusIcon(event.isActive)}</span>
                          <div>
                            <h4 className="font-medium text-white">{event.title}</h4>
                            <div className="text-sm text-gray-400">
                              {event.isActive ? 'Currently Active' : 'Inactive'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-blue-400">
                            {formatNumber(event.participantCount)}
                          </div>
                          <div className="text-sm text-gray-400">participants</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400">Start Time</div>
                          <div className="text-white">
                            {new Date(event.startTime).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400">End Time</div>
                          <div className="text-white">
                            {new Date(event.endTime).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Event Controls */}
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline" className="text-gray-300">
                          📊 View Details
                        </Button>
                        <Button size="sm" variant="outline" className="text-gray-300">
                          ⚙️ Manage
                        </Button>
                        {event.isActive && (
                          <Button size="sm" variant="outline" className="text-red-400 border-red-500">
                            ⏹️ Stop Event
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🎪</div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Active Events</h3>
                    <p className="text-gray-400 mb-4">There are currently no events running.</p>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      🚀 Create New Event
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System View */}
      {selectedView === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Performance Metrics */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <span className="text-gray-400">Database Response Time</span>
                  <span className={`font-bold ${getHealthColor(data.systemHealth.dbResponseTime, { good: 100, warning: 500 })}`}>
                    {data.systemHealth.dbResponseTime}ms
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <span className="text-gray-400">API Response Time</span>
                  <span className={`font-bold ${getHealthColor(data.systemHealth.apiResponseTime, { good: 50, warning: 200 })}`}>
                    {data.systemHealth.apiResponseTime}ms
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <span className="text-gray-400">Error Rate</span>
                  <span className={`font-bold ${getHealthColor(data.systemHealth.errorRate, { good: 1, warning: 5 })}`}>
                    {data.systemHealth.errorRate.toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <span className="text-gray-400">System Uptime</span>
                  <span className="font-bold text-green-400">
                    {data.systemHealth.uptime.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resource Usage */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Resource Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Bandwidth Usage</span>
                    <span className="text-white">{data.liveMetrics.bandwidthUsage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        data.liveMetrics.bandwidthUsage <= 50 ? 'bg-green-500' :
                        data.liveMetrics.bandwidthUsage <= 80 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${data.liveMetrics.bandwidthUsage}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Active Connections</span>
                    <span className="text-white">{data.liveMetrics.activeConnections}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    WebSocket connections currently active
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Concurrent Users</span>
                    <span className="text-white">{data.liveMetrics.concurrentUsers}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Users actively using the platform
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monitoring View */}
      {selectedView === 'monitoring' && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Live Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Real-time Metrics */}
              <div className="space-y-4">
                <h4 className="font-medium text-white">Real-time Metrics</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                    <span className="text-sm text-gray-400">Current Users</span>
                    <span className="text-blue-400 font-bold">{data.liveMetrics.concurrentUsers}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                    <span className="text-sm text-gray-400">Active Sessions</span>
                    <span className="text-green-400 font-bold">{data.liveMetrics.activeConnections}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                    <span className="text-sm text-gray-400">System Load</span>
                    <span className={`font-bold ${getHealthColor(data.liveMetrics.bandwidthUsage, { good: 50, warning: 80 })}`}>
                      {data.liveMetrics.bandwidthUsage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="space-y-4">
                <h4 className="font-medium text-white">System Status</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-white">Database Connection</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-white">WebSocket Server</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-white">Object Storage</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${data.systemHealth.errorRate < 5 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-white">Error Rate Normal</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Refresh Info */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date().toLocaleString()}
        {realTimeEnabled && ' • Updates every 15 seconds'}
      </div>
    </div>
  );
}