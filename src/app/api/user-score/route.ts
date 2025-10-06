import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { fanScoreEvents, userFanScores } from '../../../../shared/schema';
import { eq, desc, and, sql, gte } from 'drizzle-orm';
import { withAuth } from '../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    const session = (request as any).session;

    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.userId;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get user's total score
    const userScore = await db
      .select()
      .from(userFanScores)
      .where(
        and(
          eq(userFanScores.userId, userId),
          eq(userFanScores.scopeType, 'global'),
          eq(userFanScores.scopeId, 'global')
        )
      )
      .limit(1);

    const totalScore = userScore[0]?.totalScore || 0;

    // Get events from last 7 days for momentum
    const last7DaysEvents = await db
      .select({
        activityType: fanScoreEvents.activityType,
        points: fanScoreEvents.points,
        createdAt: fanScoreEvents.createdAt,
      })
      .from(fanScoreEvents)
      .where(
        and(
          eq(fanScoreEvents.userId, userId),
          gte(fanScoreEvents.createdAt, sevenDaysAgo)
        )
      )
      .orderBy(desc(fanScoreEvents.createdAt));

    // Calculate momentum
    const momentum = {
      last7Days: last7DaysEvents.reduce((sum, e) => sum + (e.points || 0), 0),
      percentChange: 0, // Calculate based on previous 7 days if needed
    };

    // Get unique activity types
    const allEvents = await db
      .select({
        activityType: fanScoreEvents.activityType,
      })
      .from(fanScoreEvents)
      .where(eq(fanScoreEvents.userId, userId));

    const uniqueTypes = new Set(allEvents.map(e => e.activityType)).size;
    const totalTypes = 12; // Total available activity types

    const diversity = {
      uniqueTypes,
      totalTypes,
    };

    // Get highlights (top achievements, rare memories, etc.)
    const highlights: string[] = [];
    
    if (momentum.last7Days > 50) {
      highlights.push('Hot streak! 50+ pts this week');
    }
    if (uniqueTypes >= 8) {
      highlights.push('Explorer! Tried 8+ action types');
    }
    if (totalScore >= 1000) {
      highlights.push('Milestone: 1000+ total points');
    }

    // Calculate user score (0-100)
    let calculatedUserScore = 0;
    
    // 40% weight: Points momentum (normalized)
    const momentumScore = Math.min((momentum.last7Days / 100) * 40, 40);
    
    // 30% weight: Diversity
    const diversityScore = (uniqueTypes / totalTypes) * 30;
    
    // 30% weight: Total achievement (normalized by 2000 points = max)
    const achievementScore = Math.min((totalScore / 2000) * 30, 30);
    
    calculatedUserScore = Math.round(momentumScore + diversityScore + achievementScore);

    // Get recommendations based on what user hasn't done or could do more
    const recommendations = [];

    // Check which activity types are missing
    const completedTypes = new Set(allEvents.map(e => e.activityType));
    
    if (!completedTypes.has('ar_complete')) {
      recommendations.push({
        id: 'ar_capture',
        title: 'Complete an AR capture',
        points: 25,
        hint: 'Available now in Interact',
        deepLink: '/event',
        category: 'ar'
      });
    }

    if (!completedTypes.has('memory_collect')) {
      recommendations.push({
        id: 'qr_scan',
        title: 'Scan a QR code',
        points: 15,
        hint: 'Find QR codes at the event',
        deepLink: '/event',
        category: 'qr'
      });
    }

    if (!completedTypes.has('quiz_complete')) {
      recommendations.push({
        id: 'quiz',
        title: 'Complete a quiz',
        points: 20,
        hint: 'Test your knowledge',
        deepLink: '/event',
        category: 'quiz'
      });
    }

    if (!completedTypes.has('content_share')) {
      recommendations.push({
        id: 'share',
        title: 'Share your journey',
        points: 10,
        hint: 'Spread the word',
        deepLink: '/after',
        category: 'share'
      });
    }

    if (!completedTypes.has('card_complete')) {
      recommendations.push({
        id: 'story',
        title: 'Complete a story card',
        points: 15,
        hint: 'Explore the Before phase',
        deepLink: '/before',
        category: 'story'
      });
    }

    // Get recent activity (last 14 days)
    const recentActivity = await db
      .select({
        id: fanScoreEvents.id,
        activityType: fanScoreEvents.activityType,
        points: fanScoreEvents.points,
        createdAt: fanScoreEvents.createdAt,
        metadata: fanScoreEvents.metadata,
      })
      .from(fanScoreEvents)
      .where(
        and(
          eq(fanScoreEvents.userId, userId),
          gte(fanScoreEvents.createdAt, fourteenDaysAgo)
        )
      )
      .orderBy(desc(fanScoreEvents.createdAt))
      .limit(10);

    const formattedActivity = recentActivity.map(activity => ({
      id: activity.id,
      type: activity.activityType,
      points: activity.points || 0,
      timestamp: activity.createdAt,
      description: getActivityDescription(activity.activityType, activity.metadata as any),
    }));

    return NextResponse.json({
      userScore: calculatedUserScore,
      momentum,
      diversity,
      highlights: highlights.length > 0 ? highlights : ['Keep exploring to unlock highlights!'],
      recommendations,
      recentActivity: formattedActivity,
    });

  } catch (error) {
    console.error('User score calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate user score' },
      { status: 500 }
    );
  }
}

function getActivityDescription(activityType: string, metadata: any): string {
  const descriptions: { [key: string]: string } = {
    'ar_complete': 'Completed AR experience',
    'video_complete': 'Watched video',
    'quiz_complete': 'Completed quiz',
    'content_share': 'Shared content',
    'memory_collect': 'Collected memory',
    'card_complete': 'Completed story card',
    'chapter_complete': 'Completed chapter',
    'poll_participation': 'Participated in poll',
    'quiz_correct': 'Answered quiz correctly',
    'interaction': 'Interaction',
  };

  return descriptions[activityType] || 'Activity completed';
}

export const GET = withAuth(handleGET);
