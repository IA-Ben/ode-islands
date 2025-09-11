import {
  users,
  mediaAssets,
  contentBackups,
  type User,
  type UpsertUser,
  type MediaAsset,
  type ContentBackup,
} from "../shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
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
    const [media] = await db
      .insert(mediaAssets)
      .values(asset)
      .returning();
    return media;
  }

  async getMediaAssets(): Promise<MediaAsset[]> {
    return await db
      .select()
      .from(mediaAssets)
      .orderBy(mediaAssets.createdAt);
  }

  async deleteMediaAsset(id: string): Promise<void> {
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  }
}

export const storage = new DatabaseStorage();