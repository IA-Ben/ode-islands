import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { userMemoryWallet, users } from '../../../../shared/schema';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import { withAuth, withUserAuthAndCSRF, validateUserIdentifierFields, setUserIdentifierFields } from '../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get('sourceType');
    const category = searchParams.get('category');
    const eventId = searchParams.get('eventId');
    const chapterId = searchParams.get('chapterId');
    const isFavorite = searchParams.get('isFavorite');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get session information for authorization
    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to access memory wallet' },
        { status: 401 }
      );
    }

    // Build query conditions
    const conditions = [eq(userMemoryWallet.userId, session.userId)];
    
    if (sourceType) conditions.push(eq(userMemoryWallet.sourceType, sourceType));
    if (category) conditions.push(eq(userMemoryWallet.memoryCategory, category));
    if (eventId) conditions.push(eq(userMemoryWallet.eventId, eventId));
    if (chapterId) conditions.push(eq(userMemoryWallet.chapterId, chapterId));
    if (isFavorite === 'true') conditions.push(eq(userMemoryWallet.isFavorite, true));

    // Get user's memories with user details
    const memories = await db
      .select({
        memory: userMemoryWallet,
      })
      .from(userMemoryWallet)
      .where(and(...conditions))
      .orderBy(desc(userMemoryWallet.collectedAt))
      .limit(limit)
      .offset(offset);

    // Process memories to ensure proper data formatting
    const processedMemories = memories.map(({ memory }) => ({
      ...memory,
      tags: typeof memory.tags === 'string' ? JSON.parse(memory.tags || '[]') : memory.tags || [],
      sourceMetadata: typeof memory.sourceMetadata === 'string' ? JSON.parse(memory.sourceMetadata || '{}') : memory.sourceMetadata || {},
      collectionContext: typeof memory.collectionContext === 'string' ? JSON.parse(memory.collectionContext || '{}') : memory.collectionContext || {},
    }));

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(userMemoryWallet)
      .where(and(...conditions));

    return NextResponse.json({
      success: true,
      memories: processedMemories,
      total: totalResult[0]?.count || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Memory wallet fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch memory wallet' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to add memory' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      mediaUrl,
      mediaType,
      thumbnail,
      sourceType,
      sourceId,
      sourceMetadata,
      eventId,
      chapterId,
      cardIndex,
      collectionTrigger,
      collectionContext,
      userNotes,
      isFavorite,
      tags,
      memoryCategory,
      emotionalTone,
    } = body;

    // Validate required fields
    if (!title || !sourceType) {
      return NextResponse.json(
        { success: false, message: 'Title and source type are required' },
        { status: 400 }
      );
    }

    // Validate user identifier fields to prevent spoofing (no user ID fields in memory wallet)
    const validation = validateUserIdentifierFields(session, body, {
      userIdFields: [],
      requireMatchingUser: false
    });
    
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, message: validation.errorMessage },
        { status: 403 }
      );
    }

    // Prepare memory data - memory wallet is personal so userId is always from session
    const memoryData = {
      title,
      description,
      mediaUrl,
      mediaType,
      thumbnail,
      sourceType,
      sourceId,
      sourceMetadata: JSON.stringify(sourceMetadata || {}),
      eventId,
      chapterId,
      cardIndex: cardIndex ? parseInt(cardIndex) : null,
      collectionTrigger: collectionTrigger || 'manual',
      collectionContext: JSON.stringify(collectionContext || {}),
      userNotes,
      isFavorite: isFavorite || false,
      tags: JSON.stringify(tags || []),
      memoryCategory,
      emotionalTone,
      userId: session.userId, // Always use session userId for memory wallet
    };

    // Insert memory into database
    const result = await db
      .insert(userMemoryWallet)
      .values(memoryData)
      .returning();

    const memory = result[0];

    // Process the returned memory for response
    const processedMemory = {
      ...memory,
      tags: typeof memory.tags === 'string' ? JSON.parse(memory.tags || '[]') : memory.tags || [],
      sourceMetadata: typeof memory.sourceMetadata === 'string' ? JSON.parse(memory.sourceMetadata || '{}') : memory.sourceMetadata || {},
      collectionContext: typeof memory.collectionContext === 'string' ? JSON.parse(memory.collectionContext || '{}') : memory.collectionContext || {},
    };

    return NextResponse.json({
      success: true,
      memory: processedMemory,
      message: 'Memory added to wallet successfully',
    });

  } catch (error) {
    console.error('Memory creation error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to add memory to wallet' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);
export const POST = withUserAuthAndCSRF(handlePOST);