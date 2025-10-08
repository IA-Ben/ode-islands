import { db } from './db';
import { auditLogs } from '../shared/schema';
import { desc, eq } from 'drizzle-orm';

interface AuditLogEntry {
  userId: string;
  userEmail?: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'archive' | 'restore';
  changes?: { before?: any; after?: any };
  metadata?: Record<string, any>;
  category?: string;
  severity?: 'info' | 'warning' | 'critical';
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: entry.userId,
        userEmail: entry.userEmail,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        changes: entry.changes,
        metadata: entry.metadata,
        category: entry.category || this.getCategoryFromEntityType(entry.entityType),
        severity: entry.severity || 'info',
        description: entry.description,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      });

      if (entry.severity === 'critical') {
        console.log(`[AUDIT] ${entry.severity.toUpperCase()}: ${entry.description}`);
      }
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Get audit trail for a specific entity
   */
  static async getEntityAuditTrail(entityType: string, entityId: string, limit = 50) {
    try {
      return await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityType, entityType))
        .where(eq(auditLogs.entityId, entityId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Failed to fetch audit trail:', error);
      return [];
    }
  }

  /**
   * Get recent activity across all entities
   */
  static async getRecentActivity(limit = 100) {
    try {
      return await db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      return [];
    }
  }

  /**
   * Get user activity
   */
  static async getUserActivity(userId: string, limit = 50) {
    try {
      return await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Failed to fetch user activity:', error);
      return [];
    }
  }
  
  static async logCreate(userId: string, entityType: string, entityId: string, data: any, req?: any) {
    await this.log({
      userId,
      entityType,
      entityId,
      action: 'create',
      changes: { after: data },
      category: this.getCategoryFromEntityType(entityType),
      description: `Created ${entityType} ${entityId}`,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }
  
  static async logUpdate(userId: string, entityType: string, entityId: string, before: any, after: any, req?: any) {
    await this.log({
      userId,
      entityType,
      entityId,
      action: 'update',
      changes: { before, after },
      category: this.getCategoryFromEntityType(entityType),
      description: `Updated ${entityType} ${entityId}`,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }
  
  static async logDelete(userId: string, entityType: string, entityId: string, data: any, req?: any) {
    await this.log({
      userId,
      entityType,
      entityId,
      action: 'delete',
      changes: { before: data },
      category: this.getCategoryFromEntityType(entityType),
      severity: 'warning',
      description: `Deleted ${entityType} ${entityId}`,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }
  
  private static getCategoryFromEntityType(entityType: string): string {
    const map: Record<string, string> = {
      'chapter': 'content',
      'storyCard': 'content',
      'mediaAsset': 'media',
      'user': 'user_management',
      'role': 'user_management',
    };
    return map[entityType] || 'other';
  }
}
