/**
 * Enterprise Feature Flag Service
 * 
 * Server-side feature flag management with database persistence,
 * real-time updates, audit logging, and emergency controls.
 */

import { eq, and, or, sql } from 'drizzle-orm';
import { db } from './db';
import { featureFlags, featureFlagAuditLog, userRoles, adminRoles } from '../shared/schema';
import { isEnterpriseEnabled, isDegradedMode, getEnterpriseStatus } from './enterpriseConfig';

export interface FeatureFlag {
  id: string;
  flagKey: string;
  flagName: string;
  description?: string;
  category: 'feature' | 'experiment' | 'operational' | 'killswitch';
  isEnabled: boolean;
  rolloutPercentage: number;
  rolloutStrategy: 'percentage' | 'user-cohort' | 'environment';
  targetConditions?: any;
  environmentRestrictions?: any;
  isEmergencyDisabled: boolean;
  emergencyDisabledAt?: Date;
  emergencyDisabledBy?: string;
  emergencyReason?: string;
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  expiresAt?: Date;
  createdBy: string;
  lastModifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCohort {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  environment?: string;
  isAdmin?: boolean;
  customAttributes?: Record<string, any>;
}

export interface FeatureFlagEvaluation {
  flagKey: string;
  enabled: boolean;
  value?: any;
  reason: string;
  source: 'database' | 'cache' | 'default';
  evaluatedAt: Date;
  cohortMatch?: boolean;
}

export interface AuditLogEntry {
  flagId: string;
  action: 'created' | 'updated' | 'enabled' | 'disabled' | 'emergency_disabled' | 'deleted';
  changedFields?: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
  source: 'admin' | 'api' | 'automation' | 'emergency';
  userId?: string;
  userEmail?: string;
  userAgent?: string;
  ipAddress?: string;
}

class EnterpriseFeatureFlagService {
  private flagCache: Map<string, FeatureFlag> = new Map();
  private lastCacheRefresh = 0;
  private cacheRefreshInterval = 30000; // 30 seconds
  private subscribers: Set<(flags: Record<string, any>) => void> = new Set();
  private emergencyKillSwitch = false;

  constructor() {
    // Check if enterprise mode is enabled
    if (!isEnterpriseEnabled()) {
      console.info('🚩 Feature flag service running in degraded mode - enterprise features disabled');
      return;
    }
    
    // Initialize with graceful error handling for missing database tables
    this.initializeCache().catch(error => {
      console.warn('⚠️ Feature flag service starting in degraded mode due to database issues:', error.message);
    });
    this.startPeriodicCacheRefresh();
  }

  /**
   * Initialize feature flag cache from database
   */
  private async initializeCache(): Promise<void> {
    try {
      const flags = await db.select().from(featureFlags)
        .where(eq(featureFlags.status, 'active'));
      
      flags.forEach(flag => {
        this.flagCache.set(flag.flagKey, flag as FeatureFlag);
      });
      
      this.lastCacheRefresh = Date.now();
      console.info(`🚩 Feature flag cache initialized with ${flags.length} flags`);
    } catch (error) {
      console.warn('⚠️ Feature flag cache initialization failed - running in degraded mode:', error.message);
      // Initialize empty cache to prevent crashes
      this.flagCache = new Map();
      this.lastCacheRefresh = Date.now();
    }
  }

  /**
   * Start periodic cache refresh
   */
  private startPeriodicCacheRefresh(): void {
    setInterval(() => {
      this.refreshCache().catch(error => {
        console.warn('⚠️ Periodic cache refresh failed:', error.message);
      });
    }, this.cacheRefreshInterval);
  }

  /**
   * Refresh cache from database
   */
  async refreshCache(): Promise<void> {
    if (!isEnterpriseEnabled()) {
      return; // Skip cache refresh in degraded mode
    }
    
    try {
      const flags = await db.select().from(featureFlags)
        .where(eq(featureFlags.status, 'active'));
      
      const newCache = new Map<string, FeatureFlag>();
      flags.forEach(flag => {
        newCache.set(flag.flagKey, flag as FeatureFlag);
      });
      
      this.flagCache = newCache;
      this.lastCacheRefresh = Date.now();
      
      // Notify subscribers of cache refresh
      this.notifySubscribers();
      
      console.info(`🔄 Feature flag cache refreshed with ${flags.length} flags`);
    } catch (error) {
      console.warn('⚠️ Feature flag cache refresh failed - keeping existing cache:', error.message);
    }
  }

