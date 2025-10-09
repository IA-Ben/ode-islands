import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { userMemoryWallet } from '../../../../../shared/schema';
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

    // Get memory from user's wallet only
    const memory = await db
      .select()
      .from(userMemoryWallet)
      .where(
        and(
          eq(userMemoryWallet.id, memoryId),
          eq(userMemoryWallet.userId, session.userId)
        )
      )
      .limit(1);

    if (memory.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Memory not found in your wallet' },
        { status: 404 }
      );
    }

    const memoryData = memory[0];

    // Process memory data for response
    const processedMemory = {
      ...memoryData,
      tags: typeof memoryData.tags === 'string' ? JSON.parse(memoryData.tags || '[]') : memoryData.tags || [],
      sourceMetadata: typeof memoryData.sourceMetadata === 'string' ? JSON.parse(memoryData.sourceMetadata || '{}') : memoryData.sourceMetadata || {},
      collectionContext: typeof memoryData.collectionContext === 'string' ? JSON.parse(memoryData.collectionContext || '{}') : memoryData.collectionContext || {},
    };

    return NextResponse.json({
      success: true,
      memory: processedMemory,
    });

  } catch (error) {
    console.error('Memory wallet fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch memory' },
      { status: 500 }
    );
  }
}

async function handlePUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const memoryId = params.id;
    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      userNotes,
      isFavorite,
      tags,
      memoryCategory,
      emotionalTone,
      displayOrder,
    } = body;

    // Verify memory belongs to user
    const existingMemory = await db
      .select()
      .from(userMemoryWallet)
      .where(
        and(
          eq(userMemoryWallet.id, memoryId),
          eq(userMemoryWallet.userId, session.userId)
        )
      )
      .limit(1);

    if (existingMemory.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Memory not found in your wallet' },
        { status: 404 }
      );
    }

    // Update memory with provided fields
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (userNotes !== undefined) updateData.userNotes = userNotes;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (memoryCategory !== undefined) updateData.memoryCategory = memoryCategory;
    if (emotionalTone !== undefined) updateData.emotionalTone = emotionalTone;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    const result = await db
      .update(userMemoryWallet)
      .set(updateData)
      .where(
        and(
          eq(userMemoryWallet.id, memoryId),
          eq(userMemoryWallet.userId, session.userId)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Failed to update memory' },
        { status: 500 }
      );
    }

    const updatedMemory = result[0];

    // Process memory data for response
    const processedMemory = {
      ...updatedMemory,
      tags: typeof updatedMemory.tags === 'string' ? JSON.parse(updatedMemory.tags || '[]') : updatedMemory.tags || [],
      sourceMetadata: typeof updatedMemory.sourceMetadata === 'string' ? JSON.parse(updatedMemory.sourceMetadata || '{}') : updatedMemory.sourceMetadata || {},
      collectionContext: typeof updatedMemory.collectionContext === 'string' ? JSON.parse(updatedMemory.collectionContext || '{}') : updatedMemory.collectionContext || {},
    };

    return NextResponse.json({
      success: true,
      memory: processedMemory,
      message: 'Memory updated successfully',
    });

  } catch (error) {
    console.error('Memory update error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to update memory' },
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

    // Verify memory belongs to user before deletion
    const existingMemory = await db
      .select()
      .from(userMemoryWallet)
      .where(
        and(
          eq(userMemoryWallet.id, memoryId),
          eq(userMemoryWallet.userId, session.userId)
        )
      )
      .limit(1);

    if (existingMemory.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Memory not found in your wallet' },
        { status: 404 }
      );
    }

    // Delete the memory
    await db
      .delete(userMemoryWallet)
      .where(
        and(
          eq(userMemoryWallet.id, memoryId),
          eq(userMemoryWallet.userId, session.userId)
        )
      );

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

export const GET = withAuth(async (request: NextRequest, context: any) => handleGET(request, context));
export const PUT = withUserAuthAndCSRF(async (request: NextRequest, context: any) => handlePUT(request, context));
export const DELETE = withUserAuthAndCSRF(async (request: NextRequest, context: any) => handleDELETE(request, context));