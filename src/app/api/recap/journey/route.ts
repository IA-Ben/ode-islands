import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../server/auth';
import { db } from '../../../../../server/db';
import { userProgress, eventMemories } from '../../../../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';

interface JourneyEvent {
  id: string;
  type: 'prologue' | 'chapter' | 'poll' | 'task' | 'keepsake' | 'event';
  title: string;
  description?: string;
  timestamp: string;
  chapterId?: string;
  metadata?: any;
}

async function handleGET(request: NextRequest) {
  const session = (request as any).session;
  
  try {
    // Get user's latest progress and activities
    const progressData = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, session.userId))
      .orderBy(desc(userProgress.lastAccessed))
      .limit(20);

    // Get user's memories for keepsakes count
    const memories = await db
      .select()
      .from(eventMemories)
      .where(eq(eventMemories.createdBy, session.userId))
      .orderBy(desc(eventMemories.createdAt));

    // TODO: Add fan score data when available

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
      userId: session.userId,
      eventTitle: 'The Ode Islands',
      venue: 'Digital Experience',
      date: new Date().toISOString().split('T')[0],
      prologueTone: 'reflective', // Could be determined from user choices
      journeyEvents: journeyEvents.slice(0, 10), // Limit to recent events
      totalChapters,
      completedChapters,
      totalKeepsakes,
      pollsAnswered: 0, // TODO: Add poll tracking
      tasksCompleted: 0, // TODO: Add task tracking
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
}

export const GET = withAuth(handleGET);