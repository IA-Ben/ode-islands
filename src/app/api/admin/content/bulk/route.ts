import { NextResponse, NextRequest } from 'next/server';
import { getServerUser } from '../../../../../../server/auth';
import { db } from '../../../../../../server/db';
import { chapters, storyCards, cards } from '../../../../../../shared/schema';
import { inArray } from 'drizzle-orm';
import { AuditLogger } from '../../../../../../server/auditLogger';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getServerUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityType, entityIds, action } = await request.json();

    if (!entityType || !entityIds || !Array.isArray(entityIds) || entityIds.length === 0 || !action) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    if (entityIds.length > 100) {
      return NextResponse.json(
        { error: 'Cannot process more than 100 items at once' },
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

    let updateData: any = {};
    let auditAction: 'update' | 'delete' | 'publish' | 'unpublish' | 'archive' = 'update';
    let description = '';

    switch (action) {
      case 'publish':
        updateData = {
          publishStatus: 'published',
          publishedAt: new Date(),
          publishedBy: user.id,
          updatedAt: new Date(),
        };
        auditAction = 'publish';
        description = `Bulk published ${entityIds.length} ${entityType}(s)`;
        break;

      case 'unpublish':
      case 'draft':
        updateData = {
          publishStatus: 'draft',
          updatedAt: new Date(),
        };
        auditAction = 'unpublish';
        description = `Bulk unpublished ${entityIds.length} ${entityType}(s)`;
        break;

      case 'archive':
        updateData = {
          publishStatus: 'archived',
          updatedAt: new Date(),
        };
        auditAction = 'archive';
        description = `Bulk archived ${entityIds.length} ${entityType}(s)`;
        break;

      case 'delete':
        // Delete operation
        await db
          .delete(table)
          .where(inArray(table.id, entityIds));

        // Log each deletion
        for (const id of entityIds) {
          await AuditLogger.log({
            userId: user.id,
            userEmail: user.email,
            entityType: entityType,
            entityId: id,
            action: 'delete',
            category: 'content',
            severity: 'warning',
            description: `Bulk deleted ${entityType}`,
            metadata: { bulkOperation: true, totalCount: entityIds.length },
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
          });
        }

        return NextResponse.json({
          success: true,
          action: 'delete',
          count: entityIds.length,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Perform update
    await db
      .update(table)
      .set(updateData)
      .where(inArray(table.id, entityIds));

    // Log the bulk action
    await AuditLogger.log({
      userId: user.id,
      userEmail: user.email,
      entityType: 'bulk_operation',
      entityId: `bulk_${Date.now()}`,
      action: auditAction,
      changes: { entityIds, updateData },
      metadata: {
        bulkOperation: true,
        targetEntityType: entityType,
        totalCount: entityIds.length,
      },
      category: 'content',
      description: description,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      action,
      count: entityIds.length,
    });
  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}
