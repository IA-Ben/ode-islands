'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Funnel, FunnelChart
} from 'recharts';
import AnimateText from '@/components/AnimateText';

interface UserEngagementProps {
  dateRange: { startDate: string; endDate: string };
  eventId: string;
  realTimeEnabled: boolean;
}

interface ChapterProgress {
  chapterId: string;
  completions: number;
  avgTimeSpent: number;
}

interface DropoffAnalysis {
  chapterId: string;
  cardIndex: number;
  views: number;
  completions: number;
  completionRate: number;
}

interface DailyActivity {
  date: string;
  uniqueUsers: number;
  totalSessions: number;
}

interface SessionDuration {
  durationRange: string;
  count: number;
}

interface UserEngagementData {
  chapterProgress: ChapterProgress[];
  dailyActivity: DailyActivity[];
  dropoffAnalysis: DropoffAnalysis[];
  certificates: Array<{
    certificateType: string;
    count: number;
    recentlyIssued: number;
  }>;
  sessionDuration: SessionDuration[];
}

export default function UserEngagementAnalytics({ dateRange, eventId, realTimeEnabled }: UserEngagementProps) {
  const [data, setData] = useState<UserEngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'progress' | 'dropoff' | 'sessions'>('overview');
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    fetchUserEngagementData();
    
    // Trigger animation after mount
    const timer = setTimeout(() => setAnimateIn(true), 200);
    
    if (realTimeEnabled) {
      const interval = setInterval(fetchUserEngagementData, 60000); // Update every minute
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
    
    return () => clearTimeout(timer);
  }, [dateRange, eventId, realTimeEnabled]);

  const fetchUserEngagementData = async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        type: 'user_engagement',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(eventId && { eventId })
      });

      const response = await fetch(`/api/admin/analytics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user engagement data');
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to load data');
      }
    } catch (err) {
      console.error('User engagement data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user engagement data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getCompletionColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-400';
    if (rate >= 60) return 'text-yellow-400';
    if (rate >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  // Professional chart colors - Lumus-inspired palette
  const professionalColors = {
    primary: '#3b82f6',
    success: '#10b981', 
    warning: '#f59e0b',
    accent: '#8b5cf6',
    neutral: '#64748b',
    text: '#ffffff',
    muted: '#94a3b8'
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
            <span className="text-white/80 font-medium">Loading User Engagement Analytics</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            <AnimateText active={animateIn} delay={500}>User Engagement Dashboard</AnimateText>
          </h2>
          <p className="text-white/70">Analyzing user behavior, progress, and engagement patterns...</p>
        </div>

        {/* Loading Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
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
            <AnimateText active={animateIn} delay={200}>User Engagement Dashboard</AnimateText>
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
            onClick={fetchUserEngagementData}
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
        {realTimeEnabled && (
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 mb-4">
            <span className="flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-300 text-sm font-medium">Live Data</span>
          </div>
        )}
        <h2 className="text-4xl font-bold text-white mb-4">
          <AnimateText active={animateIn} delay={400}>User Engagement Analytics</AnimateText>
        </h2>
        <p className="text-white/70 text-lg max-w-2xl mx-auto mb-8">
          <AnimateText active={animateIn} delay={600}>
            Deep insights into user behavior, progress patterns, and engagement metrics
          </AnimateText>
        </p>
        
        {/* Professional View Selector */}
        <div 
          className="inline-flex bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-2"
          style={{
            opacity: 0,
            animation: animateIn ? 'animButtonIn 0.6s 0.8s ease forwards' : 'none'
          }}
        >
          {['overview', 'progress', 'dropoff', 'sessions'].map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view as any)}
              className={`relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                selectedView === view
                  ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Overview View */}
      {selectedView === 'overview' && (
        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          style={{
            opacity: 0,
            animation: animateIn ? 'animButtonIn 0.8s 1.0s ease forwards' : 'none'
          }}
        >
          {/* Chapter Progress Summary */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Chapter Progress</h3>
                <p className="text-white/70 text-sm">Completion analytics</p>
              </div>
            </div>
            <div className="space-y-4">
              {data.chapterProgress.slice(0, 5).map((chapter) => (
                <div key={chapter.chapterId} className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="text-sm text-white/80 capitalize font-medium">
                    {chapter.chapterId.replace('-', ' ')}
                  </span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      {formatNumber(chapter.completions)}
                    </div>
                    <div className="text-xs text-white/60">
                      {formatDuration(chapter.avgTimeSpent)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session Duration Distribution */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Session Duration</h3>
                <p className="text-white/70 text-sm">User engagement time</p>
              </div>
            </div>
            <div className="space-y-4">
              {data.sessionDuration.map((duration) => {
                const total = data.sessionDuration.reduce((sum, d) => sum + d.count, 0);
                const percentage = total > 0 ? (duration.count / total) * 100 : 0;
                
                return (
                  <div key={duration.durationRange} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-white/80 font-medium">{duration.durationRange}</span>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">{duration.count}</div>
                        <div className="text-xs text-white/60">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-purple-400 to-purple-500 h-3 rounded-full transition-all duration-500 shadow-lg"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Certificate Achievements */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Certificates</h3>
                <p className="text-white/70 text-sm">Achievement tracking</p>
              </div>
            </div>
            <div className="space-y-4">
              {data.certificates.map((cert) => (
                <div key={cert.certificateType} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/80 font-medium capitalize">
                      {cert.certificateType.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="text-right">
                      <div className="text-lg font-bold text-amber-400">
                        {cert.count}
                      </div>
                      {cert.recentlyIssued > 0 && (
                        <div className="text-xs text-emerald-400 font-medium">
                          +{cert.recentlyIssued} this week
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-2 rounded-full transition-all duration-300 shadow-lg" style={{ width: `${Math.min(100, (cert.count / Math.max(...data.certificates.map(c => c.count))) * 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Progress View */}
      {selectedView === 'progress' && (
        <div 
          className="space-y-6"
          style={{
            opacity: 0,
            animation: animateIn ? 'animButtonIn 0.8s 1.0s ease forwards' : 'none'
          }}
        >
          {/* Chapter Progress Chart */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Chapter Completion Progress</h3>
                <p className="text-white/70">Track user progress through content chapters</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.chapterProgress} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={professionalColors.success} stopOpacity={0.9}/>
                      <stop offset="95%" stopColor={professionalColors.success} stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                  <XAxis 
                    dataKey="chapterId" 
                    stroke="rgba(255,255,255,0.7)"
                    tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.8)' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.7)" 
                    tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.8)' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.9)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      color: '#fff',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
                    }}
                    formatter={(value, name) => [
                      name === 'completions' ? formatNumber(value as number) : formatDuration(value as number),
                      name === 'completions' ? 'Completions' : 'Avg Time'
                    ]}
                    labelStyle={{ color: 'rgba(255,255,255,0.9)' }}
                  />
                  <Bar 
                    dataKey="completions" 
                    fill="url(#barGradient)" 
                    radius={[6, 6, 0, 0]} 
                    stroke={professionalColors.success}
                    strokeWidth={1}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Activity Chart */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Daily User Activity Trend</h3>
                <p className="text-white/70">Track daily engagement patterns and session trends</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={data.dailyActivity.slice(-14)} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={professionalColors.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={professionalColors.primary} stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="sessionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={professionalColors.success} stopOpacity={0.6}/>
                      <stop offset="95%" stopColor={professionalColors.success} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.7)"
                    tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.8)' }}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.7)" 
                    tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.8)' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.9)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      color: '#fff',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
                    }}
                    labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    labelStyle={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="uniqueUsers" 
                    stackId="1"
                    stroke={professionalColors.primary} 
                    fill="url(#userGradient)"
                    strokeWidth={2}
                    name="Unique Users"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalSessions" 
                    stackId="1"
                    stroke={professionalColors.success} 
                    fill="url(#sessionGradient)"
                    strokeWidth={2}
                    name="Total Sessions"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Dropoff Analysis View */}
      {selectedView === 'dropoff' && (
        <div 
          className="space-y-6"
          style={{
            opacity: 0,
            animation: animateIn ? 'animButtonIn 0.8s 1.0s ease forwards' : 'none'
          }}
        >
          {/* Funnel Chart */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Content Engagement Funnel</h3>
                <p className="text-white/70">Analyze user drop-off patterns and engagement flow</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={data.dropoffAnalysis.slice(0, 10)}
                  layout="horizontal"
                  margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor={professionalColors.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={professionalColors.primary} stopOpacity={0.5}/>
                    </linearGradient>
                    <linearGradient id="completionsGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor={professionalColors.success} stopOpacity={0.9}/>
                      <stop offset="95%" stopColor={professionalColors.success} stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                  <XAxis 
                    type="number" 
                    stroke="rgba(255,255,255,0.7)" 
                    tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.8)' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="chapterId" 
                    stroke="rgba(255,255,255,0.7)"
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.8)' }}
                    width={120}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.9)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      color: '#fff',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
                    }}
                    formatter={(value, name) => [
                      formatNumber(value as number),
                      name === 'views' ? 'Views' : name === 'completions' ? 'Completions' : 'Completion Rate'
                    ]}
                    labelStyle={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}
                  />
                  <Bar 
                    dataKey="views" 
                    fill="url(#viewsGradient)" 
                    opacity={0.8} 
                    radius={[0, 4, 4, 0]}
                    stroke={professionalColors.primary}
                    strokeWidth={1}
                    name="Views"
                  />
                  <Bar 
                    dataKey="completions" 
                    fill="url(#completionsGradient)" 
                    radius={[0, 6, 6, 0]}
                    stroke={professionalColors.success}
                    strokeWidth={1}
                    name="Completions"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Drop-off Analysis */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Detailed Drop-off Analysis</h3>
                <p className="text-white/70">Chapter-by-chapter completion and engagement metrics</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {data.dropoffAnalysis.map((item, index) => (
                  <div 
                    key={`${item.chapterId}-${item.cardIndex}`} 
                    className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-[1.02]"
                    style={{
                      opacity: 0,
                      animation: animateIn ? `animButtonIn 0.6s ${1.2 + index * 0.1}s ease forwards` : 'none'
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-white text-lg capitalize">
                        {item.chapterId.replace(/[-_]/g, ' ')} - Card {item.cardIndex + 1}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <div className={`text-xl font-bold ${getCompletionColor(item.completionRate)}`}>
                          {item.completionRate.toFixed(1)}%
                        </div>
                        <div className={`w-3 h-3 rounded-full ${
                          item.completionRate >= 80 ? 'bg-emerald-500' :
                          item.completionRate >= 60 ? 'bg-yellow-500' :
                          item.completionRate >= 40 ? 'bg-orange-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                        <div className="text-white/60 text-xs font-medium uppercase tracking-wider">Views</div>
                        <div className="text-white font-bold text-lg">{formatNumber(item.views)}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                        <div className="text-white/60 text-xs font-medium uppercase tracking-wider">Completions</div>
                        <div className="text-emerald-400 font-bold text-lg">{formatNumber(item.completions)}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                        <div className="text-white/60 text-xs font-medium uppercase tracking-wider">Drop-off Rate</div>
                        <div className="text-red-400 font-bold text-lg">
                          {(100 - item.completionRate).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Professional completion rate bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/70 font-medium">Completion Rate</span>
                        <span className="text-white/90 font-bold">{item.completionRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-3 rounded-full transition-all duration-700 ${
                            item.completionRate >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                            item.completionRate >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                            item.completionRate >= 40 ? 'bg-gradient-to-r from-orange-500 to-orange-400' : 'bg-gradient-to-r from-red-500 to-red-400'
                          }`}
                          style={{ 
                            width: `${item.completionRate}%`,
                            boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions View */}
      {selectedView === 'sessions' && (
        <div 
          className="space-y-6"
          style={{
            opacity: 0,
            animation: animateIn ? 'animButtonIn 0.8s 1.0s ease forwards' : 'none'
          }}
        >
          {/* Session Duration Distribution Chart */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Session Duration Distribution</h3>
                <p className="text-white/70">Understand how long users engage with content</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={data.sessionDuration}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="count"
                    nameKey="durationRange"
                    label={({ durationRange, percent }: any) => `${durationRange} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {data.sessionDuration.map((entry, index) => {
                      const colors = [professionalColors.primary, professionalColors.success, professionalColors.warning, professionalColors.accent, '#ef4444'];
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={colors[index % colors.length]} 
                          stroke={colors[index % colors.length]}
                          strokeWidth={1}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.9)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      color: '#fff',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
                    }}
                    formatter={(value: any) => [formatNumber(value), 'Sessions']}
                    labelStyle={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Session Duration Breakdown */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Duration Breakdown</h3>
                  <p className="text-white/70 text-sm">Session time distribution</p>
                </div>
              </div>
              <div className="space-y-4">
                {data.sessionDuration.map((duration, index) => {
                  const total = data.sessionDuration.reduce((sum, d) => sum + d.count, 0);
                  const percentage = total > 0 ? (duration.count / total) * 100 : 0;
                  const colors = ['from-blue-500 to-blue-400', 'from-emerald-500 to-emerald-400', 'from-amber-500 to-amber-400', 'from-purple-500 to-purple-400', 'from-red-500 to-red-400'];
                  
                  return (
                    <div 
                      key={duration.durationRange} 
                      className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300"
                      style={{
                        opacity: 0,
                        animation: animateIn ? `animButtonIn 0.6s ${1.2 + index * 0.1}s ease forwards` : 'none'
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white font-bold">{duration.durationRange}</span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">{formatNumber(duration.count)}</div>
                          <div className="text-xs text-white/60">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                        <div 
                          className={`bg-gradient-to-r ${colors[index % colors.length]} h-3 rounded-full transition-all duration-500 shadow-lg`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* User Activity Patterns */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Recent Activity Trends</h3>
                  <p className="text-white/70 text-sm">Last 7 days activity summary</p>
                </div>
              </div>
              <div className="space-y-3">
                {data.dailyActivity.slice(-7).map((day, index) => {
                  const isToday = new Date(day.date).toDateString() === new Date().toDateString();
                  const avgSessionsPerUser = day.uniqueUsers > 0 ? day.totalSessions / day.uniqueUsers : 0;
                  
                  return (
                    <div 
                      key={day.date} 
                      className={`p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
                        isToday 
                          ? 'bg-blue-500/20 border-blue-500/40 shadow-lg shadow-blue-500/20' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                      style={{
                        opacity: 0,
                        animation: animateIn ? `animButtonIn 0.6s ${1.4 + index * 0.1}s ease forwards` : 'none'
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-bold text-lg">
                          {new Date(day.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                          {isToday && <span className="ml-2 px-2 py-1 text-xs text-blue-300 bg-blue-500/30 rounded-full">Today</span>}
                        </span>
                        <span className="text-blue-400 font-bold text-xl">{formatNumber(day.uniqueUsers)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/70">{formatNumber(day.totalSessions)} sessions</span>
                        <span className="text-emerald-400 font-medium">{avgSessionsPerUser.toFixed(1)} sessions/user</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional Data Refresh Info */}
      <div 
        className="text-center"
        style={{
          opacity: 0,
          animation: animateIn ? 'animButtonIn 0.6s 2.0s ease forwards' : 'none'
        }}
      >
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/20">
          <svg className="w-4 h-4 text-white/60 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-white/70 text-sm">
            Last updated: {new Date().toLocaleString()}
            {realTimeEnabled && ' • Updates every minute'}
          </span>
        </div>
      </div>
    </div>
  );
}