import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../../../server/auth';
import { storage } from '../../../../../../../server/storage';

export const GET = withAuth(async (request: NextRequest, session: any, { params }: { params: { id: string } }) => {
  try {
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const usage = await storage.getMediaUsage(params.id);

    const chapters: Array<{ id: string; title: string }> = [];
    const cards: Array<{ id: string; chapterId: string; title: string }> = [];

    usage.forEach(u => {
      if (u.entityType === 'chapter') {
        chapters.push({
          id: u.entityId,
          title: `Chapter ${u.entityId}`,
        });
      } else if (u.entityType === 'card') {
        cards.push({
          id: u.entityId,
          chapterId: u.entityId.split('-')[0] || u.entityId,
          title: `Card ${u.entityId}`,
        });
      }
    });

    return NextResponse.json({
      chapters,
      cards,
      totalUsages: usage.length,
    });
  } catch (error: any) {
    console.error('Failed to get media usage:', error);
    return NextResponse.json(
      { error: 'Failed to get media usage', details: error.message },
      { status: 500 }
    );
  }
});
