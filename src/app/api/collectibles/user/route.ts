import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { userCollectibles, collectibleDefinitions } from '../../../../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { withAuth } from '../../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const isUnlocked = searchParams.get('isUnlocked');
    const isFavorite = searchParams.get('isFavorite');

    // Get session information for authorization
    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to access user collectibles' },
        { status: 401 }
      );
    }

    // Build base query for user's collectibles
    let query = db
      .select({
        userCollectible: userCollectibles,
        definition: collectibleDefinitions
      })
      .from(userCollectibles)
      .leftJoin(collectibleDefinitions, eq(userCollectibles.collectibleId, collectibleDefinitions.id))
      .where(eq(userCollectibles.userId, session.userId));

    // Apply additional filters
    const conditions = [eq(userCollectibles.userId, session.userId)];
    
    // Filter by event through collectible definition
    if (eventId) {
      conditions.push(eq(collectibleDefinitions.eventId, eventId));
    }
    
    if (isUnlocked !== null) {
      conditions.push(eq(userCollectibles.isUnlocked, isUnlocked === 'true'));
    }
    
    if (isFavorite === 'true') {
      conditions.push(eq(userCollectibles.isFavorite, true));
    }

    // Execute query with all conditions
    const userCollectibleData = await db
      .select({
        userCollectible: userCollectibles,
        definition: collectibleDefinitions
      })
      .from(userCollectibles)
      .leftJoin(collectibleDefinitions, eq(userCollectibles.collectibleId, collectibleDefinitions.id))
      .where(and(...conditions))
      .orderBy(desc(userCollectibles.unlockedAt));

    // Process the data to ensure proper formatting
    const processedUserCollectibles = userCollectibleData.map(({ userCollectible, definition }) => ({
      ...userCollectible,
      unlockContext: typeof userCollectible.unlockContext === 'string' ? 
        JSON.parse(userCollectible.unlockContext || '{}') : 
        userCollectible.unlockContext || {},
      definition: definition // Include definition for convenience
    }));

    return NextResponse.json({
      success: true,
      userCollectibles: processedUserCollectibles,
      total: processedUserCollectibles.length,
    });

  } catch (error) {
    console.error('User collectibles fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user collectibles' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);