import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { cards, cardAssignments, eventLanes, mediaAssets } from '../../../../../shared/schema';
import { eq, and, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const laneKey = searchParams.get('laneKey');

    if (!laneKey) {
      return NextResponse.json(
        { success: false, error: 'laneKey parameter is required' },
        { status: 400 }
      );
    }

    const result = await db
      .select({
        id: cards.id,
        type: cards.type,
        title: cards.title,
        subtitle: cards.subtitle,
        summary: cards.summary,
        content: cards.content,
        size: cards.size,
        iconName: cards.iconName,
        imageMediaId: cards.imageMediaId,
        imageUrl: mediaAssets.cloudUrl,
        order: cardAssignments.order,
      })
      .from(cardAssignments)
      .innerJoin(eventLanes, eq(cardAssignments.parentId, eventLanes.id))
      .innerJoin(cards, eq(cardAssignments.cardId, cards.id))
      .leftJoin(mediaAssets, eq(cards.imageMediaId, mediaAssets.id))
      .where(
        and(
          eq(cardAssignments.parentType, 'event_lane'),
          eq(eventLanes.laneKey, laneKey),
          eq(cardAssignments.status, 'active'),
          eq(cards.publishStatus, 'published'),
          eq(cards.isActive, true)
        )
      )
      .orderBy(asc(cardAssignments.order));

    const eventLaneCards = result.map((row) => {
      const content = row.content as any;
      
      return {
        id: row.id,
        type: row.type,
        title: row.title,
        subtitle: row.subtitle || undefined,
        size: (row.size as 'S' | 'M' | 'L') || 'M',
        icon: row.iconName || undefined,
        imageUrl: row.imageUrl || undefined,
        description: content?.description || row.summary || undefined,
      };
    });

    return NextResponse.json({
      success: true,
      cards: eventLaneCards,
      count: eventLaneCards.length,
    });
  } catch (error) {
    console.error('Error fetching event lane cards:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch event lane cards',
        cards: []
      },
      { status: 500 }
    );
  }
}
