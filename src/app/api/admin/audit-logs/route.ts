import { NextResponse, NextRequest } from 'next/server';
import { getServerUser } from '../../../../../server/auth';
import { AuditLogger } from '../../../../../server/auditLogger';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getServerUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    let logs;

    if (entityType && entityId) {
      // Get audit trail for specific entity
      logs = await AuditLogger.getEntityAuditTrail(entityType, entityId, limit);
    } else if (userId) {
      // Get activity for specific user
      logs = await AuditLogger.getUserActivity(userId, limit);
    } else {
      // Get recent activity across all entities
      logs = await AuditLogger.getRecentActivity(limit);
    }

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Audit logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
