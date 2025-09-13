import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { eventMemories, users } from '../../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth, withUserAuthAndCSRF } from '../../../../../server/auth';

async function handleGET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const memoryId = params.id;
    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get memory with user details
    const memory = await db
      .select({
        memory: eventMemories,
        authorName: users.firstName,
        authorLastName: users.lastName,
      })
      .from(eventMemories)
      .leftJoin(users, eq(eventMemories.createdBy, users.id))
      .where(eq(eventMemories.id, memoryId))
      .limit(1);

    if (memory.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Memory not found' },
        { status: 404 }
      );
    }

    const memoryData = memory[0];

    // Check access permissions
    if (!memoryData.memory.isPublic && memoryData.memory.createdBy !== session.userId && !session.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Parse tags if they're stored as JSON strings
    const processedMemory = {
      ...memoryData.memory,
      tags: typeof memoryData.memory.tags === 'string' ? JSON.parse(memoryData.memory.tags || '[]') : memoryData.memory.tags || [],
      authorName: memoryData.authorName ? `${memoryData.authorName} ${memoryData.authorLastName || ''}`.trim() : 'Anonymous'
    };

    return NextResponse.json({
      success: true,
      memory: processedMemory,
    });

  } catch (error) {
    console.error('Memory fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch memory' },
      { status: 500 }
    );
  }
}

async function handleDELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const memoryId = params.id;
    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // First, get the memory to check ownership
    const existingMemory = await db
      .select()
      .from(eventMemories)
      .where(eq(eventMemories.id, memoryId))
      .limit(1);

    if (existingMemory.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Memory not found' },
        { status: 404 }
      );
    }

    const memory = existingMemory[0];

    // Check if user can delete this memory (owner or admin)
    if (memory.createdBy !== session.userId && !session.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'You can only delete your own memories' },
        { status: 403 }
      );
    }

    // Delete the memory
    await db
      .delete(eventMemories)
      .where(eq(eventMemories.id, memoryId));

    return NextResponse.json({
      success: true,
      message: 'Memory deleted successfully',
    });

  } catch (error) {
    console.error('Memory deletion error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to delete memory' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const GET = withAuth(handleGET);
export const DELETE = withUserAuthAndCSRF(handleDELETE); // Users can only delete their own memories + CSRF protection