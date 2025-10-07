import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../../server/db';
import { conceptArtImages, mediaAssets } from '../../../../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '../../../../../../../server/auth';
import { requirePermission } from '../../../../../../../server/rbac';

async function handleGET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collectionId = params.id;

    const images = await db
      .select({
        image: conceptArtImages,
        media: mediaAssets,
      })
      .from(conceptArtImages)
      .leftJoin(mediaAssets, eq(conceptArtImages.mediaId, mediaAssets.id))
      .where(eq(conceptArtImages.collectionId, collectionId))
      .orderBy(conceptArtImages.order);

    return NextResponse.json({
      success: true,
      images: images.map(i => ({
        ...i.image,
        imageUrl: i.media?.cloudUrl,
      })),
    });
  } catch (error) {
    console.error('Error fetching collection images:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

async function handlePOST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collectionId = params.id;
    const { mediaId, title, description, order = 0 } = await request.json();

    if (!mediaId) {
      return NextResponse.json(
        { success: false, error: 'Media ID is required' },
        { status: 400 }
      );
    }

    const [image] = await db
      .insert(conceptArtImages)
      .values({
        collectionId,
        mediaId,
        title,
        description,
        order,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, image });
  } catch (error) {
    console.error('Error adding image to collection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add image' },
      { status: 500 }
    );
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json(
        { success: false, error: 'Image ID is required' },
        { status: 400 }
      );
    }

    await db
      .delete(conceptArtImages)
      .where(eq(conceptArtImages.id, imageId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing image from collection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove image' },
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
