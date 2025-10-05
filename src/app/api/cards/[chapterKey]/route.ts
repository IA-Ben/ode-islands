import { NextRequest, NextResponse } from 'next/server';
import { storage } from '../../../../../server/storage';
import type { CardData } from '@/@typings';

// GET /api/cards/[chapterKey] - Get all cards for a chapter
export async function GET(
  request: NextRequest,
  { params }: { params: { chapterKey: string } }
) {
  try {
    const { chapterKey } = params;
    
    // Get cards from database
    const cards = await storage.getChapterCards(chapterKey);
    
    if (cards.length === 0) {
      return NextResponse.json(
        { error: `Chapter ${chapterKey} not found` },
        { status: 404 }
      );
    }

    // Extract content from each card
    const cardContents = cards.map(card => card.content);

    return NextResponse.json(cardContents);
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cards' },
      { status: 500 }
    );
  }
}

// POST /api/cards/[chapterKey] - Add a new card to chapter
export async function POST(
  request: NextRequest,
  { params }: { params: { chapterKey: string } }
) {
  try {
    const { chapterKey } = params;
    const cardData = await request.json();
    
    // Get chapter by key
    const chapter = await storage.getChapterByKey(chapterKey);
    if (!chapter) {
      return NextResponse.json(
        { error: `Chapter ${chapterKey} not found` },
        { status: 404 }
      );
    }

    // Get current cards to determine order
    const existingCards = await storage.getStoryCards(chapter.id);
    const nextOrder = existingCards.length;

    // Create new card in database
    const newCard = await storage.createStoryCard({
      chapterId: chapter.id,
      order: nextOrder,
      content: cardData,
      hasAR: !!(cardData.ar || cardData.playcanvas)
    });
    
    return NextResponse.json(
      { message: 'Card added successfully', card: newCard.content },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding card:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add card' },
      { status: 500 }
    );
  }
}

// PUT /api/cards/[chapterKey] - Update an existing card
export async function PUT(
  request: NextRequest,
  { params }: { params: { chapterKey: string } }
) {
  try {
    const { chapterKey } = params;
    const body = await request.json();
    const { cardId, ...cardData } = body;
    
    if (!cardId) {
      return NextResponse.json(
        { error: 'Card ID is required for updates' },
        { status: 400 }
      );
    }

    // Update card in database
    const updatedCard = await storage.updateStoryCard(cardId, {
      content: cardData,
      hasAR: !!(cardData.ar || cardData.playcanvas)
    });
    
    return NextResponse.json({
      message: 'Card updated successfully',
      card: updatedCard.content
    });
  } catch (error) {
    console.error('Error updating card:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update card' },
      { status: 500 }
    );
  }
}

// DELETE /api/cards/[chapterKey] - Delete a card
export async function DELETE(
  request: NextRequest,
  { params }: { params: { chapterKey: string } }
) {
  try {
    const { chapterKey } = params;
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');
    
    if (!cardId) {
      return NextResponse.json(
        { error: 'Card ID is required for deletion' },
        { status: 400 }
      );
    }

    // Delete card from database
    await storage.deleteStoryCard(cardId);
    
    return NextResponse.json(
      { message: 'Card deleted successfully' }
    );
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete card' },
      { status: 500 }
    );
  }
}