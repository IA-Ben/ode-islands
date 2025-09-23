/**
 * Button Feature Flag Management System
 * 
 * Provides centralized control for unified button system rollout with:
 * - Progressive rollout capabilities
 * - A/B testing support
 * - Emergency disable mechanisms
 * - Graceful fallbacks to legacy components
 */

import { getConfig } from './config';

export interface ButtonFeatureFlagConfig {
  // Core feature flags
  enableUnifiedButtons: boolean;
  enableButtonMonitoring: boolean;
  enableEmergencyButtonDisable: boolean;
  
  // Rollout control
  rolloutPercentage: number;
  rolloutStrategy: 'percentage' | 'user-cohort' | 'environment';
  
  // Fallback behavior
  fallbackToLegacy: boolean;
  preserveLegacyActions: boolean;
  
  // Performance thresholds
  maxRenderTime: number;
  maxActionExecutionTime: number;
  errorRateThreshold: number;
}

export interface UserCohort {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  isAdmin?: boolean;
}

class ButtonFeatureFlagService {
  private config: ButtonFeatureFlagConfig;
  private emergencyDisabled: boolean = false;
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor() {
    this.config = this.loadConfiguration();
    this.setupEmergencyListener();
  }

  /**
   * Load configuration from environment and defaults
   */
  private loadConfiguration(): ButtonFeatureFlagConfig {
    const appConfig = getConfig();
    
    return {
      enableUnifiedButtons: appConfig.features.enableUnifiedButtons,
      enableButtonMonitoring: appConfig.features.enableButtonMonitoring,
      enableEmergencyButtonDisable: appConfig.features.enableEmergencyButtonDisable,
      rolloutPercentage: Math.min(100, Math.max(0, appConfig.features.buttonSystemRolloutPercentage)),
      rolloutStrategy: (process.env.BUTTON_ROLLOUT_STRATEGY as any) || 'percentage',
      fallbackToLegacy: process.env.BUTTON_FALLBACK_TO_LEGACY !== 'false',
      preserveLegacyActions: process.env.BUTTON_PRESERVE_LEGACY_ACTIONS !== 'false',
      maxRenderTime: parseInt(process.env.BUTTON_MAX_RENDER_TIME || '100', 10), // ms
      maxActionExecutionTime: parseInt(process.env.BUTTON_MAX_ACTION_TIME || '1000', 10), // ms
      errorRateThreshold: parseFloat(process.env.BUTTON_ERROR_RATE_THRESHOLD || '0.05'), // 5%
    };
  }

  /**
   * Setup emergency disable listener for runtime toggles
   */
  private setupEmergencyListener(): void {
    if (typeof window !== 'undefined') {
      // Browser environment - listen for emergency disable events
      window.addEventListener('button-emergency-disable', () => {
        this.emergencyDisabled = true;
        console.warn('🚨 Emergency button system disable activated');
      });
      
      window.addEventListener('button-emergency-enable', () => {
        this.emergencyDisabled = false;
        console.info('✅ Button system emergency disable cleared');
      });
    }
  }

  /**
   * Determine if unified buttons should be used for a user
   */
  shouldUseUnifiedButtons(cohort?: UserCohort): boolean {
    // Emergency disable check
    if (this.emergencyDisabled || !this.config.enableUnifiedButtons) {
      return false;
    }

    // Check rollout strategy
    switch (this.config.rolloutStrategy) {
      case 'percentage':
        return this.isInRolloutPercentage(cohort);
      
      case 'user-cohort':
        return this.isInUserCohort(cohort);
      
      case 'environment':
        return this.isInEnvironmentRollout();
      
      default:
        return this.isInRolloutPercentage(cohort);
    }
  }

  /**
   * Check if user is in percentage rollout
   */
  private isInRolloutPercentage(cohort?: UserCohort): boolean {
    if (this.config.rolloutPercentage >= 100) return true;
    if (this.config.rolloutPercentage <= 0) return false;

    // Use consistent hash based on session or user ID
    const identifier = cohort?.userId || cohort?.sessionId || 'anonymous';
    const hash = this.simpleHash(identifier);
    const percentage = hash % 100;
    
    return percentage < this.config.rolloutPercentage;
  }

  /**
   * Check if user is in specific cohort for testing
   */
  private isInUserCohort(cohort?: UserCohort): boolean {
    if (!cohort) return false;

    // Admin users always get new features
    if (cohort.isAdmin) return true;

    // Check specific user whitelist (if configured)
    const whitelist = process.env.BUTTON_USER_WHITELIST?.split(',') || [];
    if (cohort.userId && whitelist.includes(cohort.userId)) return true;

    // Check browser/device cohorts
    if (cohort.userAgent) {
      const isModernBrowser = /Chrome|Firefox|Safari|Edge/.test(cohort.userAgent);
      return isModernBrowser && this.config.rolloutPercentage > 50;
    }

    return false;
  }

  /**
   * Check environment-based rollout
   */
  private isInEnvironmentRollout(): boolean {
    const appConfig = getConfig();
    
    // Development: always enabled
    if (appConfig.isDevelopment) return true;
    
    // Production: check configuration
    return this.config.rolloutPercentage >= 100;
  }

  /**
   * Record performance metric for monitoring
   */
  recordPerformanceMetric(operation: string, duration: number): void {
    if (!this.config.enableButtonMonitoring) return;

    const metrics = this.performanceMetrics.get(operation) || [];
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
    
    this.performanceMetrics.set(operation, metrics);

    // Check for performance degradation
    this.checkPerformanceThresholds(operation, duration);
  }

  /**
   * Check if performance is degrading
   */
  private checkPerformanceThresholds(operation: string, duration: number): void {
    const threshold = operation.includes('render') 
      ? this.config.maxRenderTime 
      : this.config.maxActionExecutionTime;

    if (duration > threshold) {
      console.warn(`⚠️ Button ${operation} exceeded threshold: ${duration}ms > ${threshold}ms`);
      
      // Auto-disable if consistently slow
      const recentMetrics = this.performanceMetrics.get(operation)?.slice(-10) || [];
      const slowOperations = recentMetrics.filter(d => d > threshold).length;
      
      if (slowOperations >= 8) { // 80% of recent operations are slow
        this.triggerEmergencyDisable(`Performance degradation in ${operation}`);
      }
    }
  }

  /**
   * Record error for monitoring
   */
  recordError(operation: string, error: Error): void {
    if (!this.config.enableButtonMonitoring) return;

    console.error(`🔴 Button ${operation} error:`, error);

    // Track error rates (simplified implementation)
    const errorKey = `${operation}_errors`;
    const errors = this.performanceMetrics.get(errorKey) || [];
    errors.push(Date.now());
    
    // Keep only last hour of errors
    const oneHourAgo = Date.now() - 3600000;
    const recentErrors = errors.filter(timestamp => timestamp > oneHourAgo);
    this.performanceMetrics.set(errorKey, recentErrors);

    // Check error rate threshold
    const totalOperations = this.performanceMetrics.get(operation)?.length || 1;
    const errorRate = recentErrors.length / Math.max(totalOperations, 1);
    
    if (errorRate > this.config.errorRateThreshold) {
      this.triggerEmergencyDisable(`High error rate in ${operation}: ${(errorRate * 100).toFixed(1)}%`);
    }
  }

  /**
   * Trigger emergency disable of button system
   */
  triggerEmergencyDisable(reason: string): void {
    if (!this.config.enableEmergencyButtonDisable) return;

    this.emergencyDisabled = true;
    console.error(`🚨 EMERGENCY: Button system disabled due to: ${reason}`);
    
    // Dispatch event for components to react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('button-emergency-disable', { 
        detail: { reason, timestamp: Date.now() } 
      }));
    }

    // In a real application, you would also send this to monitoring systems
    this.reportToMonitoringSystem('emergency_disable', { reason, timestamp: Date.now() });
  }

  /**
   * Get current system health status
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'emergency_disabled';
    metrics: Record<string, any>;
    recommendations: string[];
  } {
    if (this.emergencyDisabled) {
      return {
        status: 'emergency_disabled',
        metrics: Object.fromEntries(this.performanceMetrics),
        recommendations: ['Re-enable after investigating issues', 'Check error logs', 'Validate configuration']
      };
    }

    const recommendations: string[] = [];
    let status: 'healthy' | 'degraded' = 'healthy';

    // Analyze performance metrics
    for (const [operation, metrics] of this.performanceMetrics) {
      if (operation.endsWith('_errors')) continue;
      
      const recentMetrics = metrics.slice(-10);
      const avgDuration = recentMetrics.reduce((a, b) => a + b, 0) / recentMetrics.length;
      
      const threshold = operation.includes('render') 
        ? this.config.maxRenderTime 
        : this.config.maxActionExecutionTime;

      if (avgDuration > threshold * 0.8) {
        status = 'degraded';
        recommendations.push(`Monitor ${operation} performance (avg: ${avgDuration.toFixed(1)}ms)`);
      }
    }

    return {
      status,
      metrics: Object.fromEntries(this.performanceMetrics),
      recommendations
    };
  }

  /**
   * Simple hash function for consistent user assignment
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Report to monitoring system (placeholder for actual implementation)
   */
  private reportToMonitoringSystem(event: string, data: any): void {
    // In production, this would send to your monitoring service
    console.info(`📊 Monitoring: ${event}`, data);
  }

  /**
   * Reset emergency state (for testing and manual recovery)
   */
  resetEmergencyState(): void {
    this.emergencyDisabled = false;
    this.performanceMetrics.clear();
    console.info('🔄 Button system emergency state reset');
  }

  /**
   * Update configuration at runtime
   */
  updateConfiguration(updates: Partial<ButtonFeatureFlagConfig>): void {
    this.config = { ...this.config, ...updates };
    console.info('⚙️ Button feature flag configuration updated', updates);
  }
}

// Singleton instance
export const buttonFeatureFlags = new ButtonFeatureFlagService();

/**
 * React hook for using button feature flags
 */
export function useButtonFeatureFlags(cohort?: UserCohort) {
  const shouldUseUnified = buttonFeatureFlags.shouldUseUnifiedButtons(cohort);
  
  return {
    shouldUseUnifiedButtons: shouldUseUnified,
    recordPerformance: buttonFeatureFlags.recordPerformanceMetric.bind(buttonFeatureFlags),
    recordError: buttonFeatureFlags.recordError.bind(buttonFeatureFlags),
    getSystemHealth: buttonFeatureFlags.getSystemHealth.bind(buttonFeatureFlags),
  };
}

/**
 * Utility to create user cohort from request/context
 */
export function createUserCohort(context: {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  isAdmin?: boolean;
}): UserCohort {
  return {
    userId: context.userId,
    sessionId: context.sessionId,
    userAgent: context.userAgent,
    isAdmin: context.isAdmin || false,
  };
}

export default buttonFeatureFlags;