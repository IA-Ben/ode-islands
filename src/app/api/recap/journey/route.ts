import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../server/auth';
import { db } from '../../../../../server/db';
import { userProgress, eventMemories, pollResponses, contentInteractions, userFanScores } from '../../../../../shared/schema';
import { eq, desc, and, count } from 'drizzle-orm';

interface JourneyEvent {
  id: string;
  type: 'prologue' | 'chapter' | 'poll' | 'task' | 'keepsake' | 'event';
  title: string;
  description?: string;
  timestamp: string;
  chapterId?: string;
  metadata?: any;
}

export async function GET(request: NextRequest) {
  return withAuth(async (session: any) => {
    try {
      // Get user ID from Stack Auth session
      const userId = session?.user?.id || session?.userId;
      
      // Get user's latest progress and activities
      const progressData = await db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, userId))
        .orderBy(desc(userProgress.lastAccessed))
        .limit(20);

      // Get user's memories for keepsakes count
      const memories = await db
        .select()
        .from(eventMemories)
        .where(eq(eventMemories.createdBy, userId))
        .orderBy(desc(eventMemories.createdAt));

    // Get user's poll responses count
    const [pollsResult] = await db
      .select({ count: count() })
      .from(pollResponses)
      .where(eq(pollResponses.userId, userId));

    // Get user's completed tasks count
    const [tasksResult] = await db
      .select({ count: count() })
      .from(contentInteractions)
      .where(and(
        eq(contentInteractions.userId, userId),
        eq(contentInteractions.interactionType, 'complete')
      ));

    // Get user's fan score data
    const [fanScoreResult] = await db
      .select({
        totalScore: userFanScores.totalScore,
        level: userFanScores.level
      })
      .from(userFanScores)
      .where(and(
        eq(userFanScores.userId, userId),
        eq(userFanScores.scopeType, 'global'),
        eq(userFanScores.scopeId, 'all')
      ));

    // Transform progress data into journey events
    const journeyEvents: JourneyEvent[] = progressData.map((progress, index) => ({
      id: `progress-${progress.id}`,
      type: 'chapter',
      title: `Chapter ${progress.chapterId?.replace('chapter-', '') || index + 1} Completed`,
      description: `Explored chapter content`,
      timestamp: typeof progress.completedAt === 'string' 
        ? progress.completedAt 
        : (progress.completedAt?.toISOString() || progress.lastAccessed?.toISOString() || new Date().toISOString()),
      chapterId: progress.chapterId,
      metadata: {
        cardIndex: progress.cardIndex,
        timeSpent: progress.timeSpent
      }
    }));

    // Add prologue event if we have progress
    if (journeyEvents.length > 0) {
      journeyEvents.unshift({
        id: 'prologue',
        type: 'prologue',
        title: 'Journey Began',
        description: 'Started your adventure through The Ode Islands',
        timestamp: journeyEvents[journeyEvents.length - 1]?.timestamp || new Date().toISOString()
      });
    }

    // Calculate stats
    const uniqueChapters = new Set(progressData.map(p => p.chapterId).filter(Boolean));
    const totalChapters = 4; // Based on ode-islands.json structure
    const completedChapters = uniqueChapters.size;
    const totalKeepsakes = memories.length;

      // Create recap data
      const recapData = {
        userId: userId,
        eventTitle: 'The Ode Islands',
        venue: 'Digital Experience',
        date: new Date().toISOString().split('T')[0],
        prologueTone: 'reflective', // Could be determined from user choices
        journeyEvents: journeyEvents.slice(0, 10), // Limit to recent events
        totalChapters,
        completedChapters,
        totalKeepsakes,
        pollsAnswered: pollsResult?.count || 0,
        tasksCompleted: tasksResult?.count || 0,
        fanScore: fanScoreResult?.totalScore || 0,
        fanLevel: fanScoreResult?.level || 1,
        overallProgress: Math.round((completedChapters / totalChapters) * 100)
      };

      return NextResponse.json({
        success: true,
        recap: recapData
      });

    } catch (error) {
      console.error('Journey recap error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to generate journey recap' },
        { status: 500 }
      );
    }
  })(request);
}