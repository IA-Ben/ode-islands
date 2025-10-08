import { NextResponse, NextRequest } from 'next/server';
import { getServerUser } from '../../../../../../server/auth';
import { db } from '../../../../../../server/db';
import { chapters, storyCards, cards } from '../../../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { AuditLogger } from '../../../../../../server/auditLogger';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getServerUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityType, entityId, status } = await request.json();

    if (!entityType || !entityId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const validStatuses = ['draft', 'in_review', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    let table;
    switch (entityType) {
      case 'chapter':
        table = chapters;
        break;
      case 'story_card':
        table = storyCards;
        break;
      case 'card':
        table = cards;
        break;
      default:
        return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    // Get current data for audit log
    const [current] = await db
      .select()
      .from(table)
      .where(eq(table.id, entityId))
      .limit(1);

    // Update status
    const updateData: any = {
      publishStatus: status,
      updatedAt: new Date(),
    };

    // If publishing, set publishedAt and publishedBy
    if (status === 'published' && current.publishStatus !== 'published') {
      updateData.publishedAt = new Date();
      updateData.publishedBy = user.id;
    }

    await db
      .update(table)
      .set(updateData)
      .where(eq(table.id, entityId));

    // Log the status change
    await AuditLogger.log({
      userId: user.id,
      userEmail: user.email,
      entityType: entityType,
      entityId: entityId,
      action: status === 'published' ? 'publish' : 'update',
      changes: {
        before: { publishStatus: current.publishStatus },
        after: { publishStatus: status },
      },
      category: 'content',
      severity: status === 'published' ? 'info' : 'info',
      description: `Changed status from ${current.publishStatus} to ${status}`,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}
