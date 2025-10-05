import { storage } from './storage';

interface AuditLogEntry {
  userId: string;
  userEmail?: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish';
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
      await storage.createAuditLog(entry);
      
      if (entry.severity === 'critical') {
        console.log(`[AUDIT] ${entry.severity.toUpperCase()}: ${entry.description}`);
      }
    } catch (error) {
      console.error('Failed to write audit log:', error);
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