  /**
   * Evaluate feature flag for a user/cohort
   */
  async evaluateFlag(flagKey: string, cohort: UserCohort = {}): Promise<FeatureFlagEvaluation> {
    // Return default disabled if enterprise mode is not enabled
    if (!isEnterpriseEnabled()) {
      return {
        flagKey,
        enabled: false,
        reason: 'enterprise_mode_disabled',
        source: 'default',
        evaluatedAt: new Date()
      };
    }
    // Check emergency kill switch
    if (this.emergencyKillSwitch) {
      return {
        flagKey,
        enabled: false,
        reason: 'emergency_kill_switch_active',
        source: 'cache',
        evaluatedAt: new Date()
      };
    }

    // Get flag from cache or database
    let flag = this.flagCache.get(flagKey);
    if (!flag) {
      try {
        const dbFlag = await db.select().from(featureFlags)
          .where(and(
            eq(featureFlags.flagKey, flagKey),
            eq(featureFlags.status, 'active')
          ))
          .limit(1);
        
        if (dbFlag.length > 0) {
          flag = dbFlag[0] as FeatureFlag;
          this.flagCache.set(flagKey, flag);
        }
      } catch (error) {
        console.error(`❌ Failed to fetch flag ${flagKey}:`, error);
      }
    }

    if (!flag) {
      return {
        flagKey,
        enabled: false,
        reason: 'flag_not_found',
        source: 'database',
        evaluatedAt: new Date()
      };
    }

    // Check if flag is emergency disabled
    if (flag.isEmergencyDisabled) {
      return {
        flagKey,
        enabled: false,
        reason: `emergency_disabled: ${flag.emergencyReason || 'manual_disable'}`,
        source: 'database',
        evaluatedAt: new Date()
      };
    }

    // Check if flag is expired
    if (flag.expiresAt && new Date() > flag.expiresAt) {
      return {
        flagKey,
        enabled: false,
        reason: 'flag_expired',
        source: 'database',
        evaluatedAt: new Date()
      };
    }

    // Base enabled check
    if (!flag.isEnabled) {
      return {
        flagKey,
        enabled: false,
        reason: 'flag_disabled',
        source: 'cache',
        evaluatedAt: new Date()
      };
    }

    // Evaluate rollout strategy
    const rolloutResult = this.evaluateRolloutStrategy(flag, cohort);
    
    return {
      flagKey,
      enabled: rolloutResult.enabled,
      reason: rolloutResult.reason,
      source: 'cache',
      evaluatedAt: new Date(),
      cohortMatch: rolloutResult.cohortMatch
    };
  }

  /**
   * Evaluate rollout strategy for a flag and cohort
   */
  private evaluateRolloutStrategy(flag: FeatureFlag, cohort: UserCohort): {
    enabled: boolean;
    reason: string;
    cohortMatch?: boolean;
  } {
    switch (flag.rolloutStrategy) {
      case 'percentage':
        return this.evaluatePercentageRollout(flag, cohort);
      
      case 'user-cohort':
        return this.evaluateUserCohortRollout(flag, cohort);
      
      case 'environment':
        return this.evaluateEnvironmentRollout(flag, cohort);
      
      default:
        return {
          enabled: flag.rolloutPercentage >= 100,
          reason: 'default_strategy'
        };
    }
  }

