'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Funnel, FunnelChart
} from 'recharts';

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

  useEffect(() => {
    fetchUserEngagementData();
    
    if (realTimeEnabled) {
      const interval = setInterval(fetchUserEngagementData, 60000); // Update every minute
      return () => clearInterval(interval);
    }
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
            <h3 className="text-lg font-semibold text-red-300 mb-2">Error Loading User Engagement</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchUserEngagementData}
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
        <h2 className="text-2xl font-bold text-white">User Engagement Analytics</h2>
        <div className="flex items-center gap-2">
          {['overview', 'progress', 'dropoff', 'sessions'].map((view) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Chapter Progress Summary */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                📖 Chapter Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.chapterProgress.slice(0, 5).map((chapter) => (
                  <div key={chapter.chapterId} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 capitalize">
                      {chapter.chapterId.replace('-', ' ')}
                    </span>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">
                        {formatNumber(chapter.completions)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDuration(chapter.avgTimeSpent)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Session Duration Distribution */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                ⏱️ Session Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.sessionDuration.map((duration) => {
                  const total = data.sessionDuration.reduce((sum, d) => sum + d.count, 0);
                  const percentage = total > 0 ? (duration.count / total) * 100 : 0;
                  
                  return (
                    <div key={duration.durationRange} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">{duration.durationRange}</span>
                        <span className="text-sm text-white">{duration.count}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Certificate Achievements */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                🏆 Certificate Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.certificates.map((cert) => (
                  <div key={cert.certificateType} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400 capitalize">
                        {cert.certificateType}
                      </span>
                      <span className="text-lg font-semibold text-yellow-400">
                        {cert.count}
                      </span>
                    </div>
                    {cert.recentlyIssued > 0 && (
                      <div className="text-xs text-green-400">
                        +{cert.recentlyIssued} this week
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress View */}
      {selectedView === 'progress' && (
        <div className="space-y-6">
          {/* Chapter Progress Chart */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Chapter Completion Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.chapterProgress} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="chapterId" 
                    stroke="#9ca3af"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value, name) => [
                      name === 'completions' ? formatNumber(value as number) : formatDuration(value as number),
                      name === 'completions' ? 'Completions' : 'Avg Time'
                    ]}
                  />
                  <Bar dataKey="completions" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily Activity Chart */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Daily User Activity Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.dailyActivity.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="uniqueUsers" 
                    stackId="1"
                    stroke="#3b82f6" 
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalSessions" 
                    stackId="2"
                    stroke="#10b981" 
                    fill="#10b981"
                    fillOpacity={0.4}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dropoff Analysis View */}
      {selectedView === 'dropoff' && (
        <div className="space-y-6">
          {/* Funnel Chart */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Content Engagement Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={data.dropoffAnalysis.slice(0, 10)}
                  layout="horizontal"
                  margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis 
                    type="category" 
                    dataKey="chapterId" 
                    stroke="#9ca3af"
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value, name) => [
                      value,
                      name === 'views' ? 'Views' : name === 'completions' ? 'Completions' : 'Completion Rate'
                    ]}
                  />
                  <Bar dataKey="views" fill="#3b82f6" opacity={0.7} />
                  <Bar dataKey="completions" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Drop-off Analysis */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Detailed Drop-off Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.dropoffAnalysis.map((item) => (
                  <div key={`${item.chapterId}-${item.cardIndex}`} className="p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">
                        {item.chapterId.replace('-', ' ')} - Card {item.cardIndex + 1}
                      </h4>
                      <div className={`text-lg font-bold ${getCompletionColor(item.completionRate)}`}>
                        {item.completionRate}%
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Views</div>
                        <div className="text-white font-semibold">{item.views}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Completions</div>
                        <div className="text-white font-semibold">{item.completions}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Drop-off Rate</div>
                        <div className="text-red-400 font-semibold">
                          {100 - item.completionRate}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Completion rate bar */}
                    <div className="mt-3 w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          item.completionRate >= 80 ? 'bg-green-500' :
                          item.completionRate >= 60 ? 'bg-yellow-500' :
                          item.completionRate >= 40 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${item.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sessions View */}
      {selectedView === 'sessions' && (
        <div className="space-y-6">
          {/* Session Duration Distribution Chart */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Session Duration Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.sessionDuration}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="count"
                    nameKey="durationRange"
                    label={({ durationRange, percent }) => `${durationRange} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {data.sessionDuration.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Session Duration Breakdown */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">Duration Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.sessionDuration.map((duration) => {
                    const total = data.sessionDuration.reduce((sum, d) => sum + d.count, 0);
                    const percentage = total > 0 ? (duration.count / total) * 100 : 0;
                    
                    return (
                      <div key={duration.durationRange} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{duration.durationRange}</span>
                          <div className="text-right">
                            <div className="text-lg font-bold text-white">{duration.count}</div>
                            <div className="text-sm text-gray-400">{percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* User Activity Patterns */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">Recent Activity Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.dailyActivity.slice(-7).map((day, index) => {
                    const isToday = new Date(day.date).toDateString() === new Date().toDateString();
                    const avgSessionsPerUser = day.uniqueUsers > 0 ? day.totalSessions / day.uniqueUsers : 0;
                    
                    return (
                      <div key={day.date} className={`p-3 rounded-lg ${isToday ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-gray-800'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium">
                            {new Date(day.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                            {isToday && <span className="ml-2 text-xs text-blue-400">(Today)</span>}
                          </span>
                          <span className="text-blue-400 font-bold">{day.uniqueUsers}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-400">
                          <span>{day.totalSessions} sessions</span>
                          <span>{avgSessionsPerUser.toFixed(1)} sessions/user</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Data Refresh Info */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date().toLocaleString()}
        {realTimeEnabled && ' • Updates every minute'}
      </div>
    </div>
  );
}