import { NextRequest, NextResponse } from 'next/server';
import { storage } from '../../../../server/storage';
import { withAuth } from '../../../../server/auth';
import odeIslandsData from '../../data/ode-islands.json';

export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get('eventId');
    const chapters = await storage.getChapters(eventId || undefined);
    
    // Map database chapters to JSON chapter keys
    const chapterMapping: Record<number, string> = {
      1: 'chapter-1',
      2: 'chapter-2', 
      3: 'chapter-3'
    };
    
    // Get AR items count and sub-chapters count for each chapter
    const chaptersWithCounts = await Promise.all(
      chapters.map(async (chapter) => {
        const subChapters = await storage.getSubChapters(chapter.id);
        const storyCards = await storage.getStoryCards(chapter.id);
        
        // Also check JSON file for card count based on chapter order
        const jsonChapterKey = chapter.order ? chapterMapping[chapter.order] : null;
        const jsonCards = jsonChapterKey && odeIslandsData[jsonChapterKey as keyof typeof odeIslandsData] ? 
          (odeIslandsData[jsonChapterKey as keyof typeof odeIslandsData] as any[]).length : 0;
        
        // Always prefer JSON card count since that's where the actual content lives
        const totalCards = jsonCards > 0 ? jsonCards : storyCards.length;
        const hasAR = storyCards.some(card => card.hasAR);
        
        return {
          ...chapter,
          subChapterCount: subChapters.length,
          cardCount: totalCards, // Add explicit card count
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

export const POST = withAuth(async (request: NextRequest) => {
  try {
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
});