'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import AnimateText from '@/components/AnimateText';

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
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    fetchOverviewData();
    
    // Trigger animation after mount
    const timer = setTimeout(() => setAnimateIn(true), 200);
    
    if (realTimeEnabled) {
      const interval = setInterval(fetchOverviewData, 30000); // Update every 30 seconds
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
    
    return () => clearTimeout(timer);
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
      <div className="space-y-8">
        {/* Loading Header */}
        <div 
          className="text-center"
          style={{
            opacity: 0,
            animation: animateIn ? 'animButtonIn 0.6s 0.2s ease forwards' : 'none'
          }}
        >
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
            <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin mr-3"></div>
            <span className="text-white/80 font-medium">Loading Analytics Dashboard</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            <AnimateText active={animateIn} delay={500}>Overview Dashboard</AnimateText>
          </h2>
          <p className="text-white/70">Gathering analytics data and performance metrics...</p>
        </div>

        {/* Loading Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i} 
              className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 animate-pulse"
              style={{
                opacity: 0,
                animation: animateIn ? `animButtonIn 0.6s ${0.6 + i * 0.1}s ease forwards` : 'none'
              }}
            >
              <div className="h-4 bg-white/20 rounded-lg w-3/4 mb-4"></div>
              <div className="h-8 bg-white/30 rounded-lg w-1/2 mb-3"></div>
              <div className="h-3 bg-white/15 rounded-lg w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">
            <AnimateText active={animateIn} delay={200}>Overview Dashboard</AnimateText>
          </h2>
        </div>
        
        <div 
          className="max-w-md mx-auto bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 text-center"
          style={{
            opacity: 0,
            animation: animateIn ? 'animButtonIn 0.6s 0.4s ease forwards' : 'none'
          }}
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">
            <AnimateText active={animateIn} delay={600}>Analytics Unavailable</AnimateText>
          </h3>
          <p className="text-white/70 mb-6 leading-relaxed">{error}</p>
          <button
            onClick={fetchOverviewData}
            className="group relative overflow-hidden bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/30 hover:border-white/50"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Retry Loading</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Professional chart colors - Lumus-inspired palette
  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const professionalColors = {
    primary: '#3b82f6',
    success: '#10b981', 
    warning: '#f59e0b',
    accent: '#8b5cf6',
    neutral: '#64748b',
    text: '#ffffff',
    muted: '#94a3b8'
  };
  
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
    <div className="space-y-8">
      {/* Professional Header */}
      <div 
        className="text-center"
        style={{
          opacity: 0,
          animation: animateIn ? 'animButtonIn 0.6s 0.2s ease forwards' : 'none'
        }}
      >
        <div className="flex items-center justify-center mb-4">
          {realTimeEnabled && (
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 mr-4">
              <span className="flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-300 text-sm font-medium">Live Data</span>
            </div>
          )}
        </div>
        <h2 className="text-4xl font-bold text-white mb-4">
          <AnimateText active={animateIn} delay={400}>Analytics Overview</AnimateText>
        </h2>
        <p className="text-white/70 text-lg max-w-2xl mx-auto">
          <AnimateText active={animateIn} delay={600}>
            Comprehensive insights into user engagement, content performance, and system health
          </AnimateText>
        </p>
      </div>

      {/* Primary Metrics */}
      <div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        style={{
          opacity: 0,
          animation: animateIn ? 'animButtonIn 0.8s 0.8s ease forwards' : 'none'
        }}
      >
        {/* Total Users */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white/70">Total Users</h3>
              </div>
            </div>
            <div className={`text-sm font-medium px-2 py-1 rounded-lg ${getGrowthColor(data.users.growth)} bg-white/10`}>
              {data.users.growth > 0 ? '+' : ''}{data.users.growth.toFixed(1)}%
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {formatNumber(data.users.total)}
          </div>
          <p className="text-sm text-white/60">
            {formatNumber(data.users.active)} active this period
          </p>
        </div>

        {/* Active Users */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
                  Active Users
                  {realTimeEnabled && realTimeMetrics && (
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </h3>
              </div>
            </div>
            <div className="text-sm font-medium px-2 py-1 rounded-lg text-white/60 bg-white/10">
              {data.users.total > 0 ? Math.round((data.users.active / data.users.total) * 100) : 0}%
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-400 mb-2">
            {realTimeEnabled && realTimeMetrics 
              ? formatNumber(realTimeMetrics.activeUsers)
              : formatNumber(data.users.active)
            }
          </div>
          <p className="text-sm text-white/60">
            {realTimeEnabled && realTimeMetrics ? 'currently online' : 'of total users'}
          </p>
          {realTimeEnabled && realTimeMetrics?.lastUpdate && (
            <p className="text-xs text-emerald-400 mt-2 font-medium">
              Updated: {new Date(realTimeMetrics.lastUpdate).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Total Sessions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white/70">Total Sessions</h3>
              </div>
            </div>
            <div className="text-sm font-medium px-2 py-1 rounded-lg text-white/60 bg-white/10">
              {data.users.active > 0 ? (data.sessions.total / data.users.active).toFixed(1) : '0'}/user
            </div>
          </div>
          <div className="text-3xl font-bold text-purple-400 mb-2">
            {formatNumber(data.sessions.total)}
          </div>
          <p className="text-sm text-white/60">
            Avg: {formatDuration(data.sessions.avgDuration)}
          </p>
        </div>

        {/* Content Interactions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white/70">Content Interactions</h3>
              </div>
            </div>
            <div className="text-sm font-medium px-2 py-1 rounded-lg text-white/60 bg-white/10">
              {data.engagement.engagementRate.toFixed(1)}%
            </div>
          </div>
          <div className="text-3xl font-bold text-green-400 mb-2">
            {formatNumber(data.engagement.totalInteractions)}
          </div>
          <p className="text-sm text-white/60">
            Engagement rate
          </p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        style={{
          opacity: 0,
          animation: animateIn ? 'animButtonIn 0.8s 1.2s ease forwards' : 'none'
        }}
      >
        {/* Certificates Issued */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Certificates Issued</h3>
            </div>
          </div>
          <div className="text-3xl font-bold text-yellow-400 mb-3">
            {formatNumber(data.engagement.certificatesIssued)}
          </div>
          <div className="text-sm text-white/70">
            {data.users.active > 0 
              ? `${Math.round((data.engagement.certificatesIssued / data.users.active) * 100)}% of active users`
              : 'No active users'
            }
          </div>
        </div>

        {/* Events Status */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Events Status</h3>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Total Events</span>
              <span className="text-xl font-bold text-white">{data.events.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Active Events</span>
              <span className="text-xl font-bold text-orange-400">{data.events.active}</span>
            </div>
          </div>
        </div>

        {/* Session Analytics */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Session Analytics</h3>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Avg Duration</span>
              <span className="text-xl font-bold text-white">
                {formatDuration(data.sessions.avgDuration)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Sessions/User</span>
              <span className="text-xl font-bold text-blue-400">
                {data.users.active > 0 ? (data.sessions.total / data.users.active).toFixed(1) : '0'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Analytics Summary */}
      <div 
        className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8"
        style={{
          opacity: 0,
          animation: animateIn ? 'animButtonIn 0.8s 1.6s ease forwards' : 'none'
        }}
      >
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-white mb-2">
            <AnimateText active={animateIn} delay={1800}>Performance Insights</AnimateText>
          </h3>
          <p className="text-white/70">Key metrics at a glance</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {data.users.active > 0 ? Math.round((data.users.active / data.users.total) * 100) : 0}%
            </div>
            <div className="text-sm text-white/70">User Activation Rate</div>
          </div>
          <div className="text-center bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {data.sessions.total > 0 ? Math.round(data.engagement.totalInteractions / data.sessions.total) : 0}
            </div>
            <div className="text-sm text-white/70">Interactions/Session</div>
          </div>
          <div className="text-center bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {formatDuration(data.sessions.avgDuration)}
            </div>
            <div className="text-sm text-white/70">Avg Session Time</div>
          </div>
          <div className="text-center bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {data.users.active > 0 ? Math.round((data.engagement.certificatesIssued / data.users.active) * 100) : 0}%
            </div>
            <div className="text-sm text-white/70">Completion Rate</div>
          </div>
        </div>
      </div>

      {/* Professional Data Visualization */}
      <div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        style={{
          opacity: 0,
          animation: animateIn ? 'animButtonIn 0.8s 2.0s ease forwards' : 'none'
        }}
      >
        {/* User Growth Chart */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">User Growth Trend</h3>
              <p className="text-white/70 text-sm">Weekly user acquisition pattern</p>
            </div>
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="name" 
                stroke="rgba(255,255,255,0.7)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.7)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: '#fff',
                  backdropFilter: 'blur(8px)'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="users" 
                stroke={professionalColors.primary} 
                fill={professionalColors.primary} 
                fillOpacity={0.3}
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement Breakdown */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Engagement Breakdown</h3>
              <p className="text-white/70 text-sm">Activity distribution overview</p>
            </div>
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={engagementData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {engagementData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: '#fff',
                  backdropFilter: 'blur(8px)'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Real-time Activity Chart */}
      <div 
        className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 col-span-full"
        style={{
          opacity: 0,
          animation: animateIn ? 'animButtonIn 0.8s 2.4s ease forwards' : 'none'
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">
              <AnimateText active={animateIn} delay={2600}>Real-time Activity Monitor</AnimateText>
            </h3>
            <p className="text-white/70">Live user engagement throughout the day</p>
          </div>
          {realTimeEnabled && (
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30">
              <span className="flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-300 text-sm font-medium">Live Updates</span>
            </div>
          )}
        </div>
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
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="time" 
              stroke="rgba(255,255,255,0.7)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.7)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.8)', 
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                backdropFilter: 'blur(8px)'
              }} 
            />
            <Line 
              type="monotone" 
              dataKey="active" 
              stroke={professionalColors.success} 
              strokeWidth={3}
              dot={{ fill: professionalColors.success, strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, fill: professionalColors.success }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Professional Footer */}
      <div 
        className="text-center bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4"
        style={{
          opacity: 0,
          animation: animateIn ? 'animButtonIn 0.6s 2.8s ease forwards' : 'none'
        }}
      >
        <div className="flex items-center justify-center space-x-4 text-white/60 text-sm">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Last updated: {new Date().toLocaleString()}</span>
          </div>
          {realTimeEnabled && (
            <div className="flex items-center space-x-2 text-emerald-400">
              <span className="flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>Auto-refresh every 30 seconds</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}