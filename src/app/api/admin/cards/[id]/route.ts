import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../../server/auth';
import { requirePermission } from '../../../../../../server/rbac';
import { db } from '../../../../../../server/db';
import { cards, cardAssignments, mediaAssets } from '../../../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { AuditLogger } from '../../../../../../server/auditLogger';

async function handleGET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cardId = params.id;

    const [card] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, cardId))
      .limit(1);

    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // Get assignments
    const assignments = await db
      .select()
      .from(cardAssignments)
      .where(eq(cardAssignments.cardId, cardId));

    // Get media if exists
    let imageMedia = null;
    let videoMedia = null;

    if (card.imageMediaId) {
      [imageMedia] = await db
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.id, card.imageMediaId))
        .limit(1);
    }

    if (card.videoMediaId) {
      [videoMedia] = await db
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.id, card.videoMediaId))
        .limit(1);
    }

    return NextResponse.json({
      card,
      assignments,
      imageMedia,
      videoMedia,
    });
  } catch (error) {
    console.error('Error fetching card:', error);
    return NextResponse.json(
      { error: 'Failed to fetch card' },
      { status: 500 }
    );
  }
}

async function handlePATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = (request as any).session;
    const cardId = params.id;
    const body = await request.json();

    // Get old card for audit log
    const [oldCard] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, cardId))
      .limit(1);

    if (!oldCard) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // Update card
    const [updatedCard] = await db
      .update(cards)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(cards.id, cardId))
      .returning();

    // Audit log
    await AuditLogger.logUpdate(
      session.userId,
      'card',
      cardId,
      oldCard,
      updatedCard,
      request
    );

    return NextResponse.json({ card: updatedCard });
  } catch (error) {
    console.error('Error updating card:', error);
    return NextResponse.json(
      { error: 'Failed to update card' },
      { status: 500 }
    );
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = (request as any).session;
    const cardId = params.id;

    // Get card for audit log
    const [card] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, cardId))
      .limit(1);

    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // Delete assignments first
    await db
      .delete(cardAssignments)
      .where(eq(cardAssignments.cardId, cardId));

    // Delete card
    await db
      .delete(cards)
      .where(eq(cards.id, cardId));

    // Audit log
    await AuditLogger.logDelete(
      session.userId,
      'card',
      cardId,
      card,
      request
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json(
      { error: 'Failed to delete card' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(requirePermission('cards:view')(handleGET));
export const PATCH = withAuth(requirePermission('cards:edit')(handlePATCH));
export const DELETE = withAuth(requirePermission('cards:delete')(handleDELETE));
