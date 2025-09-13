import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { eventMemories } from '../../../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const isPublic = searchParams.get('isPublic');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query conditions
    const conditions = [];
    if (eventId) conditions.push(eq(eventMemories.eventId, eventId));
    if (isPublic) conditions.push(eq(eventMemories.isPublic, isPublic === 'true'));

    // Get event memories
    const memories = await db
      .select()
      .from(eventMemories)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(eventMemories.createdAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      memories: memories,
    });

  } catch (error) {
    console.error('Memories fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, title, description, mediaUrl, mediaType, tags, isPublic, createdBy } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { success: false, message: 'Title is required' },
        { status: 400 }
      );
    }

    // Create new memory
    const newMemory = await db
      .insert(eventMemories)
      .values({
        eventId,
        title,
        description,
        mediaUrl,
        mediaType,
        tags: tags ? JSON.stringify(tags) : null,
        isPublic: isPublic !== undefined ? isPublic : true,
        createdBy,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Memory created successfully',
      memory: newMemory[0],
    });

  } catch (error) {
    console.error('Memory creation error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to create memory' },
      { status: 500 }
    );
  }
}