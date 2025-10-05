#!/usr/bin/env tsx
/**
 * Migration Script: Transfer JSON chapter data to PostgreSQL
 * 
 * This script migrates all chapter and card data from ode-islands.json
 * to the PostgreSQL database, storing complete card payloads in the
 * storyCards.content JSONB field.
 */

import { db } from '../server/db';
import { chapters, storyCards } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';

interface JsonChapterData {
  [key: string]: any[];
}

interface MigrationStats {
  chaptersCreated: number;
  cardsCreated: number;
  errors: string[];
}

async function runMigration() {
  console.log('🚀 Starting JSON to Database migration...\n');

  const stats: MigrationStats = {
    chaptersCreated: 0,
    cardsCreated: 0,
    errors: []
  };

  try {
    // 1. Read JSON file
    const jsonPath = path.join(process.cwd(), 'src/app/data/ode-islands.json');
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    const jsonData: JsonChapterData = JSON.parse(jsonContent);

    console.log(`📖 Loaded JSON data with ${Object.keys(jsonData).length} chapters\n`);

    // 2. Create backup
    const backupPath = path.join(process.cwd(), `src/app/data/ode-islands.backup-${Date.now()}.json`);
    await fs.writeFile(backupPath, jsonContent);
    console.log(`💾 Backup created: ${backupPath}\n`);

    // 3. Process each chapter
    for (const [chapterKey, cards] of Object.entries(jsonData)) {
      console.log(`Processing ${chapterKey}...`);

      try {
        // Extract chapter number from key (e.g., "chapter-1" -> 1)
        const chapterNumber = parseInt(chapterKey.split('-')[1]) || 0;

        // Check if chapter already exists
        const existingChapters = await db
          .select()
          .from(chapters)
          .where(eq(chapters.order, chapterNumber));

        let chapterId: string;

        if (existingChapters.length > 0) {
          // Use existing chapter
          chapterId = existingChapters[0].id;
          console.log(`  ✓ Using existing chapter: ${chapterId}`);
        } else {
          // Create new chapter
          const [newChapter] = await db
            .insert(chapters)
            .values({
              title: `Chapter ${chapterNumber}`,
              summary: `Content from ${chapterKey}`,
              order: chapterNumber,
              hasAR: cards.some(card => card.ar || card.playcanvas)
            })
            .returning();

          chapterId = newChapter.id;
          stats.chaptersCreated++;
          console.log(`  ✓ Created new chapter: ${chapterId}`);
        }

        // 4. Migrate cards for this chapter
        for (let i = 0; i < cards.length; i++) {
          const cardData = cards[i];

          try {
            // Store the complete card data in the content JSONB field
            await db
              .insert(storyCards)
              .values({
                chapterId,
                order: i,
                content: cardData,
                hasAR: !!(cardData.ar || cardData.playcanvas)
              });

            stats.cardsCreated++;
          } catch (cardError: any) {
            const error = `Error creating card ${i} in ${chapterKey}: ${cardError.message}`;
            stats.errors.push(error);
            console.error(`  ✗ ${error}`);
          }
        }

        console.log(`  ✓ Migrated ${cards.length} cards\n`);

      } catch (chapterError: any) {
        const error = `Error processing ${chapterKey}: ${chapterError.message}`;
        stats.errors.push(error);
        console.error(`  ✗ ${error}\n`);
      }
    }

    // 5. Validation
    console.log('🔍 Validating migration...\n');

    const allChapters = await db.select().from(chapters);
    const allCards = await db.select().from(storyCards);

    console.log(`📊 Migration Statistics:`);
    console.log(`   Chapters in database: ${allChapters.length}`);
    console.log(`   Cards in database: ${allCards.length}`);
    console.log(`   New chapters created: ${stats.chaptersCreated}`);
    console.log(`   New cards created: ${stats.cardsCreated}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach(err => console.log(`   - ${err}`));
    } else {
      console.log(`\n✅ Migration completed successfully!`);
    }

    // 6. Verify data integrity
    console.log(`\n🔬 Data Integrity Check:`);
    for (const chapter of allChapters) {
      const cards = await db
        .select()
        .from(storyCards)
        .where(eq(storyCards.chapterId, chapter.id));
      
      console.log(`   Chapter "${chapter.title}" (order: ${chapter.order}): ${cards.length} cards`);
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n✨ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
