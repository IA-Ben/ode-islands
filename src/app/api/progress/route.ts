import { NextRequest } from 'next/server';
import { db } from '../../../../server/db';
import { userProgress, users } from '../../../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { withUserAuth } from '../../../../server/auth';
import { ScoringService } from '../../../../server/scoringService';
import { respondOk, respondError, respondUnauthorized, respondBadRequest, respondOkCompat } from '../../../lib/apiHelpers';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');

    // Get authenticated user ID from session (prevents IDOR vulnerability)
    const session = (request as any).session;
    const userId = session.userId;

    if (!userId) {
      return respondUnauthorized('User session not found');
    }

    // Build query conditions
    const conditions = [eq(userProgress.userId, userId)];
    if (chapterId) {
      conditions.push(eq(userProgress.chapterId, chapterId));
    }

    // Get user progress
    const progress = await db
      .select()
      .from(userProgress)
      .where(and(...conditions))
      .orderBy(desc(userProgress.lastAccessed));

    return respondOkCompat(progress, {
      legacyKey: 'progress',
      message: `Retrieved ${progress.length} progress record${progress.length !== 1 ? 's' : ''}`
    });

  } catch (error) {
    return respondError(error instanceof Error ? error : 'Failed to fetch progress');
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = (request as any).parsedBody || await request.json();
    const { chapterId, cardIndex, timeSpent } = body;

    // Get authenticated user ID from session (prevents spoofing)
    const session = (request as any).session;
    const userId = session.userId;

    // Validate required fields
    if (!chapterId || cardIndex === undefined) {
      return respondBadRequest('Missing required fields', {
        message: 'Chapter ID and card index are required'
      });
    }

    // Check if progress record already exists
    const existingProgress = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.chapterId, chapterId),
          eq(userProgress.cardIndex, cardIndex)
        )
      )
      .limit(1);

    if (existingProgress.length > 0) {
      // Update existing progress
      const updatedProgress = await db
        .update(userProgress)
        .set({
          lastAccessed: new Date(),
          timeSpent: timeSpent || existingProgress[0].timeSpent,
        })
        .where(eq(userProgress.id, existingProgress[0].id))
        .returning();

      return respondOkCompat(updatedProgress[0], {
        legacyKey: 'progress',
        message: 'Progress updated successfully'
      });
    } else {
      // Create new progress record
      const newProgress = await db
        .insert(userProgress)
        .values({
          userId,
          chapterId,
          cardIndex,
          timeSpent: timeSpent || 0,
          completedAt: new Date(),
          lastAccessed: new Date(),
        })
        .returning();

      // Award fan scoring points for completing new content
      const scoringService = new ScoringService();
      
      // Always award card completion points for new progress
      try {
        await scoringService.award(userId, {
          activityType: 'card_complete',
          referenceType: 'card',
          referenceId: `${chapterId}-${cardIndex}`,
          chapterId: chapterId,
          cardIndex: cardIndex,
          metadata: {
            timeSpent: timeSpent || 0,
            completedAt: new Date().toISOString()
          }
        });
      } catch (scoringError) {
        console.error('Card completion scoring error:', scoringError);
        // Don't fail the main operation due to scoring errors
      }

      // Check if this completes a chapter and award chapter completion points
      // Note: This is a simplified check - in a real app you'd want to verify
      // all cards in the chapter are completed
      try {
        // Get total cards completed for this chapter by this user
        const chapterProgress = await db
          .select()
          .from(userProgress)
          .where(
            and(
              eq(userProgress.userId, userId),
              eq(userProgress.chapterId, chapterId)
            )
          );

        // If this is a significant milestone (every 5 cards), award chapter progress points
        if (chapterProgress.length % 5 === 0) {
          await scoringService.award(userId, {
            activityType: 'chapter_complete',
            referenceType: 'chapter',
            referenceId: chapterId,
            chapterId: chapterId,
            metadata: {
              cardsCompleted: chapterProgress.length,
              milestone: `${chapterProgress.length}_cards`
            }
          });
        }
      } catch (scoringError) {
        console.error('Chapter completion scoring error:', scoringError);
        // Don't fail the main operation due to scoring errors
      }

      return respondOkCompat(newProgress[0], {
        legacyKey: 'progress', 
        message: 'Progress recorded successfully'
      });
    }

  } catch (error) {
    return respondError(error instanceof Error ? error : 'Failed to save progress');
  }
}

// Apply authentication middleware
export const GET = withUserAuth(handleGET);
export const POST = withUserAuth(handlePOST);