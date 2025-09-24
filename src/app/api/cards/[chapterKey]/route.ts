import { NextRequest, NextResponse } from 'next/server';
import { 
  readOdeIslandsData, 
  addCardToChapter, 
  writeOdeIslandsData,
  validateCardData,
  generateCardId
} from '@/lib/utils/jsonFileUtils';
import type { CardData } from '@/@typings';

// GET /api/cards/[chapterKey] - Get all cards for a chapter
export async function GET(
  request: NextRequest,
  { params }: { params: { chapterKey: string } }
) {
  try {
    const { chapterKey } = params;
    const data = await readOdeIslandsData();
    
    if (!data[chapterKey]) {
      return NextResponse.json(
        { error: `Chapter ${chapterKey} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(data[chapterKey]);
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
    const body = await request.json();
    
    // Validate card data
    if (!validateCardData(body)) {
      return NextResponse.json(
        { error: 'Invalid card data provided' },
        { status: 400 }
      );
    }

    // Generate unique ID for the new card
    const newCard: CardData = {
      ...body,
      id: generateCardId(chapterKey)
    };

    await addCardToChapter(chapterKey, newCard);
    
    return NextResponse.json(
      { message: 'Card added successfully', card: newCard },
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

    const data = await readOdeIslandsData();
    
    if (!data[chapterKey]) {
      return NextResponse.json(
        { error: `Chapter ${chapterKey} not found` },
        { status: 404 }
      );
    }

    const cardIndex = data[chapterKey].findIndex(card => card.id === cardId);
    
    if (cardIndex === -1) {
      return NextResponse.json(
        { error: `Card ${cardId} not found in chapter ${chapterKey}` },
        { status: 404 }
      );
    }

    // Update the card while preserving the ID
    const updatedCard = { ...cardData, id: cardId };
    
    if (!validateCardData(updatedCard)) {
      return NextResponse.json(
        { error: 'Invalid card data provided' },
        { status: 400 }
      );
    }

    data[chapterKey][cardIndex] = updatedCard;
    await writeOdeIslandsData(data);
    
    return NextResponse.json(
      { message: 'Card updated successfully', card: updatedCard }
    );
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

    const data = await readOdeIslandsData();
    
    if (!data[chapterKey]) {
      return NextResponse.json(
        { error: `Chapter ${chapterKey} not found` },
        { status: 404 }
      );
    }

    const cardIndex = data[chapterKey].findIndex(card => card.id === cardId);
    
    if (cardIndex === -1) {
      return NextResponse.json(
        { error: `Card ${cardId} not found in chapter ${chapterKey}` },
        { status: 404 }
      );
    }

    // Remove the card
    data[chapterKey].splice(cardIndex, 1);
    await writeOdeIslandsData(data);
    
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