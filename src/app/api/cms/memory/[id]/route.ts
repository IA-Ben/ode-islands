import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../server/db';
import { collectibleDefinitions, userCollectibles, userMemoryWallet, chapters, subChapters } from '../../../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '../../../../../../server/auth';
import type { MemoryDetail, MemoryType, MemoryRarity } from '@/types/memory';

async function handleGET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const memoryId = params.id;
    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // First check if it's a collectible definition
    const [definition] = await db
      .select()
      .from(collectibleDefinitions)
      .where(eq(collectibleDefinitions.id, memoryId))
      .limit(1);

    // Check if user owns this collectible
    let isOwned = false;
    let collectedAt: Date | null = null;
    let userMemoryData: any = null;

    if (definition) {
      // Check in user collectibles
      const [userCollectible] = await db
        .select()
        .from(userCollectibles)
        .where(and(
          eq(userCollectibles.collectibleId, memoryId),
          eq(userCollectibles.userId, session.userId)
        ))
        .limit(1);

      if (userCollectible) {
        isOwned = true;
        collectedAt = userCollectible.unlockedAt;
      }

      // Also check in memory wallet by sourceId
      const [memoryWalletItem] = await db
        .select()
        .from(userMemoryWallet)
        .where(and(
          eq(userMemoryWallet.sourceId, memoryId),
          eq(userMemoryWallet.userId, session.userId)
        ))
        .limit(1);

      if (memoryWalletItem) {
        isOwned = true;
        collectedAt = collectedAt || memoryWalletItem.collectedAt;
        userMemoryData = memoryWalletItem;
      }
    }

    // If not found in definitions, check direct memory wallet entry
    if (!definition) {
      const [directMemory] = await db
        .select()
        .from(userMemoryWallet)
        .where(and(
          eq(userMemoryWallet.id, memoryId),
          eq(userMemoryWallet.userId, session.userId)
        ))
        .limit(1);

      if (directMemory) {
        isOwned = true;
        userMemoryData = directMemory;
        collectedAt = directMemory.collectedAt;
      } else {
        return NextResponse.json(
          { success: false, message: 'Memory not found' },
          { status: 404 }
        );
      }
    }

    // Get chapter and sub-chapter information if available
    let chapterTitle: string | undefined;
    let subChapterTitle: string | undefined;
    
    if (definition?.chapterId || userMemoryData?.chapterId) {
      const chapterId = definition?.chapterId || userMemoryData?.chapterId;
      const [chapter] = await db
        .select()
        .from(chapters)
        .where(eq(chapters.id, chapterId))
        .limit(1);
      
      if (chapter) {
        chapterTitle = chapter.title;
      }
    }

    if (definition?.subChapterId) {
      const [subChapter] = await db
        .select()
        .from(subChapters)
        .where(eq(subChapters.id, definition.subChapterId))
        .limit(1);
      
      if (subChapter) {
        subChapterTitle = subChapter.title;
      }
    }

    // Map type and rarity
    let type: MemoryType = 'photo';
    let rarity: MemoryRarity = 'common';

    if (definition) {
      if (definition.type === 'stamp' || definition.type === 'sticker' || definition.type === 'photo' || definition.type === 'ar') {
        type = definition.type as MemoryType;
      } else if (definition.shape === 'circle') {
        type = 'stamp';
      } else if (definition.shape === 'square') {
        type = 'sticker';
      }

      if (definition.rarity === 'common' || definition.rarity === 'rare' || definition.rarity === 'legendary') {
        rarity = definition.rarity as MemoryRarity;
      } else if (definition.isBonus) {
        rarity = 'legendary';
      } else if (definition.points && definition.points > 50) {
        rarity = 'rare';
      }
    } else if (userMemoryData) {
      // Derive from memory wallet data
      if (userMemoryData.sourceType === 'ar') type = 'ar';
      else if (userMemoryData.mediaType === 'video') type = 'photo';
    }

    // Parse tags if stored as JSON string
    let tags: string[] = [];
    if (userMemoryData?.tags) {
      if (typeof userMemoryData.tags === 'string') {
        try {
          tags = JSON.parse(userMemoryData.tags);
        } catch {
          tags = [];
        }
      } else if (Array.isArray(userMemoryData.tags)) {
        tags = userMemoryData.tags;
      }
    } else if (definition?.tags) {
      tags = Array.isArray(definition.tags) ? definition.tags : [];
    }

    // Build the memory detail response
    const memoryDetail: MemoryDetail = {
      id: memoryId,
      title: definition?.title || definition?.name || userMemoryData?.title || 'Memory Item',
      heroUrl: isOwned ? (userMemoryData?.mediaUrl || definition?.imageUrl || definition?.unlockedImageUrl) : undefined,
      description: definition?.description || userMemoryData?.description,
      chapterTitle: chapterTitle || definition?.chapterTitle,
      subChapterTitle: subChapterTitle || definition?.subChapterTitle,
      collectedAt: isOwned && collectedAt ? collectedAt.toISOString() : null,
      type,
      rarity,
      points: definition?.points || 10,
      tags,
      source: definition?.unlockMethod || userMemoryData?.sourceType,
      unlockRule: definition?.unlockRule || definition?.unlockCriteria,
      shareUrl: `/memory-wallet/${memoryId}`,
      arItemId: definition?.arSceneId,
      credits: definition?.credits,
      alt: definition?.altText || `${type} memory: ${definition?.title || userMemoryData?.title || 'Memory Item'}`,
      license: definition?.license,
      // Additional metadata
      mediaUrl: isOwned ? (userMemoryData?.mediaUrl || definition?.imageUrl) : undefined,
      mediaType: userMemoryData?.mediaType,
      thumbnail: isOwned ? (userMemoryData?.thumbnail || definition?.thumbnailUrl) : undefined,
      sourceType: userMemoryData?.sourceType,
      sourceId: userMemoryData?.sourceId || definition?.id,
      sourceMetadata: userMemoryData?.sourceMetadata,
      eventId: definition?.eventId || userMemoryData?.eventId,
      chapterId: definition?.chapterId || userMemoryData?.chapterId,
      cardIndex: userMemoryData?.cardIndex,
      userNotes: userMemoryData?.userNotes,
      isFavorite: userMemoryData?.isFavorite,
      memoryCategory: userMemoryData?.memoryCategory,
      emotionalTone: userMemoryData?.emotionalTone,
    };

    // If not owned and it's a collectible, only return limited information
    if (!isOwned && definition) {
      const limitedDetail: MemoryDetail = {
        id: memoryId,
        title: definition.title || definition.name || 'Locked Memory',
        heroUrl: undefined,
        description: undefined,
        chapterTitle: chapterTitle || definition.chapterTitle,
        subChapterTitle: subChapterTitle || definition.subChapterTitle,
        collectedAt: null,
        type,
        rarity,
        points: definition.points || 10,
        tags: [],
        source: definition.unlockMethod,
        unlockRule: definition.unlockRule || definition.unlockCriteria || 'Complete the required action to unlock',
        shareUrl: `/memory-wallet/${memoryId}`,
        arItemId: undefined,
        credits: undefined,
        alt: `Locked ${type} memory`,
        license: undefined,
      };

      return NextResponse.json({
        success: true,
        data: limitedDetail,
        isLocked: true
      });
    }

    return NextResponse.json({
      success: true,
      data: memoryDetail,
      isLocked: false
    });

  } catch (error) {
    console.error('CMS memory detail fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch memory details' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);