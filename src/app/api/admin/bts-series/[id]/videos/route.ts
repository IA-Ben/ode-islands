import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../../server/db';
import { btsSeriesVideos, cards, mediaAssets } from '../../../../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '../../../../../../../server/auth';
import { requirePermission } from '../../../../../../../server/rbac';

async function handleGET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const seriesId = params.id;

    const videos = await db
      .select({
        video: btsSeriesVideos,
        card: cards,
        media: mediaAssets,
      })
      .from(btsSeriesVideos)
      .leftJoin(cards, eq(btsSeriesVideos.cardId, cards.id))
      .leftJoin(mediaAssets, eq(cards.videoMediaId, mediaAssets.id))
      .where(eq(btsSeriesVideos.seriesId, seriesId))
      .orderBy(btsSeriesVideos.order);

    return NextResponse.json({
      success: true,
      videos: videos.map(v => ({
        ...v.video,
        card: v.card,
        videoUrl: v.media?.cloudUrl,
      })),
    });
  } catch (error) {
    console.error('Error fetching series videos:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

async function handlePOST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const seriesId = params.id;
    const { cardId, order = 0, duration } = await request.json();

    if (!cardId) {
      return NextResponse.json(
        { success: false, error: 'Card ID is required' },
        { status: 400 }
      );
    }

    const [video] = await db
      .insert(btsSeriesVideos)
      .values({
        seriesId,
        cardId,
        order,
        duration,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, video });
  } catch (error) {
    console.error('Error adding video to series:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add video' },
      { status: 500 }
    );
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const seriesId = params.id;
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');

    if (!cardId) {
      return NextResponse.json(
        { success: false, error: 'Card ID is required' },
        { status: 400 }
      );
    }

    await db
      .delete(btsSeriesVideos)
      .where(
        and(
          eq(btsSeriesVideos.seriesId, seriesId),
          eq(btsSeriesVideos.cardId, cardId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing video from series:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove video' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(
  requirePermission('content:read', handleGET)
);

export const POST = withAuth(
  requirePermission('content:write', handlePOST)
);

export const DELETE = withAuth(
  requirePermission('content:write', handleDELETE)
);
