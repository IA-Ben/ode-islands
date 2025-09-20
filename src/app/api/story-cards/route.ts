import { NextRequest, NextResponse } from 'next/server';
import { storage } from '../../../../server/storage';
import { withAuth } from '../../../../server/auth';

export async function GET(request: NextRequest) {
  try {
    const chapterId = request.nextUrl.searchParams.get('chapterId');
    if (!chapterId) {
      return NextResponse.json({ error: 'Chapter ID required' }, { status: 400 });
    }
    
    const storyCards = await storage.getStoryCards(chapterId);
    
    // Get custom buttons for each story card
    const storyCardsWithButtons = await Promise.all(
      storyCards.map(async (card) => {
        const buttons = await storage.getCustomButtons('story_card', card.id);
        return {
          ...card,
          customButtons: buttons,
        };
      })
    );
    
    return NextResponse.json(storyCardsWithButtons);
  } catch (error) {
    console.error('Error fetching story cards:', error);
    return NextResponse.json({ error: 'Failed to fetch story cards' }, { status: 500 });
  }
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const data = await request.json();
    const storyCard = await storage.createStoryCard({
      chapterId: data.chapterId,
      order: data.order || 0,
      content: data.content,
      hasAR: data.hasAR || false,
    });
    
    return NextResponse.json(storyCard);
  } catch (error) {
    console.error('Error creating story card:', error);
    return NextResponse.json({ error: 'Failed to create story card' }, { status: 500 });
  }
});