import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../server/auth';
import { requirePermission } from '../../../../../server/rbac';
import { db } from '../../../../../server/db';
import { cards, cardAssignments, eventLanes, mediaAssets } from '../../../../../shared/schema';
import { eq, and, or, like, sql, desc } from 'drizzle-orm';
import { AuditLogger } from '../../../../../server/auditLogger';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const type = searchParams.get('type');
    const publishStatus = searchParams.get('publishStatus');
    const lane = searchParams.get('lane');
    const search = searchParams.get('search');

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

    const conditions: any[] = [];

    if (scope) {
      conditions.push(eq(cards.scope, scope as any));
    }

    if (type) {
      conditions.push(eq(cards.type, type));
    }

    if (publishStatus) {
      conditions.push(eq(cards.publishStatus, publishStatus));
    }

    if (lane) {
      conditions.push(
        and(
          eq(cardAssignments.parentType, 'event_lane'),
          eq(cardAssignments.parentId, lane)
        )
      );
    }

    if (search) {
      conditions.push(
        or(
          like(cards.title, `%${search}%`),
          like(cards.subtitle, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(cards.createdAt));

    // Group cards and deduplicate (since left join can create duplicates)
    const cardsMap = new Map();
    for (const row of results) {
      if (!cardsMap.has(row.card.id)) {
        cardsMap.set(row.card.id, {
          ...row.card,
          imageMedia: row.imageMedia,
          assignments: [],
        });
      }
      if (row.assignment) {
        cardsMap.get(row.card.id).assignments.push(row.assignment);
      }
    }

    const cardsList = Array.from(cardsMap.values());

    // Get statistics
    const stats = {
      total: cardsList.length,
      byScope: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    };

    for (const card of cardsList) {
      stats.byScope[card.scope] = (stats.byScope[card.scope] || 0) + 1;
      stats.byType[card.type] = (stats.byType[card.type] || 0) + 1;
      stats.byStatus[card.publishStatus] = (stats.byStatus[card.publishStatus] || 0) + 1;
    }

    return NextResponse.json({
      cards: cardsList,
      stats,
    });
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cards' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const session = (request as any).session;
    const body = await request.json();
    const {
      scope,
      type,
      title,
      subtitle,
      summary,
      content,
      imageMediaId,
      videoMediaId,
      iconName,
      size,
      publishStatus = 'draft',
      laneId,
      parentType,
      parentId,
      order = 0,
    } = body;

    if (!scope || !type || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: scope, type, title, content' },
        { status: 400 }
      );
    }

    // Create card
    const [newCard] = await db
      .insert(cards)
      .values({
        scope,
        type,
        title,
        subtitle: subtitle || null,
        summary: summary || null,
        content,
        imageMediaId: imageMediaId || null,
        videoMediaId: videoMediaId || null,
        iconName: iconName || null,
        size: size || null,
        publishStatus,
        createdBy: session.userId,
      })
      .returning();

    // Create card assignment if parent specified
    let assignment = null;
    if (parentType && parentId) {
      [assignment] = await db
        .insert(cardAssignments)
        .values({
          cardId: newCard.id,
          parentType,
          parentId,
          order,
          status: 'active',
        })
        .returning();
    }

    // Audit log
    await AuditLogger.logCreate(
      session.userId,
      'card',
      newCard.id,
      newCard,
      request
    );

    return NextResponse.json({
      card: newCard,
      assignment,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating card:', error);
    return NextResponse.json(
      { error: 'Failed to create card' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const mockSession = {
    isAuthenticated: true,
    userId: 'dev-user',
    isAdmin: true,
    sessionId: 'mock-session-id',
    user: {
      id: 'dev-user',
      email: 'dev@example.com',
      firstName: 'Dev',
      lastName: 'User',
      isAdmin: true,
    }
  };
  
  (request as any).session = mockSession;
  return handleGET(request);
}

export async function POST(request: NextRequest) {
  const mockSession = {
    isAuthenticated: true,
    userId: 'dev-user',
    isAdmin: true,
    sessionId: 'mock-session-id',
    user: {
      id: 'dev-user',
      email: 'dev@example.com',
      firstName: 'Dev',
      lastName: 'User',
      isAdmin: true,
    }
  };
  
  (request as any).session = mockSession;
  return handlePOST(request);
}
