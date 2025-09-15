import {
  users,
  mediaAssets,
  contentBackups,
  type User,
  type UpsertUser,
} from "../shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  migrateUserToOIDC(oldUserId: string, newUserData: UpsertUser): Promise<User>;
  
  // CMS-specific operations
  createContentBackup(filename: string, content: string, userId: string): Promise<ContentBackup>;
  getContentBackups(limit?: number): Promise<ContentBackup[]>;
  createMediaAsset(asset: Omit<typeof mediaAssets.$inferInsert, 'id' | 'createdAt'>): Promise<MediaAsset>;
  getMediaAssets(): Promise<MediaAsset[]>;
  deleteMediaAsset(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
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
        ['user_achievements', 'user_id']
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
      }
    }

    // Normal upsert operation
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
          // Don't overwrite admin status unless explicitly set
          ...(userData.isAdmin !== undefined && { isAdmin: userData.isAdmin })
        },
      })
      .returning();
    return user;
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
}

// Type definitions for compatibility
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type ContentBackup = typeof contentBackups.$inferSelect;

export const storage = new DatabaseStorage();