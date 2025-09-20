import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromHeaders } from '../../../../../server/auth';
import { storage } from '../../../../../server/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chapter = await storage.getChapter(params.id);
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }
    
    // Get sub-chapters and story cards for this chapter
    const [subChapters, storyCards] = await Promise.all([
      storage.getSubChapters(chapter.id),
      storage.getStoryCards(chapter.id),
    ]);
    
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
    
    return NextResponse.json({
      ...chapter,
      subChapters,
      storyCards: storyCardsWithButtons,
    });
  } catch (error) {
    console.error('Error fetching chapter:', error);
    return NextResponse.json({ error: 'Failed to fetch chapter' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromHeaders(request);
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    const updated = await storage.updateChapter(params.id, data);
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating chapter:', error);
    return NextResponse.json({ error: 'Failed to update chapter' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromHeaders(request);
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await storage.deleteChapter(params.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return NextResponse.json({ error: 'Failed to delete chapter' }, { status: 500 });
  }
}