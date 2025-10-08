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

    const { entityType, entityId, scheduledPublishAt } = await request.json();

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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

    // Validate date if provided
    let scheduleDate = null;
    if (scheduledPublishAt) {
      scheduleDate = new Date(scheduledPublishAt);
      if (isNaN(scheduleDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      }
      if (scheduleDate < new Date()) {
        return NextResponse.json(
          { error: 'Scheduled date must be in the future' },
          { status: 400 }
        );
      }
    }

    // Update scheduled publish date
    await db
      .update(table)
      .set({
        scheduledPublishAt: scheduleDate,
        updatedAt: new Date(),
      })
      .where(eq(table.id, entityId));

    // Log the scheduling action
    await AuditLogger.log({
      userId: user.id,
      userEmail: user.email,
      entityType: entityType,
      entityId: entityId,
      action: 'update',
      changes: {
        scheduledPublishAt: {
          before: null,
          after: scheduleDate,
        },
      },
      category: 'content',
      description: scheduleDate
        ? `Scheduled for publication at ${scheduleDate.toISOString()}`
        : 'Removed publication schedule',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, scheduledPublishAt: scheduleDate });
  } catch (error) {
    console.error('Schedule update error:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}
