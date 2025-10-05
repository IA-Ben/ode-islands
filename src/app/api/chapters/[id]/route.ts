import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromHeaders } from '../../../../../server/auth';
import { storage } from '../../../../../server/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chapter = await storage.getChapter(id);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionFromHeaders(request);
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    const updated = await storage.updateChapter(id, data);
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating chapter:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update chapter';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionFromHeaders(request);
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const children = await storage.getChapterChildren(id);
    if (children.length > 0) {
      return NextResponse.json({ 
        error: `Cannot delete chapter with ${children.length} child chapter(s). Please delete or move the children first.` 
      }, { status: 400 });
    }
    
    await storage.deleteChapter(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete chapter';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}