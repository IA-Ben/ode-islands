import { seedAchievements } from './achievementSeeds';

/**
 * Main database seeding script
 * Run this to initialize the achievement system with comprehensive data
 */
async function main() {
  try {
    console.log('🚀 Starting database seeding...');
    
    const result = await seedAchievements();
    
    console.log('\n📊 Seeding Summary:');
    console.log(`✅ ${result.achievementsCreated} achievements created/updated`);
    console.log(`✅ ${result.rulesCreated} scoring rules created/updated`);
    
    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      result.errors.forEach(error => console.log(`   ${error}`));
    } else {
      console.log('\n🎉 All data seeded successfully!');
    }
    
    console.log('\n🎯 Achievement system is now ready with:');
    console.log('   • Welcome & first-time achievements');
    console.log('   • Progressive tier achievements (Bronze/Silver/Gold)');
    console.log('   • Level and score-based achievements');
    console.log('   • Streak and consistency achievements');
    console.log('   • Social ranking achievements');
    console.log('   • Multi-condition complex achievements');
    console.log('   • Perfect score and variety achievements');
    console.log('   • Time-based achievements');
    console.log('   • Special commemorative achievements');
    
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().then(() => {
    console.log('\n✨ Database seeding completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
}

export { main as seedDatabase };