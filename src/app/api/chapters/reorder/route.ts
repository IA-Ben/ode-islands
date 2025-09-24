import { NextRequest, NextResponse } from 'next/server';
import { storage } from '../../../../../server/storage';
import { withAdminAuthAndCSRF } from '../../../../../server/auth';

interface ReorderRequest {
  chapterOrders: Array<{
    id: string;
    order: number;
  }>;
}

async function handlePOST(request: NextRequest, context: { params?: any }) {
  try {
    const body: ReorderRequest = await request.json();
    const { chapterOrders } = body;

    if (!Array.isArray(chapterOrders) || chapterOrders.length === 0) {
      return NextResponse.json(
        { error: 'Chapter orders array is required' },
        { status: 400 }
      );
    }

    // Validate each chapter order entry
    for (const item of chapterOrders) {
      if (!item.id || typeof item.order !== 'number') {
        return NextResponse.json(
          { error: 'Each chapter order entry must have id and order fields' },
          { status: 400 }
        );
      }
    }

    // Update each chapter's order in the database
    const updatePromises = chapterOrders.map(({ id, order }) => 
      storage.updateChapter(id, { order })
    );

    await Promise.all(updatePromises);

    // Get updated chapters list to return
    const updatedChapters = await storage.getChapters();

    return NextResponse.json({
      message: 'Chapters reordered successfully',
      chapters: updatedChapters
    });

  } catch (error) {
    console.error('Error reordering chapters:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reorder chapters' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuthAndCSRF(handlePOST);