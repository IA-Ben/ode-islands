import { NextRequest, NextResponse } from 'next/server';
import { storage } from '../../../../../server/storage';

export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get('eventId');
    const chapters = await storage.getChapters(eventId || undefined);
    
    // Get all AR items grouped by chapter
    const arItems = await Promise.all(
      chapters.map(async (chapter) => {
        const storyCards = await storage.getStoryCards(chapter.id);
        const arCards = storyCards.filter(card => card.hasAR);
        
        if (arCards.length === 0 && !chapter.hasAR) {
          return null;
        }
        
        return {
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          arItems: arCards.map(card => ({
            id: card.id,
            type: 'story_card',
            content: card.content,
            order: card.order,
          })),
        };
      })
    );
    
    // Filter out chapters without AR items
    const filteredARItems = arItems.filter(item => item !== null);
    
    return NextResponse.json(filteredARItems);
  } catch (error) {
    console.error('Error fetching AR items:', error);
    return NextResponse.json({ error: 'Failed to fetch AR items' }, { status: 500 });
  }
}