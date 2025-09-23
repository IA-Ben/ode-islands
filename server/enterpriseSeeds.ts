/**
 * Enterprise Seeds - Baseline feature flags for enterprise deployment
 */

import { eq } from 'drizzle-orm';
import { db } from './db';
import { featureFlags } from '../shared/schema';
import { isEnterpriseEnabled } from './enterpriseConfig';

/**
 * Seed baseline feature flags for enterprise deployment
 */
export async function seedEnterpriseFeatureFlags(): Promise<void> {
  if (!isEnterpriseEnabled()) {
    console.info('⚠️ Skipping enterprise feature flag seeding - enterprise mode disabled');
    return;
  }

  try {
    console.info('🌱 Seeding baseline enterprise feature flags...');

    const baselineFlags = [
      {
        flagKey: 'enableUnifiedButtons',
        flagName: 'Unified Button System',
        description: 'Enable the unified button rendering and interaction system',
        category: 'feature',
        isEnabled: true,
        rolloutPercentage: 100,
        rolloutStrategy: 'percentage',
        status: 'active',
        createdBy: 'system'
      },
      {
        flagKey: 'enableButtonMonitoring',
        flagName: 'Button Performance Monitoring',
        description: 'Enable real-time monitoring of button interactions and performance',
        category: 'operational',
        isEnabled: true,
        rolloutPercentage: 100,
        rolloutStrategy: 'percentage',
        status: 'active',
        createdBy: 'system'
      },
      {
        flagKey: 'enableButtonValidation',
        flagName: 'Button Input Validation',
        description: 'Enable enhanced validation for button configurations and actions',
        category: 'feature',
        isEnabled: true,
        rolloutPercentage: 100,
        rolloutStrategy: 'percentage',
        status: 'active',
        createdBy: 'system'
      },
      {
        flagKey: 'fallbackToLegacy',
        flagName: 'Legacy Button Fallback',
        description: 'Fallback to legacy button implementation when unified system fails',
        category: 'operational',
        isEnabled: false,
        rolloutPercentage: 0,
        rolloutStrategy: 'percentage',
        status: 'active',
        createdBy: 'system'
      },
      {
        flagKey: 'globalKillSwitch',
        flagName: 'Global Emergency Kill Switch',
        description: 'Emergency disable switch for all advanced features',
        category: 'killswitch',
        isEnabled: false,
        rolloutPercentage: 0,
        rolloutStrategy: 'percentage',
        status: 'active',
        createdBy: 'system'
      }
    ];

    for (const flag of baselineFlags) {
      // Check if flag already exists
      const existingFlag = await db.select().from(featureFlags)
        .where(eq(featureFlags.flagKey, flag.flagKey))
        .limit(1);

      if (existingFlag.length === 0) {
        await db.insert(featureFlags).values(flag);
        console.info(`✅ Created feature flag: ${flag.flagKey}`);
      } else {
        console.info(`⚠️ Feature flag already exists: ${flag.flagKey}`);
      }
    }

    console.info('🎉 Enterprise feature flag seeding completed successfully');
  } catch (error) {
    console.warn('⚠️ Failed to seed enterprise feature flags:', error.message);
    console.info('📝 This is expected when enterprise tables do not exist yet');
  }
}