import { NextRequest, NextResponse } from 'next/server';
import { storage } from '../../../../../server/storage';
import { withAuth } from '../../../../../server/auth';

export const PUT = withAuth(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const data = await request.json();
    
    const updatedCard = await storage.updateStoryCard(params.id, {
      order: data.order,
      content: data.content,
      hasAR: data.hasAR,
    });
    
    return NextResponse.json(updatedCard);
  } catch (error) {
    console.error('Error updating story card:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update story card';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});

export const DELETE = withAuth(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    await storage.deleteStoryCard(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting story card:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete story card';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
