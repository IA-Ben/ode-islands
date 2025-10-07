import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../server/db';
import { conceptArtCollections, conceptArtImages, mediaAssets } from '../../../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { withAuth } from '../../../../../../server/auth';
import { requirePermission } from '../../../../../../server/rbac';

async function handleGET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const [collection] = await db
      .select()
      .from(conceptArtCollections)
      .where(eq(conceptArtCollections.id, id))
      .limit(1);

    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Get associated images
    const images = await db
      .select({
        image: conceptArtImages,
        media: mediaAssets,
      })
      .from(conceptArtImages)
      .leftJoin(mediaAssets, eq(conceptArtImages.imageMediaId, mediaAssets.id))
      .where(eq(conceptArtImages.collectionId, id))
      .orderBy(conceptArtImages.order);

    return NextResponse.json({
      success: true,
      collection: {
        ...collection,
        images: images.map(i => ({
          ...i.image,
          media: i.media,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching concept art collection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch concept art collection' },
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
    const { images, ...collectionData } = body;

    const result = await db.transaction(async (tx) => {
      const [updatedCollection] = await tx
        .update(conceptArtCollections)
        .set({
          ...collectionData,
          updatedAt: new Date(),
        })
        .where(eq(conceptArtCollections.id, id))
        .returning();

      if (!updatedCollection) {
        throw new Error('Collection not found');
      }

      // Update images if provided
      if (images !== undefined) {
        // Delete existing images
        await tx.delete(conceptArtImages).where(eq(conceptArtImages.collectionId, id));

        // Add new images
        if (Array.isArray(images) && images.length > 0) {
          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            await tx.insert(conceptArtImages).values({
              collectionId: id,
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
      }

      return updatedCollection;
    });

    return NextResponse.json({ success: true, collection: result });
  } catch (error) {
    console.error('Error updating concept art collection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update concept art collection' },
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
      // Delete images
      await tx.delete(conceptArtImages).where(eq(conceptArtImages.collectionId, id));

      // Delete collection
      await tx.delete(conceptArtCollections).where(eq(conceptArtCollections.id, id));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting concept art collection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete concept art collection' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(requirePermission('content:view')(handleGET));
export const PATCH = withAuth(requirePermission('content:edit')(handlePATCH));
export const DELETE = withAuth(requirePermission('content:delete')(handleDELETE));
