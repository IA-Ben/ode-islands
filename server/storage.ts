import {
  users,
  mediaAssets,
  contentBackups,
  chapters,
  subChapters,
  storyCards,
  customButtons,
  userProgress,
  type User,
  type UpsertUser,
} from "../shared/schema";
import { db } from "./db";
import { eq, sql, and, desc, asc } from "drizzle-orm";

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
  updateChapter(id: string, updates: Partial<Chapter>): Promise<Chapter>;
  deleteChapter(id: string): Promise<void>;
  
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
  
  // Chapter operations
  async createChapter(chapter: Omit<typeof chapters.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chapter> {
    const [newChapter] = await db
      .insert(chapters)
      .values(chapter)
      .returning();
    return newChapter;
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

  async updateChapter(id: string, updates: Partial<Chapter>): Promise<Chapter> {
    const [updated] = await db
      .update(chapters)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, id))
      .returning();
    return updated;
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