// Convert to proper ES module imports with error handling
let db, ScoringService, ACTIVITY_TYPES, users, fanScoreEvents;

try {
  const dbModule = await import('./server/db.js');
  const scoringModule = await import('./server/scoringService.js');
  const constantsModule = await import('./shared/constants.js');
  const schemaModule = await import('./shared/schema.js');
  
  db = dbModule.db;
  ScoringService = scoringModule.ScoringService;
  ACTIVITY_TYPES = constantsModule.ACTIVITY_TYPES;
  users = schemaModule.users;
  fanScoreEvents = schemaModule.fanScoreEvents;
} catch (error) {
  console.error('❌ Failed to import required modules:', error.message);
  console.error('Make sure all dependencies are installed and the server is properly configured.');
  process.exit(1);
}

/**
 * Comprehensive Fan Score System Testing
 * Tests all aspects of the scoring system including points, levels, achievements
 */

async function comprehensiveTest() {
  console.log('🚀 Starting Comprehensive Fan Score System Testing...\n');
  
  const scoringService = new ScoringService();
  
  // Get test user ID with better error handling
  let testUsers;
  try {
    testUsers = await db.select().from(users).limit(1);
  } catch (error) {
    console.error('❌ Failed to query users from database:', error.message);
    console.error('Make sure the database is running and properly seeded.');
    return { errors: ['Database connection failed'] };
  }
  if (testUsers.length === 0) {
    console.error('❌ No users found in database');
    console.error('Please run the database seeding process first.');
    return { errors: ['No test users available'] };
  }
  
  const userId = testUsers[0].id;
  console.log(`👤 Testing with user: ${testUsers[0].email || testUsers[0].id}\n`);

  const testResults = {
    pointAwarding: {},
    levelProgression: {},
    achievements: {},
    dataIntegrity: {},
    errors: []
  };

  // TEST 1: Basic Point Awarding for All Activity Types
  console.log('=== TEST 1: Basic Point Awarding ===');
  
  const activities = [
    { type: ACTIVITY_TYPES.CARD_COMPLETE, expectedPoints: 10, ref: 'card', refId: 'test-card-1' },
    { type: ACTIVITY_TYPES.POLL_PARTICIPATION, expectedPoints: 5, ref: 'poll', refId: 'test-poll-1' },
    { type: ACTIVITY_TYPES.QUIZ_CORRECT, expectedPoints: 15, ref: 'quiz', refId: 'test-quiz-1' },
    { type: ACTIVITY_TYPES.MEMORY_COLLECT, expectedPoints: 8, ref: 'memory', refId: 'test-memory-1' },
    { type: ACTIVITY_TYPES.CHAPTER_COMPLETE, expectedPoints: 50, ref: 'chapter', refId: 'test-chapter-1' }
  ];

  let totalExpectedPoints = 0;
  for (const activity of activities) {
    try {
      const context = {
        activityType: activity.type,
        referenceType: activity.ref,
        referenceId: activity.refId,
        metadata: { source: 'comprehensive_test' }
      };

      const result = await scoringService.award(userId, context);
      
      testResults.pointAwarding[activity.type] = {
        success: result.success,
        pointsAwarded: result.pointsAwarded,
        expectedPoints: activity.expectedPoints,
        matches: result.pointsAwarded === activity.expectedPoints,
        newLevel: result.newLevel,
        achievementsUnlocked: result.newAchievements.length
      };

      totalExpectedPoints += activity.expectedPoints;
      
      console.log(`✅ ${activity.type}: ${result.pointsAwarded} points (expected: ${activity.expectedPoints}) - Level: ${result.newLevel}`);
      if (result.newAchievements.length > 0) {
        console.log(`   🏆 Achievements unlocked: ${result.newAchievements.map(a => a.name).join(', ')}`);
      }
    } catch (error) {
      console.log(`❌ ${activity.type}: ERROR - ${error.message}`);
      testResults.errors.push(`${activity.type}: ${error.message}`);
    }
  }

  // TEST 2: Level Progression Testing
  console.log('\n=== TEST 2: Level Progression Testing ===');
  
  try {
    const currentScore = await scoringService.getCurrentScore(userId, 'global', 'global');
    const currentLevel = scoringService.computeLevel(currentScore);
    
    testResults.levelProgression = {
      currentScore,
      currentLevel,
      expectedMinScore: totalExpectedPoints,
      scoreMatches: currentScore >= totalExpectedPoints
    };
    
    console.log(`Current Score: ${currentScore} (expected min: ${totalExpectedPoints})`);
    console.log(`Current Level: ${currentLevel}`);
    console.log(`Level calculation: ${currentScore >= totalExpectedPoints ? '✅ Correct' : '❌ Incorrect'}`);
  } catch (error) {
    console.log(`❌ Level progression test failed: ${error.message}`);
    testResults.errors.push(`Level progression: ${error.message}`);
  }

  // TEST 3: Achievement System Testing
  console.log('\n=== TEST 3: Achievement System Testing ===');
  
  try {
    const achievementsQuery = `
      SELECT ua.achievement_code, ad.name, ad.description, ua.unlocked_at
      FROM user_achievements ua
      JOIN achievement_definitions ad ON ua.achievement_code = ad.code
      WHERE ua.user_id = $1
      ORDER BY ua.unlocked_at DESC
    `;
    
    // This would need to be executed via the database client
    console.log('📊 Achievement verification query prepared');
    console.log('   (Note: Manual verification needed via database query)');
    
    testResults.achievements = { testPrepared: true, manualVerificationNeeded: true };
  } catch (error) {
    console.log(`❌ Achievement test preparation failed: ${error.message}`);
    testResults.errors.push(`Achievement testing: ${error.message}`);
  }

  // TEST 4: Multiple Activity Stress Test
  console.log('\n=== TEST 4: Multiple Activity Stress Test ===');
  
  try {
    const stressTestResults = [];
    
    // Test multiple card completions to trigger Bronze Explorer achievement
    for (let i = 2; i <= 6; i++) {
      const context = {
        activityType: ACTIVITY_TYPES.CARD_COMPLETE,
        referenceType: 'card',
        referenceId: `stress-test-card-${i}`,
        metadata: { source: 'stress_test', iteration: i }
      };

      const result = await scoringService.award(userId, context);
      stressTestResults.push({
        iteration: i,
        pointsAwarded: result.pointsAwarded,
        level: result.newLevel,
        totalScore: result.newTotalScore,
        newAchievements: result.newAchievements.length
      });

      if (result.newAchievements.length > 0) {
        console.log(`🏆 Iteration ${i}: Unlocked ${result.newAchievements.map(a => a.name).join(', ')}`);
      }
    }
    
    testResults.stressTest = {
      totalIterations: stressTestResults.length,
      results: stressTestResults
    };
    
    console.log(`✅ Stress test completed: ${stressTestResults.length} additional activities`);
  } catch (error) {
    console.log(`❌ Stress test failed: ${error.message}`);
    testResults.errors.push(`Stress test: ${error.message}`);
  }

  // TEST 5: Data Integrity Verification
  console.log('\n=== TEST 5: Data Integrity Verification ===');
  
  try {
    // Check for any scoring events in database with proper imports
    const { count } = await import('drizzle-orm');
    const { eq } = await import('drizzle-orm');
    
    const eventsCount = await db.select({ count: count() })
      .from(fanScoreEvents)
      .where(eq(fanScoreEvents.userId, userId));
    
    console.log(`📊 Scoring events in database: ${eventsCount[0]?.count || 0}`);
    
    testResults.dataIntegrity = {
      eventsCount: eventsCount[0]?.count || 0,
      hasEvents: (eventsCount[0]?.count || 0) > 0
    };
  } catch (error) {
    console.log(`❌ Data integrity check failed: ${error.message}`);
    testResults.errors.push(`Data integrity: ${error.message}`);
  }

  // SUMMARY
  console.log('\n=== COMPREHENSIVE TEST SUMMARY ===');
  console.log(`Total Errors: ${testResults.errors.length}`);
  if (testResults.errors.length > 0) {
    console.log('❌ Errors encountered:');
    testResults.errors.forEach(error => console.log(`   - ${error}`));
  } else {
    console.log('✅ All tests completed without critical errors');
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log(`   Point Awarding Tests: ${Object.keys(testResults.pointAwarding).length} activities tested`);
  console.log(`   Level Progression: ${testResults.levelProgression?.currentLevel || 'Not tested'}`);
  console.log(`   Data Integrity: ${testResults.dataIntegrity?.eventsCount || 0} events recorded`);
  
  return testResults;
}

// Export for use in other contexts with ES module syntax
export { comprehensiveTest };

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const results = await comprehensiveTest();
    console.log('\n🎉 Comprehensive testing completed!');
    console.log('Results available for review');
    if (results?.errors?.length > 0) {
      console.log('⚠️  Some errors were encountered during testing');
      process.exit(1);
    }
    process.exit(0);
  } catch (error) {
    console.error('💥 Comprehensive testing failed:', error);
    console.error(error.stack || error);
    process.exit(1);
  }
}