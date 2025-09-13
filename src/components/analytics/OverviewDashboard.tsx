'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

interface OverviewProps {
  dateRange: { startDate: string; endDate: string };
  eventId: string;
  realTimeEnabled: boolean;
  realTimeMetrics?: {
    activeUsers: number;
    activeConnections: number;
    systemLoad: number;
    lastUpdate: string | null;
  };
}

interface OverviewData {
  users: {
    total: number;
    active: number;
    growth: number;
  };
  sessions: {
    total: number;
    avgDuration: number;
    avgPerUser: number;
  };
  engagement: {
    totalInteractions: number;
    certificatesIssued: number;
    engagementRate: number;
  };
  events: {
    total: number;
    active: number;
  };
}

export default function OverviewDashboard({ dateRange, eventId, realTimeEnabled, realTimeMetrics }: OverviewProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverviewData();
    
    if (realTimeEnabled) {
      const interval = setInterval(fetchOverviewData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [dateRange, eventId, realTimeEnabled]);

  const fetchOverviewData = async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        type: 'overview',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(eventId && { eventId })
      });

      const response = await fetch(`/api/admin/analytics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch overview data');
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to load data');
      }
    } catch (err) {
      console.error('Overview data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load overview data');
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

  const getGrowthColor = (growth: number): string => {
    if (growth > 0) return 'text-green-400';
    if (growth < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="bg-gray-900 border-gray-700 animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-900/20 border-red-500/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-300 mb-2">Error Loading Overview</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchOverviewData}
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

  // Chart data
  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  const userGrowthData = [
    { name: 'Week 1', users: data.users.total * 0.2 },
    { name: 'Week 2', users: data.users.total * 0.4 },
    { name: 'Week 3', users: data.users.total * 0.7 },
    { name: 'Week 4', users: data.users.total },
  ];

  const engagementData = [
    { name: 'Sessions', value: data.sessions.total, color: '#3b82f6' },
    { name: 'Interactions', value: data.engagement.totalInteractions, color: '#10b981' },
    { name: 'Certificates', value: data.engagement.certificatesIssued, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Overview Dashboard</h2>
        {realTimeEnabled && (
          <div className="flex items-center gap-2 text-green-400">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-sm">Live Data</span>
          </div>
        )}
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold text-white">
                {formatNumber(data.users.total)}
              </div>
              <div className={`text-sm ${getGrowthColor(data.users.growth)}`}>
                {data.users.growth > 0 ? '+' : ''}{data.users.growth.toFixed(1)}%
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {formatNumber(data.users.active)} active in period
            </p>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              Active Users
              {realTimeEnabled && realTimeMetrics && (
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold text-blue-400">
                {realTimeEnabled && realTimeMetrics 
                  ? formatNumber(realTimeMetrics.activeUsers)
                  : formatNumber(data.users.active)
                }
              </div>
              <div className="text-sm text-gray-400">
                {data.users.total > 0 ? Math.round((data.users.active / data.users.total) * 100) : 0}%
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {realTimeEnabled && realTimeMetrics ? 'currently online' : 'of total users'}
            </p>
            {realTimeEnabled && realTimeMetrics?.lastUpdate && (
              <p className="text-xs text-green-400 mt-1">
                Updated: {new Date(realTimeMetrics.lastUpdate).toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Total Sessions */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold text-purple-400">
                {formatNumber(data.sessions.total)}
              </div>
              <div className="text-sm text-gray-400">
                {data.users.active > 0 ? (data.sessions.total / data.users.active).toFixed(1) : '0'}/user
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Avg: {formatDuration(data.sessions.avgDuration)}
            </p>
          </CardContent>
        </Card>

        {/* Content Interactions */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Content Interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold text-green-400">
                {formatNumber(data.engagement.totalInteractions)}
              </div>
              <div className="text-sm text-gray-400">
                {data.engagement.engagementRate.toFixed(1)}%
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Engagement rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Certificates Issued */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              🏆 Certificates Issued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400 mb-2">
              {formatNumber(data.engagement.certificatesIssued)}
            </div>
            <div className="text-sm text-gray-400">
              {data.users.active > 0 
                ? `${Math.round((data.engagement.certificatesIssued / data.users.active) * 100)}% of active users`
                : 'No active users'
              }
            </div>
          </CardContent>
        </Card>

        {/* Events Status */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              🎪 Events Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Total Events</span>
              <span className="text-lg font-semibold text-white">{data.events.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Active Events</span>
              <span className="text-lg font-semibold text-orange-400">{data.events.active}</span>
            </div>
          </CardContent>
        </Card>

        {/* Session Analytics */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              ⏱️ Session Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Avg Duration</span>
              <span className="text-lg font-semibold text-white">
                {formatDuration(data.sessions.avgDuration)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Sessions/User</span>
              <span className="text-lg font-semibold text-blue-400">
                {data.users.active > 0 ? (data.sessions.total / data.users.active).toFixed(1) : '0'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Summary */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">Quick Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {data.users.active > 0 ? Math.round((data.users.active / data.users.total) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-400">User Activation Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {data.sessions.total > 0 ? Math.round(data.engagement.totalInteractions / data.sessions.total) : 0}
              </div>
              <div className="text-sm text-gray-400">Interactions/Session</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {formatDuration(data.sessions.avgDuration)}
              </div>
              <div className="text-sm text-gray-400">Avg Session Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {data.users.active > 0 ? Math.round((data.engagement.certificatesIssued / data.users.active) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-400">Completion Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">User Growth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Engagement Breakdown */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Engagement Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={engagementData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {engagementData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Metrics Chart */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">Real-time Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={[
                { time: '12:00', active: Math.floor(data.users.active * 0.8) },
                { time: '13:00', active: Math.floor(data.users.active * 0.9) },
                { time: '14:00', active: data.users.active },
                { time: '15:00', active: Math.floor(data.users.active * 1.1) },
                { time: '16:00', active: Math.floor(data.users.active * 0.95) },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="active" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Data Refresh Info */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date().toLocaleString()}
        {realTimeEnabled && ' • Updates every 30 seconds'}
      </div>
    </div>
  );
}