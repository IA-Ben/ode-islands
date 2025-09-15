import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { eventMemories } from '../../../../shared/schema';
import { eq, desc, and, or, count } from 'drizzle-orm';
import { withAuth, withUserAuthAndCSRF, validateUserIdentifierFields, setUserIdentifierFields } from '../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const isPublic = searchParams.get('isPublic');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Cap at 100 for performance
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get session information for authorization (may be null for unauthenticated users)
    const session = (request as any).session;

    // Build query conditions with proper authorization
    const conditions = [];
    
    // Filter by eventId if specified
    if (eventId) conditions.push(eq(eventMemories.eventId, eventId));
    
    // Handle access control for private vs public memories
    if (isPublic === 'true') {
      // Only public memories - accessible to everyone
      conditions.push(eq(eventMemories.isPublic, true));
    } else if (isPublic === 'false') {
      // Only private memories - user must be authenticated and can only see their own unless they're admin
      if (!session || !session.isAuthenticated) {
        return NextResponse.json(
          { success: false, message: 'Authentication required to access private memories' },
          { status: 401 }
        );
      }
      
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
      // No isPublic filter - show public memories + user's own private memories (if authenticated)
      if (session && session.isAuthenticated) {
        if (session.isAdmin) {
          // Admins can see all memories
          // No additional access control needed
        } else {
          // Authenticated users can see: public memories OR their own private memories
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
      } else {
        // Unauthenticated users can only see public memories
        conditions.push(eq(eventMemories.isPublic, true));
      }
    }

    // Get total count for pagination metadata
    const totalCountQuery = db
      .select({ count: count() })
      .from(eventMemories)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const [totalCountResult, memories] = await Promise.all([
      totalCountQuery,
      // Get event memories with proper authorization and pagination
      db
        .select()
        .from(eventMemories)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(eventMemories.createdAt))
        .limit(limit)
        .offset(offset)
    ]);

    const totalCount = totalCountResult[0]?.count || 0;
    const hasMore = offset + limit < totalCount;
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return NextResponse.json({
      success: true,
      memories: memories,
      pagination: {
        total: totalCount,
        limit,
        offset,
        currentPage,
        totalPages,
        hasMore,
        hasPrevious: offset > 0
      }
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
export const GET = handleGET; // Public endpoint - handles authentication internally
export const POST = withUserAuthAndCSRF(handlePOST); // Users can only create memories as themselves + CSRF protection