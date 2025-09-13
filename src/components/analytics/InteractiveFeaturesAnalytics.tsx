'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InteractiveFeaturesProps {
  dateRange: { startDate: string; endDate: string };
  eventId: string;
  realTimeEnabled: boolean;
}

interface PollData {
  pollId: string;
  question: string;
  pollType: string;
  totalResponses: number;
  uniqueParticipants: number;
  participationRate: number;
}

interface ChatActivity {
  date: string;
  messageCount: number;
  uniqueUsers: number;
  avgMessagesPerUser: number;
}

interface QAEngagement {
  totalQuestions: number;
  answeredQuestions: number;
  answerRate: number;
  avgUpvotes: number;
  avgResponseTimeMinutes: number;
}

interface NotificationMetric {
  notificationType: string;
  sent: number;
  read: number;
  readRate: number;
  avgReadTimeMinutes: number;
}

interface InteractiveFeaturesData {
  polls: PollData[];
  chat: ChatActivity[];
  qa: QAEngagement;
  notifications: NotificationMetric[];
}

export default function InteractiveFeaturesAnalytics({ dateRange, eventId, realTimeEnabled }: InteractiveFeaturesProps) {
  const [data, setData] = useState<InteractiveFeaturesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'polls' | 'chat' | 'qa' | 'notifications'>('overview');

  useEffect(() => {
    fetchInteractiveFeaturesData();
    
    if (realTimeEnabled) {
      const interval = setInterval(fetchInteractiveFeaturesData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [dateRange, eventId, realTimeEnabled]);

  const fetchInteractiveFeaturesData = async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        type: 'interactive_features',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(eventId && { eventId })
      });

      const response = await fetch(`/api/admin/analytics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch interactive features data');
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to load data');
      }
    } catch (err) {
      console.error('Interactive features data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load interactive features data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  const getEngagementColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-400';
    if (rate >= 60) return 'text-yellow-400';
    if (rate >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getPollTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      quiz: '🧠',
      poll: '📊',
      survey: '📋',
      feedback: '💬'
    };
    return icons[type] || '❓';
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
            <h3 className="text-lg font-semibold text-red-300 mb-2">Error Loading Interactive Features</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchInteractiveFeaturesData}
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
        <h2 className="text-2xl font-bold text-white">Interactive Features Analytics</h2>
        <div className="flex items-center gap-2">
          {['overview', 'polls', 'chat', 'qa', 'notifications'].map((view) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Polls Summary */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                📊 Polls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-blue-400">
                  {data.polls.length}
                </div>
                <div className="text-sm text-gray-400">Total polls</div>
                <div className="text-lg font-semibold text-white">
                  {data.polls.reduce((sum, poll) => sum + poll.totalResponses, 0)}
                </div>
                <div className="text-sm text-gray-400">Total responses</div>
              </div>
            </CardContent>
          </Card>

          {/* Chat Summary */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                💬 Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-green-400">
                  {formatNumber(data.chat.reduce((sum, day) => sum + day.messageCount, 0))}
                </div>
                <div className="text-sm text-gray-400">Total messages</div>
                <div className="text-lg font-semibold text-white">
                  {Math.max(...data.chat.map(day => day.uniqueUsers), 0)}
                </div>
                <div className="text-sm text-gray-400">Peak participants</div>
              </div>
            </CardContent>
          </Card>

          {/* Q&A Summary */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                ❓ Q&A
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-purple-400">
                  {data.qa.totalQuestions}
                </div>
                <div className="text-sm text-gray-400">Total questions</div>
                <div className={`text-lg font-semibold ${getEngagementColor(data.qa.answerRate)}`}>
                  {data.qa.answerRate}%
                </div>
                <div className="text-sm text-gray-400">Answer rate</div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Summary */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                🔔 Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-yellow-400">
                  {formatNumber(data.notifications.reduce((sum, notif) => sum + notif.sent, 0))}
                </div>
                <div className="text-sm text-gray-400">Total sent</div>
                <div className="text-lg font-semibold text-white">
                  {data.notifications.length > 0 
                    ? Math.round(data.notifications.reduce((sum, notif) => sum + notif.readRate, 0) / data.notifications.length)
                    : 0}%
                </div>
                <div className="text-sm text-gray-400">Avg read rate</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Polls View */}
      {selectedView === 'polls' && (
        <div className="space-y-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Poll Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.polls.map((poll) => (
                  <div key={poll.pollId} className="p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-white flex items-center gap-2 mb-1">
                          {getPollTypeIcon(poll.pollType)}
                          {poll.question}
                        </h4>
                        <div className="text-sm text-gray-400 capitalize">
                          {poll.pollType} • {poll.totalResponses} responses
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${getEngagementColor(poll.participationRate)}`}>
                        {poll.participationRate}%
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Total Responses</div>
                        <div className="text-white font-semibold">{poll.totalResponses}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Unique Participants</div>
                        <div className="text-blue-400 font-semibold">{poll.uniqueParticipants}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Participation Rate</div>
                        <div className={`font-semibold ${getEngagementColor(poll.participationRate)}`}>
                          {poll.participationRate}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Participation rate bar */}
                    <div className="mt-3 w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          poll.participationRate >= 80 ? 'bg-green-500' :
                          poll.participationRate >= 60 ? 'bg-yellow-500' :
                          poll.participationRate >= 40 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${poll.participationRate}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chat View */}
      {selectedView === 'chat' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Chat Activity */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Daily Chat Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.chat.slice(-7).map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                    <div>
                      <div className="font-medium text-white">
                        {new Date(day.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="text-sm text-gray-400">
                        {day.uniqueUsers} participants
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-400">
                        {formatNumber(day.messageCount)}
                      </div>
                      <div className="text-sm text-gray-400">messages</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat Engagement Metrics */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Chat Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-gray-800 rounded">
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {formatNumber(data.chat.reduce((sum, day) => sum + day.messageCount, 0))}
                  </div>
                  <div className="text-sm text-gray-400">Total Messages</div>
                </div>
                
                <div className="p-3 bg-gray-800 rounded">
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    {Math.max(...data.chat.map(day => day.uniqueUsers), 0)}
                  </div>
                  <div className="text-sm text-gray-400">Peak Daily Users</div>
                </div>
                
                <div className="p-3 bg-gray-800 rounded">
                  <div className="text-2xl font-bold text-purple-400 mb-1">
                    {data.chat.length > 0 
                      ? (data.chat.reduce((sum, day) => sum + day.avgMessagesPerUser, 0) / data.chat.length).toFixed(1)
                      : '0'}
                  </div>
                  <div className="text-sm text-gray-400">Avg Messages per User</div>
                </div>
                
                <div className="p-3 bg-gray-800 rounded">
                  <div className="text-2xl font-bold text-yellow-400 mb-1">
                    {data.chat.length > 0 
                      ? (data.chat.reduce((sum, day) => sum + day.uniqueUsers, 0) / data.chat.length).toFixed(0)
                      : '0'}
                  </div>
                  <div className="text-sm text-gray-400">Avg Daily Participants</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Q&A View */}
      {selectedView === 'qa' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Q&A Performance */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Q&A Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <span className="text-gray-400">Total Questions</span>
                  <span className="text-2xl font-bold text-white">{data.qa.totalQuestions}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <span className="text-gray-400">Answered</span>
                  <span className="text-2xl font-bold text-green-400">{data.qa.answeredQuestions}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <span className="text-gray-400">Answer Rate</span>
                  <span className={`text-2xl font-bold ${getEngagementColor(data.qa.answerRate)}`}>
                    {data.qa.answerRate}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <span className="text-gray-400">Avg Response Time</span>
                  <span className="text-2xl font-bold text-blue-400">
                    {formatDuration(data.qa.avgResponseTimeMinutes)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Q&A Insights */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Q&A Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Answer Rate Visualization */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Questions Answered</span>
                    <span className="text-sm text-white">{data.qa.answerRate}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        data.qa.answerRate >= 80 ? 'bg-green-500' :
                        data.qa.answerRate >= 60 ? 'bg-yellow-500' :
                        data.qa.answerRate >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${data.qa.answerRate}%` }}
                    ></div>
                  </div>
                </div>

                {/* Response Time Analysis */}
                <div className="p-3 bg-gray-800 rounded">
                  <div className="text-sm text-gray-400 mb-2">Response Performance</div>
                  {data.qa.avgResponseTimeMinutes <= 30 && (
                    <div className="text-green-400 text-sm">🟢 Excellent response time</div>
                  )}
                  {data.qa.avgResponseTimeMinutes > 30 && data.qa.avgResponseTimeMinutes <= 60 && (
                    <div className="text-yellow-400 text-sm">🟡 Good response time</div>
                  )}
                  {data.qa.avgResponseTimeMinutes > 60 && (
                    <div className="text-red-400 text-sm">🔴 Room for improvement</div>
                  )}
                </div>

                {/* Average Upvotes */}
                <div className="p-3 bg-gray-800 rounded">
                  <div className="text-sm text-gray-400 mb-1">Avg Question Upvotes</div>
                  <div className="text-xl font-bold text-yellow-400">
                    {Number(data.qa.avgUpvotes).toFixed(1)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications View */}
      {selectedView === 'notifications' && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Notification Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.notifications.map((notification) => (
                <div key={notification.notificationType} className="p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-white capitalize">
                      {notification.notificationType} Notifications
                    </h4>
                    <div className={`text-lg font-bold ${getEngagementColor(notification.readRate)}`}>
                      {notification.readRate}%
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Sent</div>
                      <div className="text-white font-semibold">{formatNumber(notification.sent)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Read</div>
                      <div className="text-blue-400 font-semibold">{formatNumber(notification.read)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Read Rate</div>
                      <div className={`font-semibold ${getEngagementColor(notification.readRate)}`}>
                        {notification.readRate}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Avg Read Time</div>
                      <div className="text-purple-400 font-semibold">
                        {formatDuration(notification.avgReadTimeMinutes)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Read rate visualization */}
                  <div className="mt-3 w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        notification.readRate >= 80 ? 'bg-green-500' :
                        notification.readRate >= 60 ? 'bg-yellow-500' :
                        notification.readRate >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${notification.readRate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Refresh Info */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date().toLocaleString()}
        {realTimeEnabled && ' • Updates every 30 seconds'}
      </div>
    </div>
  );
}