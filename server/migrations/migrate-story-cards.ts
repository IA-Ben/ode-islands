import { db } from '../db';
import { storyCards, cards, cardAssignments } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

function extractTitleFromContent(content: any): string | null {
  if (!content) return null;
  
  // Check if content has a title field
  if (typeof content.title === 'string') {
    return content.title.substring(0, 50);
  }
  
  // Check if text is a string
  if (typeof content.text === 'string') {
    return content.text.substring(0, 50);
  }
  
  // Check if text is an array (visual editor format)
  if (Array.isArray(content.text) && content.text[0]?.text) {
    return content.text[0].text.substring(0, 50);
  }
  
  // Check if elements array exists (another format)
  if (Array.isArray(content.elements) && content.elements[0]?.content?.text) {
    return content.elements[0].content.text.substring(0, 50);
  }
  
  // Fallback: serialize content and take first 50 chars
  try {
    const str = JSON.stringify(content);
    return str.substring(0, 50);
  } catch {
    return null;
  }
}

export async function migrateStoryCards(): Promise<{ success: boolean; migratedCount: number; error?: string }> {
  console.log('Starting story cards migration...');
  
  let migratedCount = 0;
  const errors: string[] = [];

  try {
    const allStoryCards = await db.select().from(storyCards);
    console.log(`Found ${allStoryCards.length} story cards to migrate`);

    if (allStoryCards.length === 0) {
      console.log('No story cards found to migrate');
      return { success: true, migratedCount: 0 };
    }

    await db.transaction(async (tx) => {
      for (const storyCard of allStoryCards) {
        try {
          const existingCards = await tx
            .select()
            .from(cards)
            .where(
              sql`${cards.metadata}->>'originalStoryCardId' = ${storyCard.id}`
            );

          if (existingCards.length > 0) {
            console.log(`Card already migrated for story card ${storyCard.id}, skipping...`);
            continue;
          }

          const content = storyCard.content as any;
          let cardType = 'text-story';
          
          if (content) {
            if (content.poll || (typeof content === 'object' && 'pollQuestion' in content)) {
              cardType = 'poll-story';
            } else if (content.quiz || (typeof content === 'object' && 'quizQuestion' in content)) {
              cardType = 'quiz-story';
            }
          }

          const title = extractTitleFromContent(content) || `Story Card ${storyCard.order || 0}`;

          const [newCard] = await tx
            .insert(cards)
            .values({
              scope: 'story',
              type: cardType,
              schemaVersion: 1,
              title: title || 'Untitled Story Card',
              subtitle: null,
              summary: null,
              content: storyCard.content || {},
              imageMediaId: storyCard.imageMediaId,
              videoMediaId: storyCard.videoMediaId,
              iconName: null,
              size: null,
              publishStatus: storyCard.publishStatus || 'draft',
              publishedAt: storyCard.publishedAt,
              publishedBy: storyCard.publishedBy,
              scheduledPublishAt: storyCard.scheduledPublishAt,
              reviewedBy: storyCard.reviewedBy,
              reviewedAt: storyCard.reviewedAt,
              reviewNotes: storyCard.reviewNotes,
              isActive: true,
              metadata: {
                originalStoryCardId: storyCard.id,
                hasAR: storyCard.hasAR,
                visualLayout: storyCard.visualLayout,
                migratedAt: new Date().toISOString(),
              },
              createdBy: null,
              createdAt: storyCard.createdAt,
              updatedAt: storyCard.updatedAt,
            })
            .returning();

          await tx.insert(cardAssignments).values({
            cardId: newCard.id,
            parentType: 'chapter',
            parentId: storyCard.chapterId,
            order: storyCard.order || 0,
            visibilityStartAt: null,
            visibilityEndAt: null,
            status: storyCard.publishStatus === 'published' ? 'active' : 'inactive',
            createdAt: storyCard.createdAt,
            updatedAt: storyCard.updatedAt,
          });

          migratedCount++;
          
          if (migratedCount % 10 === 0) {
            console.log(`Migrated ${migratedCount} story cards...`);
          }
        } catch (error: any) {
          const errorMsg = `Failed to migrate story card ${storyCard.id}: ${error.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
    });

    console.log(`✓ Successfully migrated ${migratedCount} story cards to unified cards system`);
    
    if (errors.length > 0) {
      console.warn(`Migration completed with ${errors.length} errors:`);
      errors.forEach(err => console.warn(`  - ${err}`));
    }

    return { success: true, migratedCount };
  } catch (error: any) {
    const errorMsg = `Migration failed: ${error.message}`;
    console.error(errorMsg);
    return { success: false, migratedCount, error: errorMsg };
  }
}