  /**
   * Evaluate percentage-based rollout
   */
  private evaluatePercentageRollout(flag: FeatureFlag, cohort: UserCohort): {
    enabled: boolean;
    reason: string;
  } {
    if (flag.rolloutPercentage >= 100) {
      return { enabled: true, reason: 'full_rollout' };
    }
    
    if (flag.rolloutPercentage <= 0) {
      return { enabled: false, reason: 'zero_rollout' };
    }

    // Use consistent hash based on user ID or session ID
    const identifier = cohort.userId || cohort.sessionId || 'anonymous';
    const hash = this.hashString(identifier + flag.flagKey);
    const bucket = hash % 100;
    
    const enabled = bucket < flag.rolloutPercentage;
    return {
      enabled,
      reason: enabled ? `percentage_rollout_included (${bucket}/${flag.rolloutPercentage})` : `percentage_rollout_excluded (${bucket}/${flag.rolloutPercentage})`
    };
  }

  /**
   * Evaluate user cohort rollout
   */
  private evaluateUserCohortRollout(flag: FeatureFlag, cohort: UserCohort): {
    enabled: boolean;
    reason: string;
    cohortMatch: boolean;
  } {
    if (!flag.targetConditions) {
      return { enabled: false, reason: 'no_cohort_conditions', cohortMatch: false };
    }

    try {
      const conditions = flag.targetConditions;
      
      // Admin users always get new features if specified
      if (conditions.includeAdmins && cohort.isAdmin) {
        return { enabled: true, reason: 'admin_cohort_match', cohortMatch: true };
      }

      // Check user ID whitelist
      if (conditions.userIdWhitelist && cohort.userId) {
        const isWhitelisted = conditions.userIdWhitelist.includes(cohort.userId);
        if (isWhitelisted) {
          return { enabled: true, reason: 'user_whitelist_match', cohortMatch: true };
        }
      }

      // Check environment conditions
      if (conditions.environments && cohort.environment) {
        const environmentMatch = conditions.environments.includes(cohort.environment);
        if (!environmentMatch) {
          return { enabled: false, reason: 'environment_mismatch', cohortMatch: false };
        }
      }

      // Check custom attributes
      if (conditions.customAttributes && cohort.customAttributes) {
        for (const [key, expectedValue] of Object.entries(conditions.customAttributes)) {
          const actualValue = cohort.customAttributes[key];
          if (actualValue !== expectedValue) {
            return { enabled: false, reason: `custom_attribute_mismatch: ${key}`, cohortMatch: false };
          }
        }
      }

      return { enabled: true, reason: 'cohort_conditions_met', cohortMatch: true };
    } catch (error) {
      console.error('Error evaluating cohort conditions:', error);
      return { enabled: false, reason: 'cohort_evaluation_error', cohortMatch: false };
    }
  }

  /**
   * Evaluate environment-based rollout
   */
  private evaluateEnvironmentRollout(flag: FeatureFlag, cohort: UserCohort): {
    enabled: boolean;
    reason: string;
  } {
    const environment = cohort.environment || 'production';
    
    if (flag.environmentRestrictions) {
      const allowedEnvironments = flag.environmentRestrictions.allowed || [];
      if (allowedEnvironments.length > 0 && !allowedEnvironments.includes(environment)) {
        return { enabled: false, reason: `environment_restricted: ${environment} not in [${allowedEnvironments.join(', ')}]` };
      }
      
      const blockedEnvironments = flag.environmentRestrictions.blocked || [];
      if (blockedEnvironments.includes(environment)) {
        return { enabled: false, reason: `environment_blocked: ${environment}` };
      }
    }

    // Default to percentage rollout within allowed environment
    return this.evaluatePercentageRollout(flag, cohort);
  }

  /**
   * Get multiple flags at once
   */
  async evaluateFlags(flagKeys: string[], cohort: UserCohort = {}): Promise<Record<string, FeatureFlagEvaluation>> {
    const results: Record<string, FeatureFlagEvaluation> = {};
    
    for (const flagKey of flagKeys) {
      results[flagKey] = await this.evaluateFlag(flagKey, cohort);
    }
    
    return results;
  }

  /**
   * Get all active flags for a cohort
   */
  async getAllFlags(cohort: UserCohort = {}): Promise<Record<string, FeatureFlagEvaluation>> {
    const activeFlags = Array.from(this.flagCache.keys());
    return this.evaluateFlags(activeFlags, cohort);
  }

