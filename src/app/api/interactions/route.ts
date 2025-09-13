import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { contentInteractions } from '../../../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { withAuth, withUserAuthAndCSRF } from '../../../../server/auth';
import { ScoringService } from '../../../../server/scoringService';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const contentType = searchParams.get('contentType');
    const contentId = searchParams.get('contentId');

    // Get authenticated user ID from session (prevents IDOR vulnerability)
    const session = (request as any).session;
    const sessionUserId = session.userId;

    if (!sessionUserId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Build query conditions - users can only view their own interactions
    const conditions = [eq(contentInteractions.userId, sessionUserId)];
    if (contentType) conditions.push(eq(contentInteractions.contentType, contentType));
    if (contentId) conditions.push(eq(contentInteractions.contentId, contentId));

    // Get user interactions
    const interactions = await db
      .select()
      .from(contentInteractions)
      .where(and(...conditions))
      .orderBy(desc(contentInteractions.timestamp));

    return NextResponse.json({
      success: true,
      interactions: interactions,
    });

  } catch (error) {
    console.error('Interactions fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch interactions' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = (request as any).parsedBody || await request.json();
    const { contentType, contentId, interactionType, duration, metadata } = body;

    // Get authenticated user ID from session (prevents spoofing)
    const session = (request as any).session;
    const userId = session.userId;

    // Validate required fields
    if (!contentType || !contentId || !interactionType) {
      return NextResponse.json(
        { success: false, message: 'Content type, content ID, and interaction type are required' },
        { status: 400 }
      );
    }

    // Create new interaction record
    const newInteraction = await db
      .insert(contentInteractions)
      .values({
        userId,
        contentType,
        contentId,
        interactionType,
        duration: duration || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        timestamp: new Date(),
      })
      .returning();

    // Award fan scoring points for specific interaction types
    const scoringService = new ScoringService();
    
    try {
      // Map interaction types to scoring activity types
      let activityType: string | null = null;
      
      switch (interactionType.toLowerCase()) {
        case 'ar_complete':
        case 'ar_interaction':
        case 'ar_view':
          activityType = 'ar_complete';
          break;
        case 'video_complete':
        case 'video_watch':
          // Only award for complete video watches to prevent spam
          if (interactionType.toLowerCase() === 'video_complete') {
            activityType = 'video_complete';
          }
          break;
        case 'quiz_complete':
          activityType = 'quiz_complete';
          break;
        case 'content_share':
        case 'share':
          activityType = 'content_share';
          break;
        default:
          // Award general interaction points for other types
          activityType = 'interaction';
          break;
      }

      if (activityType) {
        await scoringService.award(userId, {
          activityType,
          referenceType: contentType,
          referenceId: contentId,
          metadata: {
            interactionType,
            duration: duration || 0,
            contentType,
            ...(metadata || {})
          }
        });
      }
    } catch (scoringError) {
      console.error('Interaction scoring error:', scoringError);
      // Don't fail the main operation due to scoring errors
    }

    return NextResponse.json({
      success: true,
      message: 'Interaction recorded successfully',
      interaction: newInteraction[0],
    });

  } catch (error) {
    console.error('Interaction recording error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to record interaction' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const GET = withAuth(handleGET);
export const POST = withUserAuthAndCSRF(handlePOST); // Users can record their own interactions