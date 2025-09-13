import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { polls, pollResponses } from '../../../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');
    const cardIndex = searchParams.get('cardIndex');
    const isLive = searchParams.get('isLive');

    // Build query conditions
    const conditions = [];
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterId, cardIndex, question, options, pollType, correctAnswer, isLive, expiresAt, createdBy } = body;

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

    // Create new poll
    const newPoll = await db
      .insert(polls)
      .values({
        chapterId,
        cardIndex,
        question,
        options: JSON.stringify(options),
        pollType,
        correctAnswer,
        isLive: isLive || false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy,
      })
      .returning();

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