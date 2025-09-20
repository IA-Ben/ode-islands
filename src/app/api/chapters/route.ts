import { NextRequest, NextResponse } from 'next/server';
import { storage } from '../../../../server/storage';
import { withAuth } from '../../../../server/auth';

export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get('eventId');
    const chapters = await storage.getChapters(eventId || undefined);
    
    // Get AR items count and sub-chapters count for each chapter
    const chaptersWithCounts = await Promise.all(
      chapters.map(async (chapter) => {
        const subChapters = await storage.getSubChapters(chapter.id);
        const storyCards = await storage.getStoryCards(chapter.id);
        const hasAR = storyCards.some(card => card.hasAR);
        
        return {
          ...chapter,
          subChapterCount: subChapters.length,
          hasAR: hasAR || chapter.hasAR,
        };
      })
    );
    
    return NextResponse.json(chaptersWithCounts);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const session = (request as any).session;
    const data = await request.json();
    const chapter = await storage.createChapter({
      title: data.title,
      summary: data.summary,
      eventId: data.eventId,
      order: data.order || 0,
      hasAR: data.hasAR || false,
    });
    
    return NextResponse.json(chapter);
  } catch (error) {
    console.error('Error creating chapter:', error);
    return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 });
  }
}

export const POST = withAuth(handlePOST);