import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { cards, cardAssignments, mediaAssets } from '../../../../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lane = searchParams.get('lane'); // 'plan', 'discover', 'community', 'bts'
    const tier = searchParams.get('tier'); // 'Bronze', 'Silver', 'Gold' for filtering by user tier

    let query = db
      .select({
        card: cards,
        assignment: cardAssignments,
        imageMedia: mediaAssets,
      })
      .from(cards)
      .leftJoin(cardAssignments, eq(cards.id, cardAssignments.cardId))
      .leftJoin(mediaAssets, eq(cards.imageMediaId, mediaAssets.id))
      .$dynamic();

    const conditions: any[] = [
      eq(cards.scope, 'event'), // Before phase uses 'event' scope
      eq(cards.publishStatus, 'published'), // Only published cards
      eq(cards.isActive, true), // Only active cards
    ];

    // Filter by lane if specified
    if (lane) {
      conditions.push(
        and(
          eq(cardAssignments.parentType, 'before_lane'),
          eq(cardAssignments.parentId, lane)
        )
      );
    }

    query = query.where(and(...conditions));
    const results = await query.orderBy(
      cardAssignments.order ? cardAssignments.order : desc(cards.createdAt)
    );

    // Group cards and deduplicate (since left join can create duplicates)
    const cardsMap = new Map();
    for (const row of results) {
      if (!cardsMap.has(row.card.id)) {
        cardsMap.set(row.card.id, {
          ...row.card,
          imageMedia: row.imageMedia,
          imageUrl: row.imageMedia?.cloudUrl || null,
          assignments: [],
        });
      }
      if (row.assignment) {
        cardsMap.get(row.card.id).assignments.push(row.assignment);
      }
    }

    const cardsList = Array.from(cardsMap.values());

    return NextResponse.json({
      cards: cardsList,
      count: cardsList.length,
    });
  } catch (error) {
    console.error('Error fetching before cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch before cards' },
      { status: 500 }
    );
  }
}
