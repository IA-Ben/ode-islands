import { db } from './db';
import { chapters, storyCards } from '../shared/schema';
import { eq, asc } from 'drizzle-orm';

async function checkCardContent() {
  console.log('🔍 Checking Chapter 1 card content...\n');

  // Get Chapter 1
  const chapter1 = await db
    .select()
    .from(chapters)
    .where(eq(chapters.order, 1));

  if (chapter1.length === 0) {
    console.log('❌ Chapter 1 not found');
    process.exit(1);
  }

  const chapterId = chapter1[0].id;
  console.log(`Chapter 1 ID: ${chapterId}\n`);

  // Get first 3 cards
  const cards = await db
    .select()
    .from(storyCards)
    .where(eq(storyCards.chapterId, chapterId))
    .orderBy(asc(storyCards.order))
    .limit(3);

  cards.forEach((card, index) => {
    console.log(`\n📄 Card ${index}:`);
    console.log(`   ID: ${card.id}`);
    console.log(`   Order: ${card.order}`);
    console.log(`   Publish Status: ${card.publishStatus}`);
    console.log(`   Content:`, JSON.stringify(card.content, null, 2));
  });

  process.exit(0);
}

checkCardContent().catch(console.error);
