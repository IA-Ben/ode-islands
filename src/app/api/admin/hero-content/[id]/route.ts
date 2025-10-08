import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { heroContents } from '@/shared/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
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

    const [updatedContent] = await db
      .update(heroContents)
      .set({
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
        updatedAt: new Date(),
      })
      .where(eq(heroContents.id, id))
      .returning();

    if (!updatedContent) {
      return NextResponse.json({ error: 'Hero content not found' }, { status: 404 });
    }

    return NextResponse.json(updatedContent);
  } catch (error) {
    console.error('Error updating hero content:', error);
    return NextResponse.json({ error: 'Failed to update hero content' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const [deletedContent] = await db
      .delete(heroContents)
      .where(eq(heroContents.id, id))
      .returning();

    if (!deletedContent) {
      return NextResponse.json({ error: 'Hero content not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting hero content:', error);
    return NextResponse.json({ error: 'Failed to delete hero content' }, { status: 500 });
  }
}
