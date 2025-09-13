import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { polls, pollResponses, users } from '../../../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { withAuth, withAuthAndCSRF } from '../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const chapterId = searchParams.get('chapterId');
    const cardIndex = searchParams.get('cardIndex');
    const isLive = searchParams.get('isLive');

    // Build query conditions
    const conditions = [];
    if (eventId) conditions.push(eq(polls.eventId, eventId));
    if (chapterId) conditions.push(eq(polls.chapterId, chapterId));
    if (cardIndex) conditions.push(eq(polls.cardIndex, parseInt(cardIndex)));
    if (isLive) conditions.push(eq(polls.isLive, isLive === 'true'));

    // Get polls
    const pollsList = await db
      .select()
      .from(polls)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(polls.createdAt));

    return NextResponse.json({
      success: true,
      polls: pollsList,
    });

  } catch (error) {
    console.error('Polls fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch polls' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = (request as any).parsedBody || await request.json();
    const { eventId, chapterId, cardIndex, question, options, pollType, correctAnswer, isLive, expiresAt } = body;

    // Get session data for user identification (set by withAuthAndCSRF middleware)
    const session = (request as any).session;
    
    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, message: 'Session data required' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!question || !options || !pollType) {
      return NextResponse.json(
        { success: false, message: 'Question, options, and poll type are required' },
        { status: 400 }
      );
    }

    // Validate options format
    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { success: false, message: 'At least 2 options are required' },
        { status: 400 }
      );
    }

    // Check if this is a content-driven poll that already exists
    if (chapterId && cardIndex !== undefined) {
      const existingPoll = await db
        .select()
        .from(polls)
        .where(
          and(
            eq(polls.chapterId, chapterId),
            eq(polls.cardIndex, cardIndex)
          )
        )
        .limit(1);

      if (existingPoll.length > 0) {
        return NextResponse.json({
          success: true,
          message: 'Poll already exists',
          poll: existingPoll[0],
        });
      }
    }

    // Create new poll with session-based user identification
    const newPoll = await db
      .insert(polls)
      .values({
        eventId,
        chapterId,
        cardIndex,
        question,
        options: JSON.stringify(options),
        pollType,
        correctAnswer,
        isLive: isLive || false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: session.userId, // Use session user ID for security
      })
      .returning();

    // Send notification about new poll if it's live (non-blocking)
    if (newPoll[0].isLive) {
      try {
        // Get all users to notify about live poll (in a real app, this might be event-specific or role-based)
        const allUsers = await db.select({ id: users.id }).from(users);
        
        const { NotificationService } = await import('../../../lib/notificationService');
        
        // Send to all users (excluding the creator)
        const userIds = allUsers
          .map(u => u.id)
          .filter(id => id !== session.userId);
        
        await NotificationService.createNotificationForUsers(
          userIds,
          {
            title: '📊 New Live Poll!',
            message: `A new poll is live: "${question}". Share your voice now!`,
            type: 'poll',
            actionUrl: eventId ? `/event` : undefined,
            metadata: {
              pollId: newPoll[0].id,
              pollQuestion: question,
              eventId,
            }
          }
        );
      } catch (notificationError) {
        console.warn('Failed to send poll notification:', notificationError);
        // Continue even if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Poll created successfully',
      poll: newPoll[0],
    });

  } catch (error) {
    console.error('Poll creation error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to create poll' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const GET = withAuth(handleGET);
export const POST = withAuthAndCSRF(handlePOST); // All authenticated users can create content-driven polls