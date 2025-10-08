import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { heroContents, mediaAssets } from '@/shared/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const contents = await db
      .select({
        id: heroContents.id,
        name: heroContents.name,
        type: heroContents.type,
        title: heroContents.title,
        subtitle: heroContents.subtitle,
        imageMediaId: heroContents.imageMediaId,
        videoMediaId: heroContents.videoMediaId,
        ctaPrimary: heroContents.ctaPrimary,
        ctaSecondary: heroContents.ctaSecondary,
        settings: heroContents.settings,
        isActive: heroContents.isActive,
        createdAt: heroContents.createdAt,
        updatedAt: heroContents.updatedAt,
        imageMedia: {
          id: mediaAssets.id,
          fileName: mediaAssets.title,
          fileType: mediaAssets.fileType,
          fileUrl: mediaAssets.cloudUrl,
          thumbnailUrl: mediaAssets.cloudUrl,
          fileSize: mediaAssets.fileSize,
        },
      })
      .from(heroContents)
      .leftJoin(mediaAssets, eq(heroContents.imageMediaId, mediaAssets.id))
      .orderBy(desc(heroContents.createdAt));

    // Fetch video media separately
    const contentsWithMedia = await Promise.all(
      contents.map(async (content) => {
        let videoMedia = null;
        if (content.videoMediaId) {
          const [video] = await db
            .select({
              id: mediaAssets.id,
              fileName: mediaAssets.title,
              fileType: mediaAssets.fileType,
              fileUrl: mediaAssets.cloudUrl,
              thumbnailUrl: mediaAssets.cloudUrl,
              fileSize: mediaAssets.fileSize,
            })
            .from(mediaAssets)
            .where(eq(mediaAssets.id, content.videoMediaId))
            .limit(1);
          videoMedia = video || null;
        }

        return {
          ...content,
          videoMedia,
        };
      })
    );

    return NextResponse.json({ contents: contentsWithMedia });
  } catch (error) {
    console.error('Error fetching hero contents:', error);
    return NextResponse.json({ error: 'Failed to fetch hero contents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      type,
      title,
      subtitle,
      imageMediaId,
      videoMediaId,
      ctaPrimary,
      ctaSecondary,
      settings,
      isActive,
    } = body;

    if (!name || !type || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [newContent] = await db
      .insert(heroContents)
      .values({
        name,
        type,
        title,
        subtitle: subtitle || null,
        imageMediaId: imageMediaId || null,
        videoMediaId: videoMediaId || null,
        ctaPrimary: ctaPrimary || null,
        ctaSecondary: ctaSecondary || null,
        settings: settings || {},
        isActive: isActive || false,
      })
      .returning();

    return NextResponse.json(newContent);
  } catch (error) {
    console.error('Error creating hero content:', error);
    return NextResponse.json({ error: 'Failed to create hero content' }, { status: 500 });
  }
}
