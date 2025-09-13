// Optimized analytics service for admin dashboard
import { db } from '../../server/db';
import { 
  users, userProgress, contentInteractions, userSessions, polls, pollResponses,
  liveChatMessages, qaSessions, notifications, certificates, liveEvents,
  eventMemories, userContentAccess, contentSchedules
} from '../../shared/schema';
import { and, eq, gte, lte, sql, desc, asc, count, avg, sum, or } from 'drizzle-orm';

export interface AnalyticsFilter {
  startDate?: Date;
  endDate?: Date;
  eventId?: string;
  userId?: string;
  contentType?: string;
}

export class AnalyticsService {
  private static cache = new Map<string, { data: unknown; expiry: number }>();
  private static readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes for real-time data
  private static readonly CACHE_TTL_LONG = 15 * 60 * 1000; // 15 minutes for historical data

  // Cache management
  private static getCacheKey(method: string, params: AnalyticsFilter): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  private static getCachedData(key: string): unknown | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    return null;
  }

  private static setCachedData(key: string, data: unknown, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, { data, expiry: Date.now() + ttl });
  }

  // Real-time metrics (short cache)
  static async getRealTimeMetrics(): Promise<{
    activeUsers: number;
    totalSessions: number;
    recentInteractions: number;
    systemLoad: number;
  }> {
    const cacheKey = this.getCacheKey('realTimeMetrics', {});
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const last15Minutes = new Date(now.getTime() - 15 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const [activeUsersResult, sessionsResult, interactionsResult] = await Promise.all([
      // Active users (sessions without end time or ended recently)
      db.select({
        count: count(sql`DISTINCT ${userSessions.userId}`)
      })
        .from(userSessions)
        .where(sql`${userSessions.sessionEnd} IS NULL OR ${userSessions.sessionEnd} > ${last15Minutes}`),

      // Total active sessions
      db.select({ count: count() })
        .from(userSessions)
        .where(sql`${userSessions.sessionEnd} IS NULL OR ${userSessions.sessionEnd} > ${last15Minutes}`),

      // Recent interactions
      db.select({ count: count() })
        .from(contentInteractions)
        .where(gte(contentInteractions.timestamp, lastHour))
    ]);

    const result = {
      activeUsers: activeUsersResult[0]?.count || 0,
      totalSessions: sessionsResult[0]?.count || 0,
      recentInteractions: interactionsResult[0]?.count || 0,
      systemLoad: Math.random() * 100 // TODO: Replace with actual system metrics
    };

    this.setCachedData(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  // User engagement analysis (optimized queries)
  static async getUserEngagementMetrics(filter: AnalyticsFilter): Promise<{
    totalUsers: number;
    activeUsers: number;
    retentionRate: number;
    avgSessionDuration: number;
    chapterCompletionRates: Array<{
      chapterId: string;
      totalViews: number;
      completions: number;
      completionRate: number;
      avgTimeSpent: number;
    }>;
    userActivity: Array<{
      date: string;
      activeUsers: number;
      newUsers: number;
      returningUsers: number;
    }>;
  }> {
    const cacheKey = this.getCacheKey('userEngagement', filter);
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const startDate = filter.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filter.endDate || new Date();

    // Optimized parallel queries
    const [
      totalUsersResult,
      activeUsersResult,
      avgDurationResult,
      chapterStatsResult,
      dailyActivityResult
    ] = await Promise.all([
      // Total users
      db.select({ count: count() }).from(users),

      // Active users in period
      db.select({ count: count(sql`DISTINCT ${userSessions.userId}`) })
        .from(userSessions)
        .where(and(
          gte(userSessions.sessionStart, startDate),
          lte(userSessions.sessionStart, endDate)
        )),

      // Average session duration
      db.select({ 
        avg: avg(userSessions.totalTimeSpent),
        total: count()
      })
        .from(userSessions)
        .where(and(
          gte(userSessions.sessionStart, startDate),
          lte(userSessions.sessionStart, endDate),
          sql`${userSessions.totalTimeSpent} IS NOT NULL`
        )),

      // Chapter completion statistics
      db.select({
        chapterId: userProgress.chapterId,
        totalViews: count(),
        completions: count(sql`CASE WHEN ${userProgress.completedAt} IS NOT NULL THEN 1 END`),
        avgTimeSpent: avg(userProgress.timeSpent)
      })
        .from(userProgress)
        .where(and(
          gte(userProgress.lastAccessed, startDate),
          lte(userProgress.lastAccessed, endDate)
        ))
        .groupBy(userProgress.chapterId),

      // Daily user activity
      db.select({
        date: sql<string>`DATE(${userSessions.sessionStart})`,
        activeUsers: count(sql`DISTINCT ${userSessions.userId}`),
        totalSessions: count()
      })
        .from(userSessions)
        .where(and(
          gte(userSessions.sessionStart, startDate),
          lte(userSessions.sessionStart, endDate)
        ))
        .groupBy(sql`DATE(${userSessions.sessionStart})`)
        .orderBy(sql`DATE(${userSessions.sessionStart})`)
    ]);

    // Calculate retention rate
    const totalUsers = totalUsersResult[0]?.count || 0;
    const activeUsers = activeUsersResult[0]?.count || 0;
    const retentionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

    const result = {
      totalUsers,
      activeUsers,
      retentionRate: Math.round(retentionRate * 100) / 100,
      avgSessionDuration: Math.round(Number(avgDurationResult[0]?.avg) || 0),
      chapterCompletionRates: chapterStatsResult.map(stat => ({
        chapterId: stat.chapterId,
        totalViews: stat.totalViews,
        completions: Number(stat.completions),
        completionRate: stat.totalViews > 0 ? Math.round((Number(stat.completions) / stat.totalViews) * 100) : 0,
        avgTimeSpent: Math.round(Number(stat.avgTimeSpent) || 0)
      })),
      userActivity: dailyActivityResult.map(activity => ({
        date: activity.date,
        activeUsers: activity.activeUsers,
        newUsers: 0, // TODO: Calculate new users for this date
        returningUsers: activity.activeUsers // TODO: Calculate returning users
      }))
    };

    this.setCachedData(cacheKey, result, this.CACHE_TTL_LONG);
    return result;
  }

  // Content performance analytics
  static async getContentPerformanceMetrics(filter: AnalyticsFilter): Promise<{
    topContent: Array<{
      contentId: string;
      contentType: string;
      views: number;
      uniqueUsers: number;
      avgEngagementTime: number;
      completionRate: number;
      shareCount: number;
    }>;
    contentByType: Array<{
      contentType: string;
      totalViews: number;
      avgEngagement: number;
      topPerformer: string;
    }>;
    engagementTrends: Array<{
      date: string;
      views: number;
      interactions: number;
      engagementRate: number;
    }>;
  }> {
    const cacheKey = this.getCacheKey('contentPerformance', filter);
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const startDate = filter.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filter.endDate || new Date();

    const [topContentResult, contentTypeResult, trendsResult] = await Promise.all([
      // Top performing content
      db.select({
        contentId: contentInteractions.contentId,
        contentType: contentInteractions.contentType,
        views: count(sql`CASE WHEN ${contentInteractions.interactionType} = 'view' THEN 1 END`),
        clicks: count(sql`CASE WHEN ${contentInteractions.interactionType} = 'click' THEN 1 END`),
        completions: count(sql`CASE WHEN ${contentInteractions.interactionType} = 'complete' THEN 1 END`),
        shares: count(sql`CASE WHEN ${contentInteractions.interactionType} = 'share' THEN 1 END`),
        uniqueUsers: count(sql`DISTINCT ${contentInteractions.userId}`),
        avgDuration: avg(contentInteractions.duration)
      })
        .from(contentInteractions)
        .where(and(
          gte(contentInteractions.timestamp, startDate),
          lte(contentInteractions.timestamp, endDate)
        ))
        .groupBy(contentInteractions.contentId, contentInteractions.contentType)
        .orderBy(desc(count()))
        .limit(20),

      // Performance by content type
      db.select({
        contentType: contentInteractions.contentType,
        totalViews: count(sql`CASE WHEN ${contentInteractions.interactionType} = 'view' THEN 1 END`),
        totalInteractions: count(),
        avgDuration: avg(contentInteractions.duration)
      })
        .from(contentInteractions)
        .where(and(
          gte(contentInteractions.timestamp, startDate),
          lte(contentInteractions.timestamp, endDate)
        ))
        .groupBy(contentInteractions.contentType),

      // Daily engagement trends
      db.select({
        date: sql<string>`DATE(${contentInteractions.timestamp})`,
        views: count(sql`CASE WHEN ${contentInteractions.interactionType} = 'view' THEN 1 END`),
        interactions: count(),
        uniqueUsers: count(sql`DISTINCT ${contentInteractions.userId}`)
      })
        .from(contentInteractions)
        .where(and(
          gte(contentInteractions.timestamp, startDate),
          lte(contentInteractions.timestamp, endDate)
        ))
        .groupBy(sql`DATE(${contentInteractions.timestamp})`)
        .orderBy(sql`DATE(${contentInteractions.timestamp})`)
    ]);

    const result = {
      topContent: topContentResult.map(content => ({
        contentId: content.contentId,
        contentType: content.contentType,
        views: Number(content.views),
        uniqueUsers: content.uniqueUsers,
        avgEngagementTime: Math.round(Number(content.avgDuration) || 0),
        completionRate: Number(content.views) > 0 ? Math.round((Number(content.completions) / Number(content.views)) * 100) : 0,
        shareCount: Number(content.shares)
      })),
      contentByType: contentTypeResult.map(type => ({
        contentType: type.contentType,
        totalViews: Number(type.totalViews),
        avgEngagement: Math.round(Number(type.avgDuration) || 0),
        topPerformer: '' // TODO: Get top performer for this type
      })),
      engagementTrends: trendsResult.map(trend => ({
        date: trend.date,
        views: Number(trend.views),
        interactions: trend.interactions,
        engagementRate: trend.uniqueUsers > 0 ? Math.round((trend.interactions / trend.uniqueUsers) * 100) : 0
      }))
    };

    this.setCachedData(cacheKey, result, this.CACHE_TTL_LONG);
    return result;
  }

  // Interactive features analytics
  static async getInteractiveMetrics(filter: AnalyticsFilter): Promise<{
    pollEngagement: {
      totalPolls: number;
      avgParticipation: number;
      topPolls: Array<{
        id: string;
        question: string;
        responses: number;
        participationRate: number;
      }>;
    };
    chatActivity: {
      totalMessages: number;
      activeParticipants: number;
      avgMessagesPerUser: number;
      peakActivity: Array<{
        hour: number;
        messageCount: number;
      }>;
    };
    qaEngagement: {
      totalQuestions: number;
      answerRate: number;
      avgResponseTime: number;
      topQuestions: Array<{
        question: string;
        upvotes: number;
        isAnswered: boolean;
      }>;
    };
  }> {
    const cacheKey = this.getCacheKey('interactiveMetrics', filter);
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const startDate = filter.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filter.endDate || new Date();
    const eventFilter = filter.eventId ? [eq(polls.eventId, filter.eventId)] : [];

    const [pollsResult, chatResult, qaResult] = await Promise.all([
      // Poll engagement metrics
      db.select({
        pollId: polls.id,
        question: polls.question,
        totalResponses: count(pollResponses.id),
        uniqueParticipants: count(sql`DISTINCT ${pollResponses.userId}`)
      })
        .from(polls)
        .leftJoin(pollResponses, eq(polls.id, pollResponses.pollId))
        .where(and(
          gte(polls.createdAt, startDate),
          lte(polls.createdAt, endDate),
          ...eventFilter
        ))
        .groupBy(polls.id, polls.question)
        .orderBy(desc(count(pollResponses.id))),

      // Chat activity analysis
      db.select({
        totalMessages: count(),
        uniqueUsers: count(sql`DISTINCT ${liveChatMessages.userId}`),
        hour: sql<number>`EXTRACT(HOUR FROM ${liveChatMessages.sentAt})`,
        messageCount: count()
      })
        .from(liveChatMessages)
        .where(and(
          gte(liveChatMessages.sentAt, startDate),
          lte(liveChatMessages.sentAt, endDate),
          ...(filter.eventId ? [eq(liveChatMessages.eventId, filter.eventId)] : [])
        ))
        .groupBy(sql`EXTRACT(HOUR FROM ${liveChatMessages.sentAt})`),

      // Q&A session metrics
      db.select({
        totalQuestions: count(),
        answeredQuestions: count(sql`CASE WHEN ${qaSessions.isAnswered} = true THEN 1 END`),
        avgUpvotes: avg(qaSessions.upvotes),
        avgResponseTime: avg(sql`EXTRACT(EPOCH FROM (${qaSessions.answeredAt} - ${qaSessions.createdAt}))`)
      })
        .from(qaSessions)
        .where(and(
          gte(qaSessions.createdAt, startDate),
          lte(qaSessions.createdAt, endDate),
          ...(filter.eventId ? [eq(qaSessions.eventId, filter.eventId)] : [])
        ))
    ]);

    const result = {
      pollEngagement: {
        totalPolls: pollsResult.length,
        avgParticipation: pollsResult.length > 0 
          ? Math.round(pollsResult.reduce((sum, poll) => sum + poll.uniqueParticipants, 0) / pollsResult.length)
          : 0,
        topPolls: pollsResult.slice(0, 10).map(poll => ({
          id: poll.pollId,
          question: poll.question,
          responses: poll.totalResponses,
          participationRate: poll.totalResponses > 0 ? Math.round((poll.uniqueParticipants / poll.totalResponses) * 100) : 0
        }))
      },
      chatActivity: {
        totalMessages: chatResult.reduce((sum, item) => sum + item.totalMessages, 0),
        activeParticipants: Math.max(...chatResult.map(item => item.uniqueUsers), 0),
        avgMessagesPerUser: 0, // TODO: Calculate from chat data
        peakActivity: chatResult.map(item => ({
          hour: item.hour,
          messageCount: item.messageCount
        }))
      },
      qaEngagement: {
        totalQuestions: qaResult[0]?.totalQuestions || 0,
        answerRate: qaResult[0]?.totalQuestions > 0 
          ? Math.round((Number(qaResult[0].answeredQuestions) / qaResult[0].totalQuestions) * 100)
          : 0,
        avgResponseTime: Math.round((Number(qaResult[0]?.avgResponseTime) || 0) / 60), // Convert to minutes
        topQuestions: [] // TODO: Get top questions query
      }
    };

    this.setCachedData(cacheKey, result, this.CACHE_TTL_LONG);
    return result;
  }

  // Event management analytics
  static async getEventManagementMetrics(eventId?: string): Promise<{
    currentEvents: Array<{
      id: string;
      title: string;
      isActive: boolean;
      participantCount: number;
      startTime: string;
      endTime: string;
    }>;
    systemHealth: {
      dbResponseTime: number;
      apiResponseTime: number;
      errorRate: number;
      uptime: number;
    };
    liveMetrics: {
      concurrentUsers: number;
      activeConnections: number;
      bandwidthUsage: number;
    };
  }> {
    const cacheKey = this.getCacheKey('eventManagement', { eventId });
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const [eventsResult] = await Promise.all([
      // Current events with participant counts
      db.select({
        id: liveEvents.id,
        title: liveEvents.title,
        isActive: liveEvents.isActive,
        startTime: liveEvents.startTime,
        endTime: liveEvents.endTime,
        participantCount: count(sql`DISTINCT ${liveChatMessages.userId}`)
      })
        .from(liveEvents)
        .leftJoin(liveChatMessages, eq(liveEvents.id, liveChatMessages.eventId))
        .where(eventId ? eq(liveEvents.id, eventId) : sql`1=1`)
        .groupBy(liveEvents.id, liveEvents.title, liveEvents.isActive, liveEvents.startTime, liveEvents.endTime)
    ]);

    const result = {
      currentEvents: eventsResult.map(event => ({
        id: event.id,
        title: event.title,
        isActive: event.isActive ?? false,
        participantCount: event.participantCount,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString()
      })),
      systemHealth: {
        dbResponseTime: Math.random() * 100, // TODO: Implement actual metrics
        apiResponseTime: Math.random() * 50,
        errorRate: Math.random() * 5,
        uptime: 99.9
      },
      liveMetrics: {
        concurrentUsers: Math.floor(Math.random() * 1000),
        activeConnections: Math.floor(Math.random() * 500),
        bandwidthUsage: Math.random() * 100
      }
    };

    this.setCachedData(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  // Clear cache
  static clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Export data utilities
  static async exportAnalytics(type: string, format: 'csv' | 'json' | 'pdf', filter: AnalyticsFilter): Promise<string> {
    let data: unknown;
    
    switch (type) {
      case 'user_engagement':
        data = await this.getUserEngagementMetrics(filter);
        break;
      case 'content_performance':
        data = await this.getContentPerformanceMetrics(filter);
        break;
      case 'interactive_features':
        data = await this.getInteractiveMetrics(filter);
        break;
      default:
        throw new Error('Invalid export type');
    }

    if (format === 'csv') {
      return this.convertToCSV(data as Record<string, unknown>);
    } else if (format === 'pdf') {
      // PDF generation would be handled elsewhere - return JSON for now
      return JSON.stringify(data, null, 2);
    } else {
      return JSON.stringify(data, null, 2);
    }
  }

  private static convertToCSV(data: Record<string, unknown>): string {
    // Simple CSV conversion - would need more sophisticated handling for complex nested objects
    const flattenObject = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
      const flattened: Record<string, unknown> = {};
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, flattenObject(obj[key] as Record<string, unknown>, `${prefix}${key}_`));
        } else {
          flattened[`${prefix}${key}`] = obj[key];
        }
      }
      return flattened;
    };

    const flattened = flattenObject(data);
    const headers = Object.keys(flattened).join(',');
    const values = Object.values(flattened).join(',');
    
    return `${headers}\n${values}`;
  }
}