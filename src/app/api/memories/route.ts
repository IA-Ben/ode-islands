import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { eventMemories } from '../../../../shared/schema';
import { eq, desc, and, or } from 'drizzle-orm';
import { withAuth, withUserAuthAndCSRF, validateUserIdentifierFields, setUserIdentifierFields } from '../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const isPublic = searchParams.get('isPublic');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get session information for authorization
    const session = (request as any).session;
    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Build query conditions with proper authorization
    const conditions = [];
    
    // Filter by eventId if specified
    if (eventId) conditions.push(eq(eventMemories.eventId, eventId));
    
    // Handle access control for private vs public memories
    if (isPublic === 'true') {
      // Only public memories
      conditions.push(eq(eventMemories.isPublic, true));
    } else if (isPublic === 'false') {
      // Only private memories - user can only see their own unless they're admin
      if (session.isAdmin) {
        conditions.push(eq(eventMemories.isPublic, false));
      } else {
        conditions.push(
          and(
            eq(eventMemories.isPublic, false),
            eq(eventMemories.createdBy, session.userId)
          )
        );
      }
    } else {
      // No isPublic filter - show public memories + user's own private memories
      if (session.isAdmin) {
        // Admins can see all memories
        // No additional access control needed
      } else {
        // Regular users can see: public memories OR their own private memories
        conditions.push(
          or(
            eq(eventMemories.isPublic, true),
            and(
              eq(eventMemories.isPublic, false),
              eq(eventMemories.createdBy, session.userId)
            )
          )
        );
      }
    }

    // Get event memories with proper authorization
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

async function handlePOST(request: NextRequest) {
  try {
    const body = (request as any).parsedBody || await request.json();
    const session = (request as any).session;
    
    // Validate user identifier fields to prevent spoofing
    const validation = validateUserIdentifierFields(session, body, {
      userIdFields: ['createdBy'],
      requireMatchingUser: true
    });
    
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, message: validation.errorMessage },
        { status: 403 }
      );
    }
    
    // Automatically set user identifier fields based on session
    const validatedBody = setUserIdentifierFields(session, body, {
      createdBy: session.userId
    });
    
    const { eventId, title, description, mediaUrl, mediaType, tags, isPublic, createdBy } = validatedBody;

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

// Apply authentication middleware
export const GET = withAuth(handleGET);
export const POST = withUserAuthAndCSRF(handlePOST); // Users can only create memories as themselves + CSRF protection