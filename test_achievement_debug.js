/**
 * Debug script to test achievement evaluation logic
 * This will help identify why achievements aren't being triggered
 */

import { scoringService } from './server/scoringService.js';
import { db } from './server/db.js';
import { 
  achievementDefinitions,
  userAchievements,
  fanScoreEvents,
  userFanScores 
} from './shared/schema.js';
import { eq, and } from 'drizzle-orm';

const TEST_USER_ID = 'ben-admin-user';

async function debugAchievements() {
  console.log('🔍 DEBUGGING ACHIEVEMENT SYSTEM');
  console.log('================================');
  
  try {
    // 1. Check user's scoring events
    console.log('\n1. USER SCORING EVENTS:');
    const scoreEvents = await db
      .select()
      .from(fanScoreEvents)
      .where(eq(fanScoreEvents.userId, TEST_USER_ID))
      .orderBy(fanScoreEvents.createdAt);
    
    console.log(`Found ${scoreEvents.length} scoring events:`);
    scoreEvents.forEach(event => {
      console.log(`  - ${event.activityType}: ${event.points} pts (${event.createdAt})`);
    });

    // 2. Check user's current achievements
    console.log('\n2. USER CURRENT ACHIEVEMENTS:');
    const currentAchievements = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, TEST_USER_ID));
    
    console.log(`User has ${currentAchievements.length} achievements`);

    // 3. Check user's total score
    console.log('\n3. USER TOTAL SCORE:');
    const userScore = await db
      .select()
      .from(userFanScores)
      .where(
        and(
          eq(userFanScores.userId, TEST_USER_ID),
          eq(userFanScores.scopeType, 'global'),
          eq(userFanScores.scopeId, 'global')
        )
      );
    
    const totalScore = userScore[0]?.totalScore || 0;
    console.log(`User total score: ${totalScore}`);

    // 4. Test achievement evaluation manually
    console.log('\n4. MANUAL ACHIEVEMENT EVALUATION:');
    console.log('Calling evaluateAchievements manually...');
    
    const newAchievements = await scoringService.evaluateAchievements(TEST_USER_ID, totalScore);
    console.log(`Manual evaluation returned ${newAchievements.length} new achievements:`);
    newAchievements.forEach(achievement => {
      console.log(`  - ${achievement.code}: ${achievement.name} (+${achievement.pointsBonus} pts)`);
    });

    // 5. Test specific achievement criteria
    console.log('\n5. TESTING SPECIFIC CRITERIA:');
    
    // Get the FIRST_STEPS achievement
    const [firstStepsAchievement] = await db
      .select()
      .from(achievementDefinitions)
      .where(eq(achievementDefinitions.code, 'FIRST_STEPS'));
    
    if (firstStepsAchievement) {
      console.log(`Testing FIRST_STEPS criteria: ${JSON.stringify(firstStepsAchievement.criteria)}`);
      
      // Manually test the first achievement logic
      const cardCompleteCount = scoreEvents.filter(e => e.activityType === 'card_complete').length;
      console.log(`User has ${cardCompleteCount} card_complete events`);
      console.log(`Should FIRST_STEPS be awarded? ${cardCompleteCount >= 1 ? 'YES' : 'NO'}`);
    }

    // Test EXPLORER_BRONZE achievement  
    const [explorerBronzeAchievement] = await db
      .select()
      .from(achievementDefinitions) 
      .where(eq(achievementDefinitions.code, 'EXPLORER_BRONZE'));
    
    if (explorerBronzeAchievement) {
      console.log(`Testing EXPLORER_BRONZE criteria: ${JSON.stringify(explorerBronzeAchievement.criteria)}`);
      
      const cardCompleteCount = scoreEvents.filter(e => e.activityType === 'card_complete').length;
      console.log(`User has ${cardCompleteCount} card_complete events`);
      console.log(`Should EXPLORER_BRONZE be awarded? ${cardCompleteCount >= 5 ? 'YES' : 'NO'}`);
    }

    // Test QUIZ_MASTER_BEGINNER achievement
    const [quizMasterAchievement] = await db
      .select()
      .from(achievementDefinitions)
      .where(eq(achievementDefinitions.code, 'QUIZ_MASTER_BEGINNER'));
    
    if (quizMasterAchievement) {
      console.log(`Testing QUIZ_MASTER_BEGINNER criteria: ${JSON.stringify(quizMasterAchievement.criteria)}`);
      
      const quizCorrectCount = scoreEvents.filter(e => e.activityType === 'quiz_correct').length;
      console.log(`User has ${quizCorrectCount} quiz_correct events`);
      console.log(`Should QUIZ_MASTER_BEGINNER be awarded? ${quizCorrectCount >= 1 ? 'YES' : 'NO'}`);
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
    console.error(error.stack);
  }
}

// Run the debug function
debugAchievements()
  .then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });