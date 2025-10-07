import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../server/db';
import { btsSeries, btsSeriesVideos, cards, mediaAssets } from '../../../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { withAuth } from '../../../../../../server/auth';
import { requirePermission } from '../../../../../../server/rbac';

async function handleGET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const [seriesData] = await db
      .select({
        series: btsSeries,
        coverImage: mediaAssets,
      })
      .from(btsSeries)
      .leftJoin(mediaAssets, eq(btsSeries.coverImageMediaId, mediaAssets.id))
      .where(eq(btsSeries.id, id))
      .limit(1);

    if (!seriesData) {
      return NextResponse.json(
        { success: false, error: 'Series not found' },
        { status: 404 }
      );
    }

    // Get associated videos
    const videos = await db
      .select({
        assignment: btsSeriesVideos,
        card: cards,
        videoMedia: mediaAssets,
      })
      .from(btsSeriesVideos)
      .leftJoin(cards, eq(btsSeriesVideos.videoCardId, cards.id))
      .leftJoin(mediaAssets, eq(cards.videoMediaId, mediaAssets.id))
      .where(eq(btsSeriesVideos.seriesId, id))
      .orderBy(btsSeriesVideos.order);

    return NextResponse.json({
      success: true,
      series: {
        ...seriesData.series,
        coverImage: seriesData.coverImage,
        videos: videos.map(v => ({
          ...v.assignment,
          card: v.card,
          videoMedia: v.videoMedia,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching BTS series:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch BTS series' },
      { status: 500 }
    );
  }
}

async function handlePATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const { videoCardIds, ...seriesData } = body;

    const result = await db.transaction(async (tx) => {
      const [updatedSeries] = await tx
        .update(btsSeries)
        .set({
          ...seriesData,
          updatedAt: new Date(),
        })
        .where(eq(btsSeries.id, id))
        .returning();

      if (!updatedSeries) {
        throw new Error('Series not found');
      }

      // Update video assignments if provided
      if (videoCardIds !== undefined) {
        // Delete existing assignments
        await tx.delete(btsSeriesVideos).where(eq(btsSeriesVideos.seriesId, id));

        // Add new assignments
        if (Array.isArray(videoCardIds) && videoCardIds.length > 0) {
          for (let i = 0; i < videoCardIds.length; i++) {
            await tx.insert(btsSeriesVideos).values({
              seriesId: id,
              videoCardId: videoCardIds[i],
              order: i,
            });
          }
        }
      }

      return updatedSeries;
    });

    return NextResponse.json({ success: true, series: result });
  } catch (error) {
    console.error('Error updating BTS series:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update BTS series' },
      { status: 500 }
    );
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    await db.transaction(async (tx) => {
      // Delete video assignments
      await tx.delete(btsSeriesVideos).where(eq(btsSeriesVideos.seriesId, id));

      // Delete series
      await tx.delete(btsSeries).where(eq(btsSeries.id, id));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting BTS series:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete BTS series' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(requirePermission('content:view')(handleGET));
export const PATCH = withAuth(requirePermission('content:edit')(handlePATCH));
export const DELETE = withAuth(requirePermission('content:delete')(handleDELETE));
