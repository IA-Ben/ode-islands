import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { polls, pollResponses } from '../../../../../shared/schema';
import { eq, and, count, sql } from 'drizzle-orm';
import { withAuth, withUserAuthAndCSRF } from '../../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get('pollId');
    const userId = searchParams.get('userId');

    if (!pollId) {
      return NextResponse.json(
        { success: false, message: 'Poll ID is required' },
        { status: 400 }
      );
    }

    // Get session information for authorization
    const session = (request as any).session;
    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get poll responses with aggregated results (always allowed for authenticated users)
    const responseQuery = db
      .select({
        selectedOption: pollResponses.selectedOption,
        count: count(),
      })
      .from(pollResponses)
      .where(eq(pollResponses.pollId, pollId))
      .groupBy(pollResponses.selectedOption);

    const responses = await responseQuery;

    // If userId provided, get user's specific response WITH AUTHORIZATION CHECK
    let userResponse = null;
    if (userId) {
      // SECURITY FIX: Users can only view their own responses or admins can view any
      if (session.isAdmin || session.userId === userId) {
        const userResponseQuery = await db
          .select()
          .from(pollResponses)
          .where(
            and(
              eq(pollResponses.pollId, pollId),
              eq(pollResponses.userId, userId)
            )
          )
          .limit(1);

        userResponse = userResponseQuery[0] || null;
      } else {
        return NextResponse.json(
          { success: false, message: 'Access denied. You can only view your own poll responses.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      responses: responses,
      userResponse: userResponse,
      totalResponses: responses.reduce((sum, r) => sum + r.count, 0),
    });

  } catch (error) {
    console.error('Poll responses fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch poll responses' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = (request as any).parsedBody || await request.json();
    const { pollId, selectedOption } = body;

    // Get authenticated user ID from session (prevents spoofing)
    const session = (request as any).session;
    const userId = session.userId;

    // Validate required fields
    if (!pollId || !selectedOption) {
      return NextResponse.json(
        { success: false, message: 'Poll ID and selected option are required' },
        { status: 400 }
      );
    }

    // Check if user already responded to this poll
    const existingResponse = await db
      .select()
      .from(pollResponses)
      .where(
        and(
          eq(pollResponses.pollId, pollId),
          eq(pollResponses.userId, userId)
        )
      )
      .limit(1);

    if (existingResponse.length > 0) {
      return NextResponse.json(
        { success: false, message: 'You have already responded to this poll' },
        { status: 400 }
      );
    }

    // Get poll details to check correctness
    const poll = await db
      .select()
      .from(polls)
      .where(eq(polls.id, pollId))
      .limit(1);

    if (poll.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Poll not found' },
        { status: 404 }
      );
    }

    const pollData = poll[0];
    const isCorrect = pollData.correctAnswer ? selectedOption === pollData.correctAnswer : null;

    // Create new poll response
    const newResponse = await db
      .insert(pollResponses)
      .values({
        pollId,
        userId,
        selectedOption,
        isCorrect,
        submittedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Response recorded successfully',
      response: newResponse[0],
      isCorrect: isCorrect,
    });

  } catch (error) {
    console.error('Poll response error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to submit response' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const GET = withAuth(handleGET);
export const POST = withUserAuthAndCSRF(handlePOST); // Users can only submit their own responses + CSRF protection