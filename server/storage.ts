import {
  users,
  mediaAssets,
  mediaUsage,
  contentBackups,
  chapters,
  subChapters,
  storyCards,
  customButtons,
  userProgress,
  liveEvents,
  type User,
  type UpsertUser,
  type MediaAsset,
  type UpsertMediaAsset,
  type MediaUsage,
  type UpsertMediaUsage,
} from "../shared/schema";
import { db } from "./db";
import { eq, sql, and, desc, asc, or, gte, lte, inArray } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  migrateUserToOIDC(oldUserId: string, newUserData: UpsertUser): Promise<User>;
  
  // Admin user management operations
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // CMS-specific operations
  createContentBackup(filename: string, content: string, userId: string): Promise<ContentBackup>;
  getContentBackups(limit?: number): Promise<ContentBackup[]>;
  createMediaAsset(asset: Omit<typeof mediaAssets.$inferInsert, 'id' | 'createdAt'>): Promise<MediaAsset>;
  getMediaAssets(): Promise<MediaAsset[]>;
  deleteMediaAsset(id: string): Promise<void>;
  
  // Chapter operations
  createChapter(chapter: Omit<typeof chapters.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chapter>;
  getChapters(eventId?: string): Promise<Chapter[]>;
  getChapter(id: string): Promise<Chapter | undefined>;
  getChapterByKey(chapterKey: string): Promise<Chapter | undefined>;
  getChapterCards(chapterKey: string): Promise<StoryCard[]>;
  updateChapter(id: string, updates: Partial<Chapter>): Promise<Chapter>;
  deleteChapter(id: string): Promise<void>;
  reorderChapters(chapterOrders: Array<{ id: string; order: number }>): Promise<void>;
  reorderHierarchy(updates: Array<{ id: string; parentId: string | null; order: number }>): Promise<void>;
  
  // Hierarchy operations
  getChapterTree(eventId?: string): Promise<any[]>;
  getChapterChildren(chapterId: string): Promise<Chapter[]>;
  validateHierarchy(chapterId: string | null, parentId: string | null): Promise<{ valid: boolean; error?: string }>;
  
  // Sub-chapter operations
  createSubChapter(subChapter: Omit<typeof subChapters.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubChapter>;
  getSubChapters(chapterId: string): Promise<SubChapter[]>;
  getSubChapter(id: string): Promise<SubChapter | undefined>;
  updateSubChapter(id: string, updates: Partial<SubChapter>): Promise<SubChapter>;
  deleteSubChapter(id: string): Promise<void>;
  
  // Story card operations
  createStoryCard(card: Omit<typeof storyCards.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoryCard>;
  getStoryCards(chapterId: string): Promise<StoryCard[]>;
  getStoryCard(id: string): Promise<StoryCard | undefined>;
  updateStoryCard(id: string, updates: Partial<StoryCard>): Promise<StoryCard>;
  deleteStoryCard(id: string): Promise<void>;
  
  // Custom button operations
  createCustomButton(button: Omit<typeof customButtons.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomButton>;
  getCustomButtons(parentType: string, parentId: string): Promise<CustomButton[]>;
  getCustomButton(id: string): Promise<CustomButton | undefined>;
  updateCustomButton(id: string, updates: Partial<CustomButton>): Promise<CustomButton>;
  deleteCustomButton(id: string): Promise<void>;
  
  // User progress operations
  trackProgress(userId: string, chapterId: string, cardIndex: number): Promise<void>;
  getUserChapterProgress(userId: string, chapterId: string): Promise<UserProgress[]>;
  getSubChapterProgress(userId: string, subChapterId: string): Promise<number>;
  
  // Search operations
  searchContent(params: SearchParams): Promise<SearchResults>;
  updateSearchVector(contentType: 'chapter' | 'card', id: string, text: string): Promise<void>;
  searchSuggestions(prefix: string, limit?: number): Promise<string[]>;
  
  // Media Library operations
  uploadMedia(data: Omit<UpsertMediaAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<MediaAsset>;
  listMedia(filters: MediaFilters, pagination: MediaPagination): Promise<MediaListResult>;
  searchMedia(query: string, filters?: Partial<MediaFilters>): Promise<MediaListResult>;
  getMedia(id: string): Promise<MediaAssetWithUsage | undefined>;
  updateMediaMetadata(id: string, updates: MediaMetadataUpdate): Promise<MediaAsset>;
  deleteMedia(id: string, force?: boolean): Promise<{ success: boolean; inUse?: boolean; usage?: MediaUsage[] }>;
  bulkDeleteMedia(ids: string[], force?: boolean): Promise<BulkDeleteResult>;
  trackMediaUsage(mediaId: string, entityType: string, entityId: string, fieldName: string): Promise<void>;
  getMediaUsage(mediaId: string): Promise<MediaUsage[]>;
  removeMediaUsage(mediaId: string, entityType: string, entityId: string, fieldName: string): Promise<void>;
}

// Search interfaces
export interface SearchParams {
  query?: string;
  eventId?: string;
  hasAR?: boolean;
  minDepth?: number;
  maxDepth?: number;
  createdFrom?: Date;
  createdTo?: Date;
  updatedFrom?: Date;
  updatedTo?: Date;
  parentId?: string;
  contentTypes?: ('chapter' | 'card')[];
  page?: number;
  pageSize?: number;
  sort?: 'relevance' | 'date' | 'title';
}

export interface SearchResult {
  id: string;
  type: 'chapter' | 'card';
  title: string;
  summary?: string;
  content?: any;
  highlight?: string;
  eventId?: string;
  hasAR: boolean;
  depth?: number;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  rank?: number;
}

export interface SearchResults {
  results: SearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  facets: {
    events: Array<{ id: string; title: string; count: number }>;
    contentTypes: Array<{ type: string; count: number }>;
    hasAR: { withAR: number; withoutAR: number };
  };
}

// Media Library interfaces
export interface MediaFilters {
  type?: string;
  tags?: string[];
  uploadedBy?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

export interface MediaPagination {
  page: number;
  pageSize: number;
}

export interface MediaListResult {
  items: MediaAsset[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface MediaAssetWithUsage extends MediaAsset {
  usageCount: number;
  usage?: MediaUsage[];
}

export interface MediaMetadataUpdate {
  title?: string;
  altText?: string;
  description?: string;
  tags?: string[];
}

export interface BulkDeleteResult {
  deleted: string[];
  failed: Array<{ id: string; reason: string }>;
}

export class DatabaseStorage implements IStorage {
  // Admin seeding functionality
  async seedAdminUsers(): Promise<void> {
    const adminEmails = process.env.ADMIN_EMAILS;
    if (!adminEmails) {
      console.log('No ADMIN_EMAILS configured, skipping admin seeding');
      return;
    }

    const emails = adminEmails.split(',').map(email => email.trim()).filter(email => email);
    
    for (const email of emails) {
      try {
        const existingUser = await this.getUserByEmail(email);
        
        if (existingUser) {
          // Update existing user to admin if not already
          if (!existingUser.isAdmin) {
            await db.update(users)
              .set({ isAdmin: true, updatedAt: new Date() })
              .where(eq(users.email, email));
            console.log(`✓ Promoted existing user ${email} to admin`);
          } else {
            console.log(`✓ User ${email} is already an admin`);
          }
        } else {
          // Create placeholder admin user - will be populated when they first log in via OAuth
          await db.insert(users)
            .values({
              email: email,
              firstName: 'Admin',
              lastName: 'User',
              isAdmin: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          console.log(`✓ Created admin placeholder for ${email} - will be populated on first OAuth login`);
        }
      } catch (error) {
        console.error(`✗ Failed to seed admin user ${email}:`, error);
      }
    }
  }
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async migrateUserToOIDC(oldUserId: string, newUserData: UpsertUser): Promise<User> {
    // Use database transaction for atomic operation with safe FK handling
    const result = await db.transaction(async (tx) => {
      // Step 1: Temporarily free the email on old user to avoid unique constraint conflicts
      const tempEmail = `legacy_${oldUserId}_${Date.now()}@theodeislands.com`;
      await tx.update(users)
        .set({ email: tempEmail })
        .where(eq(users.id, oldUserId));
      
      // Step 2: Insert new user with OIDC ID and original email
      const [migratedUser] = await tx
        .insert(users)
        .values(newUserData)
        .returning();
      
      // Step 3: Update all foreign key references using safe parameterized queries
      const fkQueries = [
        // [table_name, column_name] pairs for all user references
        ['content_backups', 'created_by'],
        ['media_assets', 'uploaded_by'],
        ['user_progress', 'user_id'],
        ['polls', 'created_by'],
        ['poll_responses', 'user_id'],
        ['live_events', 'created_by'],
        ['qa_sessions', 'asked_by'],
        ['qa_sessions', 'answered_by'],
        ['live_chat_messages', 'user_id'],
        ['event_memories', 'created_by'],
        ['user_memory_wallet', 'user_id'],
        ['memory_wallet_collections', 'user_id'],
        ['certificates', 'user_id'],
        ['user_sessions', 'user_id'],
        ['content_interactions', 'user_id'],
        ['notifications', 'user_id'],
        ['content_schedules', 'created_by'],
        ['content_schedules', 'last_modified_by'],
        ['user_content_access', 'user_id'],
        ['emergency_overrides', 'requested_by'],
        ['emergency_overrides', 'approved_by'],
        ['user_notes', 'user_id'],
        ['forum_posts', 'user_id'],
        ['forum_replies', 'user_id'],
        ['feedback_surveys', 'created_by'],
        ['survey_responses', 'user_id'],
        ['fan_score_events', 'user_id'],
        ['user_achievements', 'user_id'],
        ['user_fan_scores', 'user_id']
      ];
      
      // Step 4: Update all FK references using safe parameterized queries
      for (const [tableName, columnName] of fkQueries) {
        try {
          await tx.execute(sql`
            UPDATE ${sql.identifier(tableName)}
            SET ${sql.identifier(columnName)} = ${newUserData.id}
            WHERE ${sql.identifier(columnName)} = ${oldUserId}
          `);
        } catch (error) {
          // Some tables/columns might not exist, log but continue
          console.warn(`Migration warning for ${tableName}.${columnName}:`, error);
        }
      }
      
      // Step 5: Delete the old user record after all FKs are updated
      await tx.delete(users).where(eq(users.id, oldUserId));
      
      return migratedUser;
    });
    
    console.log(`Successfully migrated user ${oldUserId} to OIDC ID ${newUserData.id}`);
    return result;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user already exists by email (for migration compatibility)
    if (userData.email) {
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser && existingUser.id !== userData.id) {
        // Email exists with different ID - trigger migration
        console.log(`Migrating existing user ${existingUser.id} to OIDC ID ${userData.id}`);
        return await this.migrateUserToOIDC(existingUser.id, {
          ...userData,
          // Preserve admin status from existing user
          isAdmin: existingUser.isAdmin || userData.isAdmin || false
        });
      } else if (existingUser && existingUser.id === userData.id) {
        // User exists with same ID, update but preserve admin status
        const [updatedUser] = await db
          .update(users)
          .set({
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
            // Don't overwrite admin status unless explicitly set
            ...(userData.isAdmin !== undefined && { isAdmin: userData.isAdmin })
          })
          .where(eq(users.id, userData.id))
          .returning();
        return updatedUser;
      }
    }

    // Check if this email is in ADMIN_EMAILS for auto-promotion
    const adminEmails = process.env.ADMIN_EMAILS;
    let shouldBeAdmin = userData.isAdmin || false;
    
    if (adminEmails && userData.email) {
      const adminEmailList = adminEmails.split(',').map(email => email.trim());
      if (adminEmailList.includes(userData.email)) {
        shouldBeAdmin = true;
        console.log(`Auto-promoting ${userData.email} to admin based on ADMIN_EMAILS`);
      }
    }

    // Normal upsert operation
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        isAdmin: shouldBeAdmin
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
          // Preserve existing admin status or apply ADMIN_EMAILS promotion
          isAdmin: shouldBeAdmin
        },
      })
      .returning();
    return user;
  }

  // Admin user management operations
  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(sql`${users.createdAt} DESC`);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    // Whitelist allowed fields for security
    const allowedFields = {
      firstName: updates.firstName,
      lastName: updates.lastName,
      profileImageUrl: updates.profileImageUrl,
      isAdmin: updates.isAdmin,
    };
    
    // Remove undefined fields
    const filteredUpdates = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );
    
    const [updatedUser] = await db
      .update(users)
      .set({
        ...filteredUpdates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    // Use the same FK update approach as migrateUserToOIDC but set to null
    // This handles FK constraints by nullifying references instead of failing
    await db.transaction(async (tx) => {
      const fkQueries = [
        // [table_name, column_name] pairs for all user references
        ['content_backups', 'created_by'],
        ['media_assets', 'uploaded_by'],
        ['user_progress', 'user_id'],
        ['polls', 'created_by'],
        ['poll_responses', 'user_id'],
        ['live_events', 'created_by'],
        ['qa_sessions', 'asked_by'],
        ['qa_sessions', 'answered_by'],
        ['live_chat_messages', 'user_id'],
        ['event_memories', 'created_by'],
        ['user_memory_wallet', 'user_id'],
        ['memory_wallet_collections', 'user_id'],
        ['certificates', 'user_id'],
        ['user_sessions', 'user_id'],
        ['content_interactions', 'user_id'],
        ['notifications', 'user_id'],
        ['content_schedules', 'created_by'],
        ['content_schedules', 'last_modified_by'],
        ['user_content_access', 'user_id'],
        ['emergency_overrides', 'requested_by'],
        ['emergency_overrides', 'approved_by'],
        ['user_notes', 'user_id'],
        ['forum_posts', 'user_id'],
        ['forum_replies', 'user_id'],
        ['feedback_surveys', 'created_by'],
        ['survey_responses', 'user_id'],
        ['fan_score_events', 'user_id'],
        ['user_achievements', 'user_id']
      ];
      
      // Set all FK references to null to maintain referential integrity
      for (const [tableName, columnName] of fkQueries) {
        try {
          await tx.execute(sql`
            UPDATE ${sql.identifier(tableName)}
            SET ${sql.identifier(columnName)} = NULL
            WHERE ${sql.identifier(columnName)} = ${id}
          `);
        } catch (error) {
          // Some tables/columns might not exist, log but continue
          console.warn(`Delete cleanup warning for ${tableName}.${columnName}:`, error);
        }
      }
      
      // Delete the user record after all FKs are cleaned up
      await tx.delete(users).where(eq(users.id, id));
    });
    
    console.log(`Successfully deleted user ${id} and cleaned up FK references`);
  }

  // CMS-specific operations
  async createContentBackup(filename: string, content: string, userId: string): Promise<ContentBackup> {
    const [backup] = await db
      .insert(contentBackups)
      .values({
        filename,
        content,
        createdBy: userId,
      })
      .returning();
    return backup;
  }

  async getContentBackups(limit: number = 10): Promise<ContentBackup[]> {
    return await db
      .select()
      .from(contentBackups)
      .orderBy(contentBackups.createdAt)
      .limit(limit);
  }

  // Versioning operations
  async createContentVersion(
    contentType: string,
    contentId: string,
    content: string,
    userId: string,
    changeDescription?: string
  ): Promise<ContentBackup> {
    // Get the latest version number for this content
    const latestVersion = await this.getLatestVersionNumber(contentType, contentId);
    const nextVersion = (latestVersion || 0) + 1;

    const [version] = await db
      .insert(contentBackups)
      .values({
        filename: `${contentType}-${contentId}-v${nextVersion}`,
        content,
        contentType,
        contentId,
        versionNumber: nextVersion,
        changeDescription,
        createdBy: userId,
      })
      .returning();
    return version;
  }

  async getLatestVersionNumber(contentType: string, contentId: string): Promise<number | null> {
    const [result] = await db
      .select({ maxVersion: sql<number>`MAX(${contentBackups.versionNumber})` })
      .from(contentBackups)
      .where(
        sql`${contentBackups.contentType} = ${contentType} AND ${contentBackups.contentId} = ${contentId}`
      );
    return result?.maxVersion || null;
  }

  async getContentHistory(contentType: string, contentId: string): Promise<ContentBackup[]> {
    return await db
      .select()
      .from(contentBackups)
      .where(
        sql`${contentBackups.contentType} = ${contentType} AND ${contentBackups.contentId} = ${contentId}`
      )
      .orderBy(desc(contentBackups.versionNumber));
  }

  async getContentVersion(contentType: string, contentId: string, versionNumber: number): Promise<ContentBackup | undefined> {
    const [version] = await db
      .select()
      .from(contentBackups)
      .where(
        sql`${contentBackups.contentType} = ${contentType} AND ${contentBackups.contentId} = ${contentId} AND ${contentBackups.versionNumber} = ${versionNumber}`
      );
    return version;
  }

  async compareVersions(
    contentType: string,
    contentId: string,
    version1: number,
    version2: number
  ): Promise<{ version1: ContentBackup | undefined; version2: ContentBackup | undefined }> {
    const v1 = await this.getContentVersion(contentType, contentId, version1);
    const v2 = await this.getContentVersion(contentType, contentId, version2);
    return { version1: v1, version2: v2 };
  }

  async restoreVersion(
    contentType: string,
    contentId: string,
    versionNumber: number,
    userId: string,
    restoreDescription?: string
  ): Promise<ContentBackup> {
    // Get the version to restore
    const versionToRestore = await this.getContentVersion(contentType, contentId, versionNumber);
    
    if (!versionToRestore) {
      throw new Error(`Version ${versionNumber} not found for ${contentType} ${contentId}`);
    }

    // Create a new version with the restored content
    const description = restoreDescription || `Restored from version ${versionNumber}`;
    return await this.createContentVersion(
      contentType,
      contentId,
      versionToRestore.content,
      userId,
      description
    );
  }

  async createMediaAsset(asset: Omit<typeof mediaAssets.$inferInsert, 'id' | 'createdAt'>): Promise<MediaAsset> {
    const [newAsset] = await db
      .insert(mediaAssets)
      .values(asset)
      .returning();
    return newAsset;
  }

  async getMediaAssets(): Promise<MediaAsset[]> {
    return await db
      .select()
      .from(mediaAssets)
      .orderBy(mediaAssets.createdAt);
  }

  async deleteMediaAsset(id: string): Promise<void> {
    await db
      .delete(mediaAssets)
      .where(eq(mediaAssets.id, id));
  }

  // Media Library operations
  async uploadMedia(data: Omit<UpsertMediaAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<MediaAsset> {
    const [newAsset] = await db
      .insert(mediaAssets)
      .values(data)
      .returning();
    return newAsset;
  }

  async listMedia(filters: MediaFilters, pagination: MediaPagination): Promise<MediaListResult> {
    const { page = 1, pageSize = 20 } = pagination;
    const offset = (page - 1) * pageSize;
    
    let query = db.select().from(mediaAssets).where(sql`${mediaAssets.deletedAt} IS NULL`).$dynamic();
    
    if (filters.type) {
      query = query.where(eq(mediaAssets.fileType, filters.type));
    }
    
    if (filters.uploadedBy) {
      query = query.where(eq(mediaAssets.uploadedBy, filters.uploadedBy));
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.where(sql`${mediaAssets.tags} ?| array[${sql.join(filters.tags.map(t => sql`${t}`), sql`, `)}]`);
    }
    
    if (filters.createdFrom) {
      query = query.where(gte(mediaAssets.createdAt, filters.createdFrom));
    }
    
    if (filters.createdTo) {
      query = query.where(lte(mediaAssets.createdAt, filters.createdTo));
    }
    
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(query.as('filtered'));
    
    const items = await query
      .orderBy(desc(mediaAssets.createdAt))
      .limit(pageSize)
      .offset(offset);
    
    return {
      items,
      totalCount: Number(count),
      page,
      pageSize
    };
  }

  async searchMedia(query: string, filters?: Partial<MediaFilters>): Promise<MediaListResult> {
    const page = 1;
    const pageSize = 50;
    
    let dbQuery = db
      .select()
      .from(mediaAssets)
      .where(
        and(
          sql`${mediaAssets.deletedAt} IS NULL`,
          or(
            sql`${mediaAssets.title} ILIKE ${`%${query}%`}`,
            sql`${mediaAssets.description} ILIKE ${`%${query}%`}`,
            sql`${mediaAssets.altText} ILIKE ${`%${query}%`}`
          )
        )
      )
      .$dynamic();
    
    if (filters?.type) {
      dbQuery = dbQuery.where(eq(mediaAssets.fileType, filters.type));
    }
    
    if (filters?.uploadedBy) {
      dbQuery = dbQuery.where(eq(mediaAssets.uploadedBy, filters.uploadedBy));
    }
    
    const items = await dbQuery.orderBy(desc(mediaAssets.createdAt)).limit(pageSize);
    
    return {
      items,
      totalCount: items.length,
      page,
      pageSize
    };
  }

  async getMedia(id: string): Promise<MediaAssetWithUsage | undefined> {
    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.id, id), sql`${mediaAssets.deletedAt} IS NULL`));
    
    if (!asset) return undefined;
    
    const usage = await this.getMediaUsage(id);
    
    return {
      ...asset,
      usageCount: usage.length,
      usage
    };
  }

  async updateMediaMetadata(id: string, updates: MediaMetadataUpdate): Promise<MediaAsset> {
    const [updated] = await db
      .update(mediaAssets)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(mediaAssets.id, id))
      .returning();
    
    return updated;
  }

  async deleteMedia(id: string, force: boolean = false): Promise<{ success: boolean; inUse?: boolean; usage?: MediaUsage[] }> {
    const usage = await this.getMediaUsage(id);
    
    if (usage.length > 0 && !force) {
      return {
        success: false,
        inUse: true,
        usage
      };
    }
    
    await db
      .update(mediaAssets)
      .set({ deletedAt: new Date() })
      .where(eq(mediaAssets.id, id));
    
    return { success: true };
  }

  async bulkDeleteMedia(ids: string[], force: boolean = false): Promise<BulkDeleteResult> {
    const deleted: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];
    
    for (const id of ids) {
      try {
        const result = await this.deleteMedia(id, force);
        if (result.success) {
          deleted.push(id);
        } else {
          failed.push({
            id,
            reason: `Media is in use in ${result.usage?.length || 0} locations`
          });
        }
      } catch (error) {
        failed.push({
          id,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return { deleted, failed };
  }

  async trackMediaUsage(mediaId: string, entityType: string, entityId: string, fieldName: string): Promise<void> {
    await db
      .insert(mediaUsage)
      .values({
        mediaId,
        entityType,
        entityId,
        fieldName,
        lastReferencedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [mediaUsage.mediaId, mediaUsage.entityType, mediaUsage.entityId, mediaUsage.fieldName],
        set: {
          lastReferencedAt: new Date()
        }
      });
  }

  async getMediaUsage(mediaId: string): Promise<MediaUsage[]> {
    return await db
      .select()
      .from(mediaUsage)
      .where(eq(mediaUsage.mediaId, mediaId));
  }

  async removeMediaUsage(mediaId: string, entityType: string, entityId: string, fieldName: string): Promise<void> {
    await db
      .delete(mediaUsage)
      .where(
        and(
          eq(mediaUsage.mediaId, mediaId),
          eq(mediaUsage.entityType, entityType),
          eq(mediaUsage.entityId, entityId),
          eq(mediaUsage.fieldName, fieldName)
        )
      );
  }
  
  // Chapter operations
  async createChapter(chapter: Omit<typeof chapters.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chapter> {
    const validation = await this.validateHierarchy(null, chapter.parentId || null);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    let depth = 0;
    let parentPath = '';

    if (chapter.parentId) {
      const parent = await this.getChapter(chapter.parentId);
      if (parent) {
        depth = (parent.depth || 0) + 1;
        // FIXED: Handle NULL parent.path (legacy data) by using parent.id as fallback
        parentPath = parent.path || parent.id;
      }
    }

    const [newChapter] = await db
      .insert(chapters)
      .values({
        ...chapter,
        depth,
        path: ''
      })
      .returning();

    const correctPath = parentPath 
      ? `${parentPath}/${newChapter.id}` 
      : newChapter.id;

    const [updatedChapter] = await db
      .update(chapters)
      .set({ path: correctPath })
      .where(eq(chapters.id, newChapter.id))
      .returning();

    return updatedChapter;
  }

  async getChapters(eventId?: string): Promise<Chapter[]> {
    if (eventId) {
      return await db
        .select()
        .from(chapters)
        .where(eq(chapters.eventId, eventId))
        .orderBy(asc(chapters.order));
    }
    return await db
      .select()
      .from(chapters)
      .orderBy(asc(chapters.order));
  }

  async getChapter(id: string): Promise<Chapter | undefined> {
    const [chapter] = await db
      .select()
      .from(chapters)
      .where(eq(chapters.id, id));
    return chapter;
  }

  async getChapterByKey(chapterKey: string): Promise<Chapter | undefined> {
    // Extract chapter number from key (e.g., "chapter-1" -> 1)
    const chapterNumber = parseInt(chapterKey.split('-')[1]) || 0;
    const [chapter] = await db
      .select()
      .from(chapters)
      .where(eq(chapters.order, chapterNumber));
    return chapter;
  }

  async getChapterCards(chapterKey: string): Promise<StoryCard[]> {
    const chapter = await this.getChapterByKey(chapterKey);
    if (!chapter) return [];
    
    return await db
      .select()
      .from(storyCards)
      .where(eq(storyCards.chapterId, chapter.id))
      .orderBy(asc(storyCards.order));
  }

  async updateChapter(id: string, updates: Partial<Chapter>): Promise<Chapter> {
    // FIXED: All hierarchy updates wrapped in single transaction for atomicity
    return await db.transaction(async (tx) => {
      if (updates.parentId !== undefined) {
        const validation = await this.validateHierarchy(id, updates.parentId || null);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        let depth = 0;
        let path = '';

        if (updates.parentId) {
          const parent = await this.getChapter(updates.parentId);
          if (parent) {
            depth = (parent.depth || 0) + 1;
            // FIXED: Handle NULL parent.path (legacy data) by using parent.id as fallback
            path = parent.path ? `${parent.path}/${id}` : `${parent.id}/${id}`;
          }
        } else {
          // Root-level chapter: path is just the chapter ID
          path = id;
        }

        updates.depth = depth;
        updates.path = path;
      }

      // Parent update happens within transaction
      const [updated] = await tx
        .update(chapters)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(chapters.id, id))
        .returning();

      // Descendant recalculation also within same transaction
      // If this fails, parent update will be rolled back
      if (updates.parentId !== undefined || updates.depth !== undefined || updates.path !== undefined) {
        await this.recalculateChildrenHierarchyInTransaction(tx, id);
      }

      return updated;
    });
  }

  private async recalculateChildrenHierarchy(parentId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await this.recalculateChildrenHierarchyInTransaction(tx, parentId);
    });
  }

  private async recalculateChildrenHierarchyInTransaction(tx: any, parentId: string): Promise<void> {
    const children = await tx
      .select()
      .from(chapters)
      .where(eq(chapters.parentId, parentId))
      .orderBy(asc(chapters.order));

    const [parent] = await tx
      .select()
      .from(chapters)
      .where(eq(chapters.id, parentId));

    if (!parent) return;

    for (const child of children) {
      const newDepth = (parent.depth || 0) + 1;
      // FIXED: Handle NULL parent.path (legacy data) by using parent.id as fallback
      const newPath = parent.path ? `${parent.path}/${child.id}` : `${parent.id}/${child.id}`;

      await tx
        .update(chapters)
        .set({
          depth: newDepth,
          path: newPath,
          updatedAt: new Date(),
        })
        .where(eq(chapters.id, child.id));

      // Recursively update all descendants
      await this.recalculateChildrenHierarchyInTransaction(tx, child.id);
    }
  }

  async deleteChapter(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete custom buttons for this chapter
      await tx.delete(customButtons)
        .where(and(
          eq(customButtons.parentType, 'chapter'),
          eq(customButtons.parentId, id)
        ));
      
      // Delete story cards for this chapter
      await tx.delete(storyCards)
        .where(eq(storyCards.chapterId, id));
      
      // Delete sub-chapters for this chapter
      await tx.delete(subChapters)
        .where(eq(subChapters.chapterId, id));
      
      // Delete the chapter itself
      await tx.delete(chapters)
        .where(eq(chapters.id, id));
    });
  }

  async reorderChapters(chapterOrders: Array<{ id: string; order: number }>): Promise<void> {
    await db.transaction(async (tx) => {
      for (const { id, order } of chapterOrders) {
        await tx.update(chapters)
          .set({ order, updatedAt: new Date() })
          .where(eq(chapters.id, id));
      }
    });
  }

  async reorderHierarchy(updates: Array<{ id: string; parentId: string | null; order: number }>): Promise<void> {
    // FIXED: Single transaction for all hierarchy updates (Issue 2)
    // All updates succeed or all fail - no partial updates
    await db.transaction(async (tx) => {
      // First, validate all updates before making any changes
      for (const update of updates) {
        const validation = await this.validateHierarchy(update.id, update.parentId);
        if (!validation.valid) {
          throw new Error(`Validation failed for chapter ${update.id}: ${validation.error}`);
        }
      }

      // Track chapters that need path recalculation
      const chaptersToRecalculate = new Set<string>();

      // Apply all updates within the transaction
      for (const update of updates) {
        let depth = 0;
        let path = '';

        if (update.parentId) {
          // Get parent from database
          const [parent] = await tx
            .select()
            .from(chapters)
            .where(eq(chapters.id, update.parentId));

          if (parent) {
            depth = (parent.depth || 0) + 1;
            // FIXED: Handle NULL parent.path (legacy data) by using parent.id as fallback
            path = parent.path ? `${parent.path}/${update.id}` : `${parent.id}/${update.id}`;
          }
        } else {
          // Root-level chapter
          path = update.id;
        }

        // Update the chapter
        await tx
          .update(chapters)
          .set({
            parentId: update.parentId,
            order: update.order,
            depth,
            path,
            updatedAt: new Date(),
          })
          .where(eq(chapters.id, update.id));

        // Mark for descendant recalculation
        chaptersToRecalculate.add(update.id);
      }

      // Recalculate paths for all descendants of updated chapters
      for (const chapterId of chaptersToRecalculate) {
        await this.recalculateChildrenHierarchyInTransaction(tx, chapterId);
      }
    });
  }

  async getChapterTree(eventId?: string): Promise<any[]> {
    const allChapters = await this.getChapters(eventId);
    
    const buildTree = (parentId: string | null = null): any[] => {
      return allChapters
        .filter(chapter => chapter.parentId === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(chapter => ({
          ...chapter,
          children: buildTree(chapter.id)
        }));
    };
    
    return buildTree(null);
  }

  async getChapterChildren(chapterId: string): Promise<Chapter[]> {
    return await db
      .select()
      .from(chapters)
      .where(eq(chapters.parentId, chapterId))
      .orderBy(asc(chapters.order));
  }

  async validateHierarchy(chapterId: string | null, parentId: string | null): Promise<{ valid: boolean; error?: string }> {
    if (!parentId) {
      return { valid: true };
    }

    if (chapterId === parentId) {
      return { valid: false, error: 'A chapter cannot be its own parent' };
    }

    const parent = await this.getChapter(parentId);
    if (!parent) {
      return { valid: false, error: 'Parent chapter not found' };
    }

    const parentDepth = parent.depth || 0;
    if (parentDepth >= 4) {
      return { valid: false, error: 'Maximum hierarchy depth of 5 levels exceeded' };
    }

    if (chapterId) {
      if (parent.path && parent.path.includes(chapterId)) {
        return { valid: false, error: 'Circular reference detected: cannot make a chapter the child of its own descendant' };
      }

      const result = await db.execute(sql`
        WITH RECURSIVE chapter_tree AS (
          SELECT id, parent_id, depth, path, 1 as level
          FROM chapters
          WHERE id = ${parentId}
          
          UNION ALL
          
          SELECT c.id, c.parent_id, c.depth, c.path, ct.level + 1
          FROM chapters c
          INNER JOIN chapter_tree ct ON c.parent_id = ct.id
          WHERE ct.level < 10
        )
        SELECT MAX(level) as max_depth
        FROM chapter_tree
      `);

      const maxDepth = result.rows[0]?.max_depth || 0;
      if (maxDepth >= 5) {
        return { valid: false, error: 'Maximum hierarchy depth of 5 levels would be exceeded' };
      }

      if (chapterId) {
        const childResult = await db.execute(sql`
          WITH RECURSIVE descendants AS (
            SELECT id, parent_id
            FROM chapters
            WHERE id = ${chapterId}
            
            UNION ALL
            
            SELECT c.id, c.parent_id
            FROM chapters c
            INNER JOIN descendants d ON c.parent_id = d.id
          )
          SELECT COUNT(*) as count
          FROM descendants
          WHERE id = ${parentId}
        `);

        const descendantCount = parseInt(childResult.rows[0]?.count || '0');
        if (descendantCount > 0) {
          return { valid: false, error: 'Circular reference detected: parent is a descendant of this chapter' };
        }
      }
    }

    return { valid: true };
  }
  
  // Sub-chapter operations
  async createSubChapter(subChapter: Omit<typeof subChapters.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubChapter> {
    const [newSubChapter] = await db
      .insert(subChapters)
      .values(subChapter)
      .returning();
    return newSubChapter;
  }

  async getSubChapters(chapterId: string): Promise<SubChapter[]> {
    return await db
      .select()
      .from(subChapters)
      .where(eq(subChapters.chapterId, chapterId))
      .orderBy(asc(subChapters.order));
  }

  async getSubChapter(id: string): Promise<SubChapter | undefined> {
    const [subChapter] = await db
      .select()
      .from(subChapters)
      .where(eq(subChapters.id, id));
    return subChapter;
  }

  async updateSubChapter(id: string, updates: Partial<SubChapter>): Promise<SubChapter> {
    const [updated] = await db
      .update(subChapters)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(subChapters.id, id))
      .returning();
    return updated;
  }

  async deleteSubChapter(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete custom buttons for this sub-chapter
      await tx.delete(customButtons)
        .where(and(
          eq(customButtons.parentType, 'sub_chapter'),
          eq(customButtons.parentId, id)
        ));
      
      // Delete the sub-chapter itself
      await tx.delete(subChapters)
        .where(eq(subChapters.id, id));
    });
  }
  
  // Story card operations
  async createStoryCard(card: Omit<typeof storyCards.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoryCard> {
    const [newCard] = await db
      .insert(storyCards)
      .values(card)
      .returning();
    return newCard;
  }

  async getStoryCards(chapterId: string): Promise<StoryCard[]> {
    return await db
      .select()
      .from(storyCards)
      .where(eq(storyCards.chapterId, chapterId))
      .orderBy(asc(storyCards.order));
  }

  async getStoryCard(id: string): Promise<StoryCard | undefined> {
    const [card] = await db
      .select()
      .from(storyCards)
      .where(eq(storyCards.id, id));
    return card;
  }

  async updateStoryCard(id: string, updates: Partial<StoryCard>): Promise<StoryCard> {
    const [updated] = await db
      .update(storyCards)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(storyCards.id, id))
      .returning();
    return updated;
  }

  async deleteStoryCard(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete custom buttons for this story card
      await tx.delete(customButtons)
        .where(and(
          eq(customButtons.parentType, 'story_card'),
          eq(customButtons.parentId, id)
        ));
      
      // Delete the story card itself
      await tx.delete(storyCards)
        .where(eq(storyCards.id, id));
    });
  }
  
  // Custom button operations
  async createCustomButton(button: Omit<typeof customButtons.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomButton> {
    const [newButton] = await db
      .insert(customButtons)
      .values(button)
      .returning();
    return newButton;
  }

  async getCustomButtons(parentType: string, parentId: string): Promise<CustomButton[]> {
    return await db
      .select()
      .from(customButtons)
      .where(and(
        eq(customButtons.parentType, parentType),
        eq(customButtons.parentId, parentId)
      ))
      .orderBy(asc(customButtons.order));
  }

  async getAllCustomButtons(): Promise<CustomButton[]> {
    return await db
      .select()
      .from(customButtons)
      .orderBy(asc(customButtons.parentType), asc(customButtons.parentId), asc(customButtons.order));
  }

  async getCustomButton(id: string): Promise<CustomButton | undefined> {
    const [button] = await db
      .select()
      .from(customButtons)
      .where(eq(customButtons.id, id));
    return button;
  }

  async updateCustomButton(id: string, updates: Partial<CustomButton>): Promise<CustomButton> {
    const [updated] = await db
      .update(customButtons)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(customButtons.id, id))
      .returning();
    return updated;
  }

  async deleteCustomButton(id: string): Promise<void> {
    await db
      .delete(customButtons)
      .where(eq(customButtons.id, id));
  }
  
  // User progress operations
  async trackProgress(userId: string, chapterId: string, cardIndex: number): Promise<void> {
    await db
      .insert(userProgress)
      .values({
        userId,
        chapterId,
        cardIndex,
        completedAt: new Date(),
        lastAccessed: new Date(),
      })
      .onConflictDoNothing();
  }

  async getUserChapterProgress(userId: string, chapterId: string): Promise<UserProgress[]> {
    return await db
      .select()
      .from(userProgress)
      .where(and(
        eq(userProgress.userId, userId),
        eq(userProgress.chapterId, chapterId)
      ))
      .orderBy(asc(userProgress.cardIndex));
  }

  async getSubChapterProgress(userId: string, subChapterId: string): Promise<number> {
    // This would need to be implemented based on your specific progress tracking logic
    // For now, returning 0 as a placeholder
    return 0;
  }

  // Search operations
  async searchContent(params: SearchParams): Promise<SearchResults> {
    const {
      query,
      eventId,
      hasAR,
      minDepth,
      maxDepth,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      parentId,
      contentTypes = ['chapter', 'card'],
      page = 1,
      pageSize = 20,
      sort = 'relevance'
    } = params;

    const offset = (page - 1) * pageSize;

    const includeChapters = contentTypes.includes('chapter');
    const includeCards = contentTypes.includes('card');

    if (!includeChapters && !includeCards) {
      return {
        results: [],
        totalCount: 0,
        page,
        pageSize,
        facets: await this.calculateFacets(eventId)
      };
    }

    let chapterIdsForCards: string[] | null = null;
    if (includeCards && (eventId || parentId)) {
      const chapterIds = await db
        .select({ id: chapters.id })
        .from(chapters)
        .where(
          and(
            eventId ? eq(chapters.eventId, eventId) : undefined,
            parentId ? eq(chapters.parentId, parentId) : undefined
          )
        );
      
      if (chapterIds.length === 0) {
        chapterIdsForCards = [];
      } else {
        chapterIdsForCards = chapterIds.map(c => c.id);
      }
    }

    if (includeCards && chapterIdsForCards !== null && chapterIdsForCards.length === 0) {
      if (!includeChapters) {
        return {
          results: [],
          totalCount: 0,
          page,
          pageSize,
          facets: await this.calculateFacets(eventId)
        };
      }
    }

    const queryParts: any[] = [];
    
    if (includeChapters) {
      const chapterConditions = [];
      
      if (query) {
        chapterConditions.push(sql`to_tsvector('english', COALESCE(c.title, '') || ' ' || COALESCE(c.summary, '')) @@ plainto_tsquery('english', ${query})`);
      }
      if (eventId) chapterConditions.push(sql`c.event_id = ${eventId}`);
      if (hasAR !== undefined) chapterConditions.push(sql`c.has_ar = ${hasAR}`);
      if (minDepth !== undefined) chapterConditions.push(sql`c.depth >= ${minDepth}`);
      if (maxDepth !== undefined) chapterConditions.push(sql`c.depth <= ${maxDepth}`);
      if (createdFrom) chapterConditions.push(sql`c.created_at >= ${createdFrom.toISOString()}`);
      if (createdTo) chapterConditions.push(sql`c.created_at <= ${createdTo.toISOString()}`);
      if (updatedFrom) chapterConditions.push(sql`c.updated_at >= ${updatedFrom.toISOString()}`);
      if (updatedTo) chapterConditions.push(sql`c.updated_at <= ${updatedTo.toISOString()}`);
      if (parentId) chapterConditions.push(sql`c.parent_id = ${parentId}`);

      const chapterWhere = chapterConditions.length > 0 
        ? sql`WHERE ${sql.join(chapterConditions, sql` AND `)}`
        : sql``;

      const chapterRank = query 
        ? sql`ts_rank_cd(to_tsvector('english', COALESCE(c.title, '') || ' ' || COALESCE(c.summary, '')), plainto_tsquery('english', ${query}))`
        : sql`1`;

      const chapterHighlight = query
        ? sql`ts_headline('english', COALESCE(c.title, '') || ' ' || COALESCE(c.summary, ''), plainto_tsquery('english', ${query}), 'MaxWords=30, MinWords=15')`
        : sql`COALESCE(c.summary, '')`;

      queryParts.push(sql`
        SELECT 
          c.id,
          'chapter' as content_type,
          c.title,
          c.summary as snippet,
          c.event_id,
          c.has_ar,
          c.depth,
          c.parent_id,
          c.created_at,
          c.updated_at,
          ${chapterRank} as rank,
          ${chapterHighlight} as highlight,
          NULL::jsonb as content
        FROM chapters c
        ${chapterWhere}
      `);
    }

    if (includeCards && !(chapterIdsForCards !== null && chapterIdsForCards.length === 0)) {
      const cardConditions = [];
      
      if (query) {
        cardConditions.push(sql`to_tsvector('english', COALESCE(sc.content::text, '')) @@ plainto_tsquery('english', ${query})`);
      }
      if (hasAR !== undefined) cardConditions.push(sql`sc.has_ar = ${hasAR}`);
      if (createdFrom) cardConditions.push(sql`sc.created_at >= ${createdFrom.toISOString()}`);
      if (createdTo) cardConditions.push(sql`sc.created_at <= ${createdTo.toISOString()}`);
      if (updatedFrom) cardConditions.push(sql`sc.updated_at >= ${updatedFrom.toISOString()}`);
      if (updatedTo) cardConditions.push(sql`sc.updated_at <= ${updatedTo.toISOString()}`);

      if (chapterIdsForCards !== null && chapterIdsForCards.length > 0) {
        cardConditions.push(sql`sc.chapter_id IN ${chapterIdsForCards}`);
      }

      const cardWhere = cardConditions.length > 0
        ? sql`WHERE ${sql.join(cardConditions, sql` AND `)}`
        : sql``;

      const cardRank = query
        ? sql`ts_rank_cd(to_tsvector('english', COALESCE(sc.content::text, '')), plainto_tsquery('english', ${query}))`
        : sql`1`;

      const cardHighlight = query
        ? sql`ts_headline('english', COALESCE(sc.content::text, ''), plainto_tsquery('english', ${query}), 'MaxWords=30, MinWords=15')`
        : sql`COALESCE(sc.content::text, '')`;

      queryParts.push(sql`
        SELECT 
          sc.id,
          'card' as content_type,
          'Story Card' as title,
          NULL as snippet,
          NULL as event_id,
          sc.has_ar,
          NULL::integer as depth,
          sc.chapter_id as parent_id,
          sc.created_at,
          sc.updated_at,
          ${cardRank} as rank,
          ${cardHighlight} as highlight,
          sc.content
        FROM story_cards sc
        ${cardWhere}
      `);
    }

    if (queryParts.length === 0) {
      return {
        results: [],
        totalCount: 0,
        page,
        pageSize,
        facets: await this.calculateFacets(eventId)
      };
    }

    const combinedQuery = queryParts.length > 1 
      ? sql.join(queryParts, sql` UNION ALL `)
      : queryParts[0];

    let orderByClause;
    if (sort === 'relevance' && query) {
      orderByClause = sql`ORDER BY rank DESC, updated_at DESC`;
    } else if (sort === 'date') {
      orderByClause = sql`ORDER BY updated_at DESC, created_at DESC`;
    } else if (sort === 'title') {
      orderByClause = sql`ORDER BY title ASC`;
    } else {
      orderByClause = sql`ORDER BY updated_at DESC`;
    }

    const finalQuery = sql`
      WITH combined_results AS (
        ${combinedQuery}
      ),
      counted_results AS (
        SELECT COUNT(*) as total_count FROM combined_results
      )
      SELECT 
        cr.*,
        cr_count.total_count
      FROM combined_results cr
      CROSS JOIN counted_results cr_count
      ${orderByClause}
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

    const rawResults = await db.execute(finalQuery);
    const rows = rawResults.rows as any[];

    if (rows.length === 0) {
      return {
        results: [],
        totalCount: 0,
        page,
        pageSize,
        facets: await this.calculateFacets(eventId)
      };
    }

    const totalCount = Number(rows[0]?.total_count || 0);

    const results: SearchResult[] = rows.map(r => ({
      id: r.id,
      type: r.content_type as 'chapter' | 'card',
      title: r.title,
      summary: r.snippet || undefined,
      content: r.content || undefined,
      highlight: r.highlight || undefined,
      eventId: r.event_id || undefined,
      hasAR: r.has_ar || false,
      depth: r.depth || undefined,
      parentId: r.parent_id || undefined,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
      rank: Number(r.rank)
    }));

    return {
      results,
      totalCount,
      page,
      pageSize,
      facets: await this.calculateFacets(eventId)
    };
  }

  private async calculateFacets(eventId?: string): Promise<{
    events: Array<{ id: string; title: string; count: number }>;
    contentTypes: Array<{ type: string; count: number }>;
    hasAR: { withAR: number; withoutAR: number };
  }> {
    const events = await db
      .select({
        id: liveEvents.id,
        title: liveEvents.title,
        count: sql<number>`COUNT(DISTINCT ${chapters.id})`
      })
      .from(liveEvents)
      .leftJoin(chapters, eq(chapters.eventId, liveEvents.id))
      .groupBy(liveEvents.id, liveEvents.title);

    const chapterCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(chapters);
    
    const cardCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(storyCards);

    const arCounts = await db
      .select({
        hasAR: chapters.hasAR,
        count: sql<number>`COUNT(*)`
      })
      .from(chapters)
      .groupBy(chapters.hasAR);

    const withAR = arCounts.find(a => a.hasAR)?.count || 0;
    const withoutAR = arCounts.find(a => !a.hasAR)?.count || 0;

    return {
      events: events.map(e => ({ id: e.id, title: e.title, count: Number(e.count) })),
      contentTypes: [
        { type: 'chapter', count: Number(chapterCount[0]?.count || 0) },
        { type: 'card', count: Number(cardCount[0]?.count || 0) }
      ],
      hasAR: { withAR: Number(withAR), withoutAR: Number(withoutAR) }
    };
  }

  async updateSearchVector(contentType: 'chapter' | 'card', id: string, text: string): Promise<void> {
    if (contentType === 'chapter') {
      await db
        .update(chapters)
        .set({
          searchVector: sql`to_tsvector('english', ${text})`,
          updatedAt: new Date()
        })
        .where(eq(chapters.id, id));
    } else if (contentType === 'card') {
      await db
        .update(storyCards)
        .set({
          searchVector: sql`to_tsvector('english', ${text})`,
          updatedAt: new Date()
        })
        .where(eq(storyCards.id, id));
    }
  }

  async searchSuggestions(prefix: string, limit: number = 10): Promise<string[]> {
    if (!prefix || prefix.length < 2) {
      return [];
    }

    const chapterSuggestions = await db
      .select({ title: chapters.title })
      .from(chapters)
      .where(sql`${chapters.title} ILIKE ${prefix + '%'}`)
      .limit(limit);

    const suggestions = chapterSuggestions
      .map(s => s.title)
      .filter((title, index, self) => self.indexOf(title) === index)
      .slice(0, limit);

    return suggestions;
  }
}

// Type definitions for compatibility
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type ContentBackup = typeof contentBackups.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type SubChapter = typeof subChapters.$inferSelect;
export type StoryCard = typeof storyCards.$inferSelect;
export type CustomButton = typeof customButtons.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;

export const storage = new DatabaseStorage();