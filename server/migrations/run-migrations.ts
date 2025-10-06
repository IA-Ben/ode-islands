import { migrateStoryCards } from './migrate-story-cards';
import { seedEventCards } from './seed-event-cards';

async function runMigrations() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('        Unified Cards System Migration Runner          ');
  console.log('═══════════════════════════════════════════════════════\n');

  const startTime = Date.now();
  let totalMigrated = 0;
  let totalSeeded = 0;
  const errors: string[] = [];

  console.log('Step 1: Migrating story cards to unified cards system...');
  console.log('───────────────────────────────────────────────────────\n');
  
  const storyCardsResult = await migrateStoryCards();
  
  if (storyCardsResult.success) {
    totalMigrated = storyCardsResult.migratedCount;
    console.log(`\n✓ Story cards migration completed: ${totalMigrated} cards migrated\n`);
  } else {
    console.error(`\n✗ Story cards migration failed: ${storyCardsResult.error}\n`);
    errors.push(`Story cards migration: ${storyCardsResult.error}`);
  }

  console.log('Step 2: Seeding event cards from hardcoded data...');
  console.log('───────────────────────────────────────────────────────\n');
  
  const eventCardsResult = await seedEventCards();
  
  if (eventCardsResult.success) {
    totalSeeded = eventCardsResult.seededCount;
    console.log(`\n✓ Event cards seeding completed: ${totalSeeded} cards seeded\n`);
  } else {
    console.error(`\n✗ Event cards seeding failed: ${eventCardsResult.error}\n`);
    errors.push(`Event cards seeding: ${eventCardsResult.error}`);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('═══════════════════════════════════════════════════════');
  console.log('                  Migration Summary                    ');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Story cards migrated:     ${totalMigrated}`);
  console.log(`Event cards seeded:       ${totalSeeded}`);
  console.log(`Total cards created:      ${totalMigrated + totalSeeded}`);
  console.log(`Duration:                 ${duration}s`);
  
  if (errors.length > 0) {
    console.log(`\nErrors encountered:       ${errors.length}`);
    errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
    console.log('\n⚠ Migration completed with errors');
  } else {
    console.log('\n✓ All migrations completed successfully!');
  }
  
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(errors.length > 0 ? 1 : 0);
}

if (require.main === module) {
  runMigrations().catch(error => {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  });
}

export { runMigrations };
