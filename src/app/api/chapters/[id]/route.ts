import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromHeaders } from '../../../../../server/auth';
import { storage } from '../../../../../server/storage';
import { AuditLogger } from '../../../../../server/auditLogger';
import odeIslandsData from '../../../data/ode-islands.json';

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

    // Map database chapters to JSON chapter keys
    const chapterMapping: Record<number, string> = {
      1: 'chapter-1',
      2: 'chapter-2',
      3: 'chapter-3'
    };

    // If no story cards in DB, fall back to JSON file
    let finalStoryCards = storyCards;
    if (storyCards.length === 0 && chapter.order) {
      const jsonChapterKey = chapterMapping[chapter.order];
      if (jsonChapterKey && odeIslandsData[jsonChapterKey as keyof typeof odeIslandsData]) {
        const jsonCards = odeIslandsData[jsonChapterKey as keyof typeof odeIslandsData] as any[];
        // Transform JSON cards to match story card format
        finalStoryCards = jsonCards.map((card, index) => ({
          id: `${chapter.id}-card-${index}`,
          chapterId: chapter.id,
          order: index,
          content: card,
          hasAR: card.ar ? true : false,
          customButtons: [],
        }));
      }
    } else {
      // Get custom buttons for database story cards
      finalStoryCards = await Promise.all(
        storyCards.map(async (card) => {
          const buttons = await storage.getCustomButtons('story_card', card.id);
          return {
            ...card,
            customButtons: buttons,
          };
        })
      );
    }

    return NextResponse.json({
      ...chapter,
      subChapters,
      storyCards: finalStoryCards,
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

    // Get current state before update
    const before = await storage.getChapter(id);

    const data = await request.json();
    const updated = await storage.updateChapter(id, data);

    // Log the update
    await AuditLogger.logUpdate(
      session.user?.id || 'unknown',
      'chapter',
      id,
      before,
      updated,
      request
    );

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

    // Get chapter data before deletion for audit log
    const chapter = await storage.getChapter(id);

    await storage.deleteChapter(id);

    // Log the deletion
    await AuditLogger.logDelete(
      session.user?.id || 'unknown',
      'chapter',
      id,
      chapter,
      request
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete chapter';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}