  /**
   * Admin: Create new feature flag
   */
  async createFlag(flagData: Partial<FeatureFlag>, adminUserId: string): Promise<FeatureFlag> {
    try {
      const newFlag = await db.insert(featureFlags).values({
        flagKey: flagData.flagKey!,
        flagName: flagData.flagName!,
        description: flagData.description,
        category: flagData.category || 'feature',
        isEnabled: flagData.isEnabled || false,
        rolloutPercentage: flagData.rolloutPercentage || 0,
        rolloutStrategy: flagData.rolloutStrategy || 'percentage',
        targetConditions: flagData.targetConditions,
        environmentRestrictions: flagData.environmentRestrictions,
        status: flagData.status || 'active',
        expiresAt: flagData.expiresAt,
        createdBy: adminUserId
      }).returning();

      const flag = newFlag[0] as FeatureFlag;
      
      // Add to cache
      this.flagCache.set(flag.flagKey, flag);
      
      // Log the action
      await this.auditLog({
        flagId: flag.id,
        action: 'created',
        newValues: flag,
        reason: 'Flag created via admin API',
        source: 'admin',
        userId: adminUserId
      });
      
      // Notify subscribers
      this.notifySubscribers();
      
      console.info(`🚩 Feature flag created: ${flag.flagKey}`);
      return flag;
    } catch (error) {
      console.error('❌ Failed to create feature flag:', error);
      throw error;
    }
  }

  /**
   * Admin: Update feature flag
   */
  async updateFlag(flagKey: string, updates: Partial<FeatureFlag>, adminUserId: string, reason?: string): Promise<FeatureFlag> {
    try {
      const existing = await db.select().from(featureFlags)
        .where(eq(featureFlags.flagKey, flagKey))
        .limit(1);
      
      if (existing.length === 0) {
        throw new Error(`Feature flag not found: ${flagKey}`);
      }
      
      const oldFlag = existing[0] as FeatureFlag;
      
      const updated = await db.update(featureFlags)
        .set({
          ...updates,
          lastModifiedBy: adminUserId,
          updatedAt: new Date()
        })
        .where(eq(featureFlags.flagKey, flagKey))
        .returning();
      
      const newFlag = updated[0] as FeatureFlag;
      
      // Update cache
      this.flagCache.set(flagKey, newFlag);
      
      // Log the action
      await this.auditLog({
        flagId: newFlag.id,
        action: 'updated',
        changedFields: Object.keys(updates),
        oldValues: oldFlag,
        newValues: newFlag,
        reason: reason || 'Flag updated via admin API',
        source: 'admin',
        userId: adminUserId
      });
      
      // Notify subscribers
      this.notifySubscribers();
      
      console.info(`🚩 Feature flag updated: ${flagKey}`);
      return newFlag;
    } catch (error) {
      console.error('❌ Failed to update feature flag:', error);
      throw error;
    }
  }

  /**
   * Admin: Emergency disable flag
   */
  async emergencyDisableFlag(flagKey: string, reason: string, adminUserId: string, adminEmail?: string): Promise<void> {
    try {
      await db.update(featureFlags)
        .set({
          isEmergencyDisabled: true,
          emergencyDisabledAt: new Date(),
          emergencyDisabledBy: adminUserId,
          emergencyReason: reason,
          lastModifiedBy: adminUserId,
          updatedAt: new Date()
        })
        .where(eq(featureFlags.flagKey, flagKey));
      
      // Remove from cache to force re-evaluation
      this.flagCache.delete(flagKey);
      
      // Log the emergency action
      await this.auditLog({
        flagId: flagKey, // Using flagKey as identifier for emergency logs
        action: 'emergency_disabled',
        newValues: { isEmergencyDisabled: true, emergencyReason: reason },
        reason: `EMERGENCY DISABLE: ${reason}`,
        source: 'emergency',
        userId: adminUserId,
        userEmail: adminEmail
      });
      
      // Notify all subscribers immediately
      this.notifySubscribers();
      
      console.warn(`🚨 EMERGENCY DISABLE: Feature flag ${flagKey} disabled by ${adminEmail || adminUserId}. Reason: ${reason}`);
    } catch (error) {
      console.error('❌ Failed to emergency disable feature flag:', error);
      throw error;
    }
  }

