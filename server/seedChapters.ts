import { db } from './db';
import { chapters, storyCards } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import odeIslandsData from '../src/app/data/ode-islands.json';

/**
 * Seed chapters and story cards from ode-islands.json into the database
 */
export async function seedChapters() {
  const results = {
    chaptersCreated: 0,
    cardsCreated: 0,
    errors: [] as string[],
  };

  try {
    console.log('🌱 Seeding chapters from ode-islands.json...');

    // Define chapter metadata
    const chapterMetadata = [
      {
        key: 'chapter-1',
        title: 'The Beginning',
        summary: 'Once upon a time, on a distant island, there existed a perfect balance of energies.',
        order: 1,
        phase: 'before',
      },
      {
        key: 'chapter-2',
        title: 'The Journey',
        summary: 'The journey continues as the balance shifts.',
        order: 2,
        phase: 'before',
      },
      {
        key: 'chapter-3',
        title: 'The Revelation',
        summary: 'Discover the truth behind the islands.',
        order: 3,
        phase: 'before',
      },
    ];

    // Import each chapter
    for (const meta of chapterMetadata) {
      try {
        const chapterData = odeIslandsData[meta.key as keyof typeof odeIslandsData];

        if (!chapterData || !Array.isArray(chapterData)) {
          results.errors.push(`Chapter ${meta.key} not found in JSON or invalid format`);
          continue;
        }

        // Check if chapter already exists
        const existingChapters = await db
          .select()
          .from(chapters)
          .where(eq(chapters.order, meta.order));

        let chapterId: string;

        if (existingChapters.length > 0) {
          // Update existing chapter
          chapterId = existingChapters[0].id;
          await db
            .update(chapters)
            .set({
              title: meta.title,
              summary: meta.summary,
              updatedAt: new Date(),
            })
            .where(eq(chapters.id, chapterId));
          console.log(`✅ Updated chapter: ${meta.title}`);
        } else {
          // Create new chapter
          const [newChapter] = await db
            .insert(chapters)
            .values({
              title: meta.title,
              summary: meta.summary,
              order: meta.order,
              hasAR: false,
              depth: 0,
            })
            .returning();
          chapterId = newChapter.id;
          results.chaptersCreated++;
          console.log(`✅ Created chapter: ${meta.title}`);
        }

        // Import story cards for this chapter
        console.log(`   Importing ${chapterData.length} cards for chapter ID: ${chapterId}`);
        for (let i = 0; i < chapterData.length; i++) {
          const card = chapterData[i];

          try {
            // Check if card already exists (by chapterId and order)
            const existingCards = await db
              .select()
              .from(storyCards)
              .where(and(
                eq(storyCards.chapterId, chapterId),
                eq(storyCards.order, i)
              ));

            const cardData = {
              chapterId,
              order: i,
              content: card, // Store entire card JSON in content field
              hasAR: card.ar ? true : false,
              publishStatus: 'published', // Make them immediately available
            };

            if (existingCards.length > 0) {
              // Update existing card
              console.log(`     Card ${i}: Updating existing card ${existingCards[0].id}`);
              await db
                .update(storyCards)
                .set(cardData)
                .where(eq(storyCards.id, existingCards[0].id));
            } else {
              // Create new card
              console.log(`     Card ${i}: Creating new card`);
              const [newCard] = await db.insert(storyCards).values(cardData).returning();
              console.log(`     Card ${i}: Created with ID ${newCard?.id}`);
              results.cardsCreated++;
            }
          } catch (error) {
            console.error(`     Card ${i}: ERROR -`, error);
            results.errors.push(`Failed to import card ${i} for ${meta.title}: ${error}`);
          }
        }

        console.log(`   📄 Imported ${chapterData.length} cards`);
      } catch (error) {
        results.errors.push(`Failed to import chapter ${meta.key}: ${error}`);
      }
    }

    return results;
  } catch (error) {
    console.error('❌ Fatal error during chapter seeding:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedChapters()
    .then((results) => {
      console.log('\n📊 Seeding Summary:');
      console.log(`✅ ${results.chaptersCreated} chapters created`);
      console.log(`✅ ${results.cardsCreated} story cards created`);

      if (results.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered:`);
        results.errors.forEach(error => console.log(`   ${error}`));
      }

      console.log('\n✨ Chapter seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}
