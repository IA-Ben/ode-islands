import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { collectibleDefinitions } from '../../../../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { withAuth } from '../../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const type = searchParams.get('type');
    const shape = searchParams.get('shape');
    const rarity = searchParams.get('rarity');

    // Get session information for potential future authorization
    const session = (request as any).session;

    // Build query conditions
    const conditions = [];
    if (eventId) conditions.push(eq(collectibleDefinitions.eventId, eventId));
    if (type) conditions.push(eq(collectibleDefinitions.type, type));
    if (shape) conditions.push(eq(collectibleDefinitions.shape, shape));
    if (rarity) conditions.push(eq(collectibleDefinitions.rarity, rarity));

    // Get collectible definitions ordered by grid position
    const definitions = await db
      .select()
      .from(collectibleDefinitions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(collectibleDefinitions.gridPosition);

    return NextResponse.json({
      success: true,
      collectibles: definitions,
      total: definitions.length,
    });

  } catch (error) {
    console.error('Collectible definitions fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch collectible definitions' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);