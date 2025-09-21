import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../server/auth';
import { scoringService, type AwardContext } from '../../../../../server/scoringService';

/**
 * Achievement System Testing API
 * Allows testing various achievement scenarios
 */

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = (request as any).parsedBody || await request.json();
    const { testType, testData } = body;

    let results: Record<string, any> = {};

    switch (testType) {
      case 'award_activity':
        // Test awarding points for various activities
        const context: AwardContext = {
          activityType: testData.activityType || 'card_completion',
          referenceType: testData.referenceType || 'card',
          referenceId: testData.referenceId || 'test-card-1',
          eventId: testData.eventId,
          chapterId: testData.chapterId,
          cardIndex: testData.cardIndex,
          phase: testData.phase,
          metadata: testData.metadata || { source: 'test' }
        };

        results.awardResult = await scoringService.award(session.userId, context);
        break;

      case 'simulate_streak':
        // Simulate streak activities
        const streakDays = testData.days || 3;
        const streakResults = [];

        for (let i = 0; i < streakDays; i++) {
          const streakContext: AwardContext = {
            activityType: 'daily_login',
            referenceType: 'login',
            referenceId: `login-day-${i + 1}`,
            metadata: { source: 'streak_test', day: i + 1 }
          };

          const result = await scoringService.award(session.userId, streakContext);
          streakResults.push(result);
          
          // Small delay between activities
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        results.streakResults = streakResults;
        results.streakData = await scoringService.calculateCurrentStreak(session.userId, 'daily');
        break;

      case 'bulk_activities':
        // Test multiple activities to trigger various achievements
        const activities = testData.activities || [
          { activityType: 'card_completion', referenceType: 'card', count: 5 },
          { activityType: 'poll_participation', referenceType: 'poll', count: 3 },
          { activityType: 'quiz_correct', referenceType: 'quiz', count: 10 },
          { activityType: 'memory_collection', referenceType: 'memory', count: 2 }
        ];

        const bulkResults = [];
        for (const activity of activities) {
          for (let i = 0; i < activity.count; i++) {
            const bulkContext: AwardContext = {
              activityType: activity.activityType,
              referenceType: activity.referenceType,
              referenceId: `${activity.referenceType}-${i + 1}`,
              metadata: { source: 'bulk_test', iteration: i + 1 }
            };

            const result = await scoringService.award(session.userId, bulkContext);
            bulkResults.push({
              activity: activity.activityType,
              iteration: i + 1,
              pointsAwarded: result.pointsAwarded,
              newAchievements: result.newAchievements.length,
              newLevel: result.newLevel,
              totalScore: result.newTotalScore
            });

            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }

        results.bulkResults = bulkResults;
        break;

      case 'trigger_celebration':
        // Test special celebration notifications
        const celebrationType = testData.celebrationType || 'legendary';
        await scoringService.triggerSpecialCelebration(session.userId, celebrationType, {
          reason: 'Manual test trigger',
          timestamp: new Date().toISOString()
        });

        results.celebration = {
          triggered: true,
          type: celebrationType,
          userId: session.userId
        };
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid test type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      testType,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Achievement test error:', error);
    return NextResponse.json(
      { success: false, message: 'Test failed', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});