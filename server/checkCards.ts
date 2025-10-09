import { db } from './db';
import { chapters, storyCards } from '../shared/schema';
import { eq, asc } from 'drizzle-orm';

async function checkCards() {
  console.log('🔍 Checking database for chapters and cards...\n');

  // Get all chapters
  const allChapters = await db
    .select()
    .from(chapters)
    .orderBy(asc(chapters.order));

  console.log(`Found ${allChapters.length} chapters:\n`);

  for (const chapter of allChapters) {
    console.log(`📖 Chapter ${chapter.order}: ${chapter.title}`);
    console.log(`   ID: ${chapter.id}`);

    // Get cards for this chapter
    const cards = await db
      .select()
      .from(storyCards)
      .where(eq(storyCards.chapterId, chapter.id))
      .orderBy(asc(storyCards.order));

    console.log(`   Cards: ${cards.length}`);
    if (cards.length > 0) {
      cards.forEach(card => {
        console.log(`     - Card ${card.order}: ${card.id}`);
      });
    }
    console.log('');
  }

  process.exit(0);
}

checkCards().catch(console.error);
