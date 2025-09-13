import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { polls, pollResponses } from '../../../../../shared/schema';
import { eq, and, count, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
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

    // Get poll responses with aggregated results
    const responseQuery = db
      .select({
        selectedOption: pollResponses.selectedOption,
        count: count(),
      })
      .from(pollResponses)
      .where(eq(pollResponses.pollId, pollId))
      .groupBy(pollResponses.selectedOption);

    const responses = await responseQuery;

    // If userId provided, get user's specific response
    let userResponse = null;
    if (userId) {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pollId, userId, selectedOption } = body;

    // Validate required fields
    if (!pollId || !userId || !selectedOption) {
      return NextResponse.json(
        { success: false, message: 'Poll ID, user ID, and selected option are required' },
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