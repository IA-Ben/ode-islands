import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromHeaders } from '../../../../../../server/auth';
import { storage } from '../../../../../../server/storage';
import { AuditLogger } from '../../../../../../server/auditLogger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionFromHeaders(request);

    if (!session.isAuthenticated || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (!['publish', 'unpublish', 'archive'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get current card state
    const before = await storage.getStoryCard(id);
    if (!before) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Determine new publish status
    let newStatus: string;
    let publishedAt: Date | null = null;
    let publishedBy: string | null = null;

    switch (action) {
      case 'publish':
        newStatus = 'published';
        publishedAt = new Date();
        publishedBy = session.user.id;
        break;
      case 'unpublish':
        newStatus = 'draft';
        break;
      case 'archive':
        newStatus = 'archived';
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update card
    const updated = await storage.updateStoryCard(id, {
      publishStatus: newStatus,
      publishedAt,
      publishedBy,
    });

    // Log the action
    await AuditLogger.logUpdate(
      session.user.id,
      'story_card',
      id,
      before,
      updated,
      request
    );

    return NextResponse.json({
      success: true,
      card: updated,
      message: `Card ${action}ed successfully`,
    });
  } catch (error) {
    console.error('Error updating publish status:', error);
    return NextResponse.json(
      { error: 'Failed to update publish status' },
      { status: 500 }
    );
  }
}
