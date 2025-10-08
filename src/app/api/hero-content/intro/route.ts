import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { heroContents, mediaAssets } from '@/shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Fetch the active intro video with showOnLaunch setting
    const [content] = await db
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
      })
      .from(heroContents)
      .where(
        and(
          eq(heroContents.type, 'intro_video'),
          eq(heroContents.isActive, true)
        )
      )
      .orderBy(desc(heroContents.createdAt))
      .limit(1);

    if (!content) {
      return NextResponse.json({ content: null });
    }

    // Fetch media assets
    let imageMedia = null;
    let videoMedia = null;

    if (content.imageMediaId) {
      const [image] = await db
        .select({
          id: mediaAssets.id,
          fileName: mediaAssets.title,
          fileUrl: mediaAssets.cloudUrl,
        })
        .from(mediaAssets)
        .where(eq(mediaAssets.id, content.imageMediaId))
        .limit(1);
      imageMedia = image || null;
    }

    if (content.videoMediaId) {
      const [video] = await db
        .select({
          id: mediaAssets.id,
          fileName: mediaAssets.title,
          fileUrl: mediaAssets.cloudUrl,
        })
        .from(mediaAssets)
        .where(eq(mediaAssets.id, content.videoMediaId))
        .limit(1);
      videoMedia = video || null;
    }

    return NextResponse.json({
      content: {
        ...content,
        imageMedia,
        videoMedia,
      },
    });
  } catch (error) {
    console.error('Error fetching intro video:', error);
    return NextResponse.json({ error: 'Failed to fetch intro video' }, { status: 500 });
  }
}
