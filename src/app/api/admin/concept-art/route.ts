import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { conceptArtCollections, conceptArtImages, mediaAssets } from '../../../../../shared/schema';
import { eq, desc, like, or, and } from 'drizzle-orm';
import { withAuth } from '../../../../../server/auth';
import { requirePermission } from '../../../../../server/rbac';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const publishStatus = searchParams.get('publishStatus');

    let query = db
      .select()
      .from(conceptArtCollections)
      .$dynamic();

    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          like(conceptArtCollections.title, `%${search}%`),
          like(conceptArtCollections.description, `%${search}%`)
        )
      );
    }

    if (publishStatus) {
      conditions.push(eq(conceptArtCollections.publishStatus, publishStatus));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(conceptArtCollections.createdAt));

    // Get image counts for each collection
    const collectionsWithCounts = await Promise.all(
      results.map(async (collection) => {
        const images = await db
          .select()
          .from(conceptArtImages)
          .where(eq(conceptArtImages.collectionId, collection.id));

        return {
          ...collection,
          imageCount: images.length,
        };
      })
    );

    return NextResponse.json({ success: true, collections: collectionsWithCounts });
  } catch (error) {
    console.error('Error fetching concept art collections:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch concept art collections' },
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
      coverLayout,
      showWatermark,
      allowDownload,
      publishStatus,
      isActive,
      images,
    } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const [newCollection] = await tx
        .insert(conceptArtCollections)
        .values({
          title,
          description,
          coverLayout: coverLayout || 'mosaic',
          showWatermark: showWatermark || false,
          allowDownload: allowDownload || false,
          publishStatus: publishStatus || 'draft',
          isActive: isActive !== undefined ? isActive : true,
        })
        .returning();

      // Add images if provided
      if (images && Array.isArray(images) && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          await tx.insert(conceptArtImages).values({
            collectionId: newCollection.id,
            imageMediaId: img.imageMediaId,
            title: img.title,
            caption: img.caption,
            artistName: img.artistName,
            artistCredit: img.artistCredit,
            spoilerFlag: img.spoilerFlag || false,
            order: i,
          });
        }
      }

      return newCollection;
    });

    return NextResponse.json({ success: true, collection: result });
  } catch (error) {
    console.error('Error creating concept art collection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create concept art collection' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(requirePermission('content:view')(handleGET));
export const POST = withAuth(requirePermission('content:create')(handlePOST));
