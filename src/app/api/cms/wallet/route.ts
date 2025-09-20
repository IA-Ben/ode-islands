import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { collectibleDefinitions, userCollectibles, userMemoryWallet } from '../../../../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { withAuth } from '../../../../../server/auth';
import type { MemorySummary, MemoryType, MemoryRarity, WalletResponse } from '@/types/memory';

async function handleGET(request: NextRequest) {
  try {
    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch all collectible definitions
    const definitions = await db
      .select()
      .from(collectibleDefinitions)
      .orderBy(collectibleDefinitions.gridPosition);

    // Fetch user's collected items from both tables
    const userCollectedItems = await db
      .select()
      .from(userCollectibles)
      .where(eq(userCollectibles.userId, session.userId));

    const userMemories = await db
      .select()
      .from(userMemoryWallet)
      .where(eq(userMemoryWallet.userId, session.userId));

    // Create a map for quick lookup of user's collected items
    const collectedMap = new Map<string, boolean>();
    const memoryDataMap = new Map<string, any>();
    
    // Mark collectibles as owned
    userCollectedItems.forEach(item => {
      collectedMap.set(item.collectibleId, true);
    });

    // Mark memories from wallet as owned by sourceId or by title match
    userMemories.forEach(memory => {
      if (memory.sourceId) {
        collectedMap.set(memory.sourceId, true);
        memoryDataMap.set(memory.sourceId, memory);
      }
      // Also map by title for fallback matching
      if (memory.title) {
        memoryDataMap.set(memory.title.toLowerCase(), memory);
      }
    });

    // Transform definitions to MemorySummary format
    const items: MemorySummary[] = definitions.map(def => {
      const isOwned = collectedMap.has(def.id) || 
                     (!!def.name && memoryDataMap.has(def.name.toLowerCase()));
      
      // Get memory data if available
      const memoryData = memoryDataMap.get(def.id) || 
                        (def.name ? memoryDataMap.get(def.name.toLowerCase()) : null);

      // Map type and rarity with fallbacks
      let type: MemoryType = 'photo'; // default
      if (def.type === 'stamp' || def.type === 'sticker' || def.type === 'photo' || def.type === 'ar') {
        type = def.type as MemoryType;
      } else if (def.shape === 'circle') {
        type = 'stamp';
      } else if (def.shape === 'rectangle') {
        type = 'photo';
      } else if (def.shape === 'hexagon') {
        type = 'sticker';
      }

      let rarity: MemoryRarity = 'common'; // default
      if (def.rarity === 'common' || def.rarity === 'rare' || def.rarity === 'legendary') {
        rarity = def.rarity as MemoryRarity;
      } else if (def.rarity === 'epic') {
        rarity = 'rare'; // Map epic to rare since we don't have epic in MemoryRarity
      } else if (def.isBonus) {
        rarity = 'legendary';
      }

      // Determine points based on rarity
      let points = 10; // default common points
      if (rarity === 'rare') {
        points = 25;
      } else if (rarity === 'legendary') {
        points = 50;
      }

      return {
        id: def.id,
        title: def.name || 'Memory Item',
        thumbnailUrl: isOwned 
          ? (memoryData?.thumbnail ?? def.imageUrl ?? def.thumbnailUrl ?? undefined) 
          : undefined,
        owned: isOwned,
        type,
        rarity,
        points,
        chapterTitle: undefined, // Not available in collectible definitions
        subChapterTitle: undefined, // Not available in collectible definitions
      };
    });

    // If no definitions exist but user has memories, add them as additional items
    const additionalMemories = userMemories.filter(memory => 
      !collectedMap.has(memory.sourceId || '') && 
      !memoryDataMap.has(memory.title?.toLowerCase() || '')
    );

    additionalMemories.forEach(memory => {
      let type: MemoryType = 'photo';
      if (memory.sourceType === 'ar') type = 'ar';
      else if (memory.mediaType === 'video') type = 'photo';
      
      items.push({
        id: memory.id,
        title: memory.title || 'Memory',
        thumbnailUrl: memory.thumbnail ?? memory.mediaUrl ?? undefined,
        owned: true,
        type,
        rarity: 'common',
        points: 10,
        chapterTitle: undefined,
        subChapterTitle: undefined,
      });
    });

    const unlockedCount = items.filter(item => item.owned).length;
    const totalSlots = Math.max(items.length, 20); // Minimum 20 slots for display

    const response: WalletResponse = {
      totalSlots,
      items,
      unlockedCount,
      progress: {
        percentage: totalSlots > 0 ? Math.round((unlockedCount / totalSlots) * 100) : 0,
        level: unlockedCount >= totalSlots * 0.8 ? 'expert' : 
               unlockedCount >= totalSlots * 0.5 ? 'intermediate' : 
               unlockedCount >= totalSlots * 0.2 ? 'beginner' : 'novice'
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('CMS wallet fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch wallet data' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);