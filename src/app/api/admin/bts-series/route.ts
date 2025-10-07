import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { btsSeries, btsSeriesVideos, cards, mediaAssets } from '../../../../../shared/schema';
import { eq, desc, like, or, and } from 'drizzle-orm';
import { withAuth } from '../../../../../server/auth';
import { requirePermission } from '../../../../../server/rbac';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const publishStatus = searchParams.get('publishStatus');

    let query = db
      .select({
        series: btsSeries,
        coverImage: mediaAssets,
      })
      .from(btsSeries)
      .leftJoin(mediaAssets, eq(btsSeries.coverImageMediaId, mediaAssets.id))
      .$dynamic();

    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          like(btsSeries.title, `%${search}%`),
          like(btsSeries.description, `%${search}%`)
        )
      );
    }

    if (publishStatus) {
      conditions.push(eq(btsSeries.publishStatus, publishStatus));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(btsSeries.createdAt));

    // Get video counts for each series
    const seriesWithCounts = await Promise.all(
      results.map(async (row) => {
        const videoCount = await db
          .select()
          .from(btsSeriesVideos)
          .where(eq(btsSeriesVideos.seriesId, row.series.id));

        return {
          ...row.series,
          coverImage: row.coverImage,
          videoCount: videoCount.length,
        };
      })
    );

    return NextResponse.json({ success: true, series: seriesWithCounts });
  } catch (error) {
    console.error('Error fetching BTS series:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch BTS series' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      autoPlayNext,
      mixOfficialAndUGC,
      coverImageMediaId,
      publishStatus,
      isActive,
      videoCardIds,
    } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const [newSeries] = await tx
        .insert(btsSeries)
        .values({
          title,
          description,
          autoPlayNext: autoPlayNext || false,
          mixOfficialAndUGC: mixOfficialAndUGC || false,
          coverImageMediaId,
          publishStatus: publishStatus || 'draft',
          isActive: isActive !== undefined ? isActive : true,
        })
        .returning();

      // Add video assignments if provided
      if (videoCardIds && Array.isArray(videoCardIds) && videoCardIds.length > 0) {
        for (let i = 0; i < videoCardIds.length; i++) {
          await tx.insert(btsSeriesVideos).values({
            seriesId: newSeries.id,
            videoCardId: videoCardIds[i],
            order: i,
          });
        }
      }

      return newSeries;
    });

    return NextResponse.json({ success: true, series: result });
  } catch (error) {
    console.error('Error creating BTS series:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create BTS series' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(requirePermission('content:view')(handleGET));
export const POST = withAuth(requirePermission('content:create')(handlePOST));