  /**
   * Admin: Activate global kill switch
   */
  async activateGlobalKillSwitch(reason: string, adminUserId: string, adminEmail?: string): Promise<void> {
    this.emergencyKillSwitch = true;
    
    // Log the global kill switch activation
    await this.auditLog({
      flagId: 'GLOBAL_KILL_SWITCH',
      action: 'emergency_disabled',
      newValues: { globalKillSwitch: true },
      reason: `GLOBAL KILL SWITCH ACTIVATED: ${reason}`,
      source: 'emergency',
      userId: adminUserId,
      userEmail: adminEmail
    });
    
    // Notify all subscribers immediately
    this.notifySubscribers();
    
    console.error(`🚨 GLOBAL KILL SWITCH ACTIVATED by ${adminEmail || adminUserId}. Reason: ${reason}`);
    console.error('🚨 ALL FEATURE FLAGS ARE NOW DISABLED');
  }

  /**
   * Admin: Deactivate global kill switch
   */
  async deactivateGlobalKillSwitch(adminUserId: string, adminEmail?: string): Promise<void> {
    this.emergencyKillSwitch = false;
    
    await this.auditLog({
      flagId: 'GLOBAL_KILL_SWITCH',
      action: 'enabled',
      newValues: { globalKillSwitch: false },
      reason: 'Global kill switch deactivated',
      source: 'admin',
      userId: adminUserId,
      userEmail: adminEmail
    });
    
    this.notifySubscribers();
    
    console.info(`✅ Global kill switch deactivated by ${adminEmail || adminUserId}`);
  }

  /**
   * Subscribe to flag changes for real-time updates
   */
  subscribe(callback: (flags: Record<string, any>) => void): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of flag changes
   */
  private notifySubscribers(): void {
    const flagSummary: Record<string, any> = {};
    
    for (const [key, flag] of this.flagCache.entries()) {
      flagSummary[key] = {
        enabled: flag.isEnabled && !flag.isEmergencyDisabled && !this.emergencyKillSwitch,
        rolloutPercentage: flag.rolloutPercentage,
        emergencyDisabled: flag.isEmergencyDisabled,
        lastUpdated: flag.updatedAt
      };
    }
    
    flagSummary['_meta'] = {
      globalKillSwitch: this.emergencyKillSwitch,
      lastRefresh: this.lastCacheRefresh
    };
    
    this.subscribers.forEach(callback => {
      try {
        callback(flagSummary);
      } catch (error) {
        console.error('Error notifying flag subscriber:', error);
      }
    });
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    flagCount: number;
    cacheAge: number;
    globalKillSwitch: boolean;
    emergencyFlags: number;
  } {
    const now = Date.now();
    const cacheAge = now - this.lastCacheRefresh;
    const emergencyFlags = Array.from(this.flagCache.values())
      .filter(flag => flag.isEmergencyDisabled).length;
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (this.emergencyKillSwitch) {
      status = 'critical';
    } else if (cacheAge > 60000 || emergencyFlags > 0) {
      status = 'degraded';
    }
    
    return {
      status,
      flagCount: this.flagCache.size,
      cacheAge,
      globalKillSwitch: this.emergencyKillSwitch,
      emergencyFlags
    };
  }

  /**
   * Create audit log entry
   */
  private async auditLog(entry: AuditLogEntry): Promise<void> {
    try {
      await db.insert(featureFlagAuditLog).values({
        flagId: entry.flagId,
        action: entry.action,
        changedFields: entry.changedFields,
        oldValues: entry.oldValues,
        newValues: entry.newValues,
        reason: entry.reason,
        source: entry.source,
        userId: entry.userId,
        userEmail: entry.userEmail,
        userAgent: entry.userAgent,
        ipAddress: entry.ipAddress
      });
    } catch (error) {
      console.error('❌ Failed to create audit log entry:', error);
    }
  }

  /**
   * Simple hash function for consistent bucketing
   */
  private hashString(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash);
  }
}

// Export singleton instance
export const featureFlagService = new EnterpriseFeatureFlagService();
export default featureFlagService;