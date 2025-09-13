import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { qaSessions } from '../../../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const isModerated = searchParams.get('isModerated');
    const isAnswered = searchParams.get('isAnswered');

    // Build query conditions
    const conditions = [];
    if (eventId) conditions.push(eq(qaSessions.eventId, eventId));
    if (isModerated) conditions.push(eq(qaSessions.isModerated, isModerated === 'true'));
    if (isAnswered) conditions.push(eq(qaSessions.isAnswered, isAnswered === 'true'));

    // Get Q&A sessions ordered by upvotes and creation time
    const questions = await db
      .select()
      .from(qaSessions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(qaSessions.upvotes), desc(qaSessions.createdAt));

    return NextResponse.json({
      success: true,
      questions: questions,
    });

  } catch (error) {
    console.error('Q&A fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, question, askedBy } = body;

    // Validate required fields
    if (!eventId || !question || !askedBy) {
      return NextResponse.json(
        { success: false, message: 'Event ID, question, and askedBy are required' },
        { status: 400 }
      );
    }

    // Create new Q&A session
    const newQuestion = await db
      .insert(qaSessions)
      .values({
        eventId,
        question,
        askedBy,
        isModerated: false,
        isAnswered: false,
        upvotes: 0,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Question submitted successfully',
      question: newQuestion[0],
    });

  } catch (error) {
    console.error('Q&A submission error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to submit question' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionId, answer, answeredBy, isModerated, upvotes } = body;

    if (!questionId) {
      return NextResponse.json(
        { success: false, message: 'Question ID is required' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (answer !== undefined) {
      updateData.answer = answer;
      updateData.answeredBy = answeredBy;
      updateData.isAnswered = true;
      updateData.answeredAt = new Date();
    }
    if (isModerated !== undefined) updateData.isModerated = isModerated;
    if (upvotes !== undefined) updateData.upvotes = upvotes;

    // Update Q&A session
    const updatedQuestion = await db
      .update(qaSessions)
      .set(updateData)
      .where(eq(qaSessions.id, questionId))
      .returning();

    if (updatedQuestion.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Question updated successfully',
      question: updatedQuestion[0],
    });

  } catch (error) {
    console.error('Q&A update error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to update question' },
      { status: 500 }
    );
  }
}