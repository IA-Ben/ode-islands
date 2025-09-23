/**
 * Enterprise Rollback Service
 * 
 * Global rollback system with audit logging, automated execution,
 * and cross-user propagation for enterprise deployment safety.
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from './db';
import { rollbackEvents, systemHealth } from '../shared/schema';
import { featureFlagService } from './featureFlagService';
import { metricsService } from './metricsService';
import { isEnterpriseEnabled, isDegradedMode, getEnterpriseStatus } from './enterpriseConfig';

export interface RollbackEvent {
  id: string;
  rollbackType: 'emergency' | 'planned' | 'gradual' | 'partial';
  scope: 'global' | 'feature' | 'user-cohort' | 'environment';
  targetComponent?: string;
  trigger: 'manual' | 'automated' | 'threshold-breach' | 'health-check-failure';
  triggerData?: any;
  status: 'initiated' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  executionPlan?: any;
  executionProgress?: any;
  initiatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  success?: boolean;
  errorMessage?: string;
  rollbackSummary?: any;
  affectedUsers?: number;
  initiatedBy: string;
  initiatedByEmail?: string;
  reason: string;
  environment: string;
  version?: string;
}

export interface RollbackPlan {
  id: string;
  name: string;
  description: string;
  steps: RollbackStep[];
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  prerequisites: string[];
  validationChecks: string[];
}

export interface RollbackStep {
  id: string;
  name: string;
  description: string;
  type: 'feature_flag' | 'config_change' | 'service_restart' | 'data_rollback' | 'notification';
  parameters: any;
  estimatedDuration: number;
  critical: boolean;
  rollbackAction?: any;
  validationQuery?: string;
  dependencies?: string[];
}

export interface RollbackExecution {
  rollbackId: string;
  currentStep: number;
  totalSteps: number;
  executedSteps: string[];
  failedSteps: string[];
  startTime: Date;
  estimatedCompletion: Date;
  progress: number; // 0-100
  status: 'running' | 'completed' | 'failed' | 'paused';
  errors: string[];
}

class EnterpriseRollbackService {
  private activeRollbacks: Map<string, RollbackExecution> = new Map();
  private rollbackPlans: Map<string, RollbackPlan> = new Map();
  private executionQueue: string[] = [];
  private isExecuting = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeRollbackPlans();
    this.startHealthMonitoring();
  }

  /**
   * Initialize predefined rollback plans
   */
  private initializeRollbackPlans(): void {
    // Emergency Button System Rollback Plan
    const emergencyButtonRollback: RollbackPlan = {
      id: 'emergency-button-rollback',
      name: 'Emergency Button System Rollback',
      description: 'Complete rollback of unified button system to legacy implementation',
      estimatedDuration: 300, // 5 minutes
      riskLevel: 'high',
      prerequisites: ['admin_access', 'database_access'],
      validationChecks: ['legacy_buttons_functional', 'no_critical_errors'],
      steps: [
        {
          id: 'disable-unified-buttons',
          name: 'Disable Unified Button Features',
          description: 'Disable all unified button feature flags',
          type: 'feature_flag',
          parameters: {
            flagsToDisable: ['enableUnifiedButtons', 'enableButtonMonitoring', 'enableButtonValidation'],
            emergencyDisable: true
          },
          estimatedDuration: 30,
          critical: true
        },
        {
          id: 'activate-legacy-fallbacks',
          name: 'Activate Legacy Button Fallbacks',
          description: 'Ensure all components fall back to legacy button implementations',
          type: 'feature_flag',
          parameters: {
            flagsToEnable: ['fallbackToLegacy', 'preserveLegacyActions'],
            rolloutPercentage: 100
          },
          estimatedDuration: 60,
          critical: true,
          dependencies: ['disable-unified-buttons']
        },
        {
          id: 'validate-legacy-functionality',
          name: 'Validate Legacy Button Functionality',
          description: 'Run automated tests to ensure legacy buttons work correctly',
          type: 'config_change',
          parameters: {
            validationEndpoint: '/api/admin/validate-legacy-buttons',
            requiredSuccessRate: 95
          },
          estimatedDuration: 120,
          critical: true,
          dependencies: ['activate-legacy-fallbacks']
        },
        {
          id: 'notify-stakeholders',
          name: 'Notify Stakeholders',
          description: 'Send notifications about the rollback completion',
          type: 'notification',
          parameters: {
            channels: ['email', 'slack'],
            recipients: ['engineering-team', 'product-team', 'support-team'],
            template: 'emergency_rollback_complete'
          },
          estimatedDuration: 30,
          critical: false,
          dependencies: ['validate-legacy-functionality']
        },
        {
          id: 'create-incident-report',
          name: 'Create Incident Report',
          description: 'Generate detailed incident report for post-mortem',
          type: 'data_rollback',
          parameters: {
            reportType: 'emergency_rollback',
            includeMetrics: true,
            includeLogs: true,
            timeRange: '1h'
          },
          estimatedDuration: 60,
          critical: false
        }
      ]
    };

    // Global System Rollback Plan
    const globalSystemRollback: RollbackPlan = {
      id: 'global-system-rollback',
      name: 'Global System Rollback',
      description: 'Complete system rollback affecting all features and users',
      estimatedDuration: 600, // 10 minutes
      riskLevel: 'critical',
      prerequisites: ['admin_access', 'database_access', 'system_admin_approval'],
      validationChecks: ['all_services_healthy', 'database_consistent', 'no_data_loss'],
      steps: [
        {
          id: 'activate-global-killswitch',
          name: 'Activate Global Kill Switch',
          description: 'Disable all feature flags globally',
          type: 'feature_flag',
          parameters: {
            globalKillSwitch: true,
            reason: 'Emergency global rollback'
          },
          estimatedDuration: 30,
          critical: true
        },
        {
          id: 'rollback-all-features',
          name: 'Rollback All Features',
          description: 'Systematically disable all non-critical features',
          type: 'feature_flag',
          parameters: {
            rollbackStrategy: 'progressive',
            preserveCriticalFeatures: ['authentication', 'basic_navigation', 'core_content']
          },
          estimatedDuration: 180,
          critical: true,
          dependencies: ['activate-global-killswitch']
        },
        {
          id: 'validate-core-functionality',
          name: 'Validate Core System Functionality',
          description: 'Ensure core system functions remain operational',
          type: 'config_change',
          parameters: {
            coreValidationSuite: true,
            minimumSuccessRate: 98
          },
          estimatedDuration: 240,
          critical: true,
          dependencies: ['rollback-all-features']
        },
        {
          id: 'emergency-broadcast',
          name: 'Emergency Broadcast to All Users',
          description: 'Inform users of temporary service limitations',
          type: 'notification',
          parameters: {
            broadcast: true,
            urgency: 'high',
            channels: ['in-app', 'email', 'sms'],
            message: 'service_maintenance_emergency'
          },
          estimatedDuration: 60,
          critical: false
        },
        {
          id: 'escalate-to-leadership',
          name: 'Escalate to Leadership',
          description: 'Notify executive team of global rollback',
          type: 'notification',
          parameters: {
            escalationLevel: 'executive',
            severity: 'critical',
            requireAcknowledgment: true
          },
          estimatedDuration: 90,
          critical: false
        }
      ]
    };

    this.rollbackPlans.set(emergencyButtonRollback.id, emergencyButtonRollback);
    this.rollbackPlans.set(globalSystemRollback.id, globalSystemRollback);

    console.info(`🔄 Initialized ${this.rollbackPlans.size} rollback plans`);
  }

  /**
   * Start health monitoring for automatic rollback triggers
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkHealthTriggers().catch(console.error);
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check if health metrics should trigger automatic rollback
   */
  private async checkHealthTriggers(): Promise<void> {
    if (!isEnterpriseEnabled()) {
      return; // Skip health monitoring in degraded mode
    }
    
    try {
      const systemHealth = await metricsService.getSystemHealth();
      const flagHealth = featureFlagService.getSystemHealth();

      // Trigger emergency rollback if critical thresholds are breached
      if (systemHealth.criticalAlerts > 2 && systemHealth.overall === 'critical') {
        console.warn('🚨 Critical health threshold breached - considering automatic rollback');
        
        // Check if automatic rollback is enabled (would be a config setting)
        const autoRollbackEnabled = process.env.AUTO_ROLLBACK_ENABLED === 'true';
        if (autoRollbackEnabled) {
          await this.initiateAutomaticRollback(
            'critical_health_threshold_breached',
            'global',
            undefined,
            'system',
            { systemHealth, flagHealth }
          );
        }
      }

      // Record health status
      await this.recordSystemHealth(systemHealth, flagHealth);
    } catch (error) {
      console.error('❌ Health monitoring check failed:', error);
    }
  }

  /**
   * Record system health status
   */
  private async recordSystemHealth(metricsHealth: any, flagHealth: any): Promise<void> {
    if (!isEnterpriseEnabled()) {
      return; // Skip health recording in degraded mode
    }
    
    try {
      await db.insert(systemHealth).values({
        component: 'overall_system',
        healthCheckName: 'automated_health_check',
        status: metricsHealth.overall === 'healthy' && flagHealth.status === 'healthy' ? 'healthy' : 
               metricsHealth.overall === 'critical' || flagHealth.status === 'critical' ? 'critical' : 'warning',
        healthScore: Math.min(metricsHealth.score, 100).toString(),
        checkResults: {
          metrics: metricsHealth,
          featureFlags: flagHealth
        },
        responseTime: 0, // Health check response time
        environment: 'production'
      });
    } catch (error) {
      console.error('❌ Failed to record system health:', error);
    }
  }

  /**
   * Initiate emergency rollback manually
   */
  async initiateEmergencyRollback(
    reason: string,
    scope: 'global' | 'feature' | 'user-cohort' | 'environment' = 'global',
    targetComponent?: string,
    initiatedBy?: string,
    initiatedByEmail?: string
  ): Promise<RollbackEvent> {
    try {
      const rollbackEvent = await this.createRollbackEvent({
        rollbackType: 'emergency',
        scope,
        targetComponent,
        trigger: 'manual',
        triggerData: { reason, initiatedBy, initiatedByEmail },
        reason,
        initiatedBy: initiatedBy || 'system',
        initiatedByEmail,
        environment: 'production'
      });

      // Execute rollback
      await this.executeRollback(rollbackEvent.id);

      console.warn(`🚨 Emergency rollback initiated: ${reason}`);
      return rollbackEvent;
    } catch (error) {
      console.error('❌ Failed to initiate emergency rollback:', error);
      throw error;
    }
  }

  /**
   * Initiate automatic rollback triggered by health checks
   */
  private async initiateAutomaticRollback(
    reason: string,
    scope: 'global' | 'feature' | 'user-cohort' | 'environment',
    targetComponent?: string,
    trigger?: string,
    triggerData?: any
  ): Promise<RollbackEvent> {
    const rollbackEvent = await this.createRollbackEvent({
      rollbackType: 'emergency',
      scope,
      targetComponent,
      trigger: (trigger as any) || 'threshold-breach',
      triggerData: { ...triggerData, automated: true },
      reason: `AUTOMATIC ROLLBACK: ${reason}`,
      initiatedBy: 'system',
      initiatedByEmail: 'system@company.com',
      environment: 'production'
    });

    // Execute rollback immediately
    await this.executeRollback(rollbackEvent.id);

    console.error(`🤖 Automatic rollback initiated: ${reason}`);
    return rollbackEvent;
  }

  /**
   * Create rollback event record
   */
  private async createRollbackEvent(data: Partial<RollbackEvent>): Promise<RollbackEvent> {
    const rollbackEvent = await db.insert(rollbackEvents).values({
      rollbackType: data.rollbackType!,
      scope: data.scope!,
      targetComponent: data.targetComponent,
      trigger: data.trigger!,
      triggerData: data.triggerData,
      status: 'initiated',
      executionPlan: this.createExecutionPlan(data.scope!, data.targetComponent),
      reason: data.reason!,
      initiatedBy: data.initiatedBy!,
      initiatedByEmail: data.initiatedByEmail,
      environment: data.environment || 'production'
    }).returning();

    return rollbackEvent[0] as RollbackEvent;
  }

  /**
   * Create execution plan based on scope and target
   */
  private createExecutionPlan(scope: string, targetComponent?: string): any {
    if (scope === 'global') {
      return {
        planId: 'global-system-rollback',
        steps: this.rollbackPlans.get('global-system-rollback')?.steps || []
      };
    } else if (targetComponent === 'buttons' || targetComponent === 'button-system') {
      return {
        planId: 'emergency-button-rollback',
        steps: this.rollbackPlans.get('emergency-button-rollback')?.steps || []
      };
    } else {
      // Generic rollback plan
      return {
        planId: 'generic-rollback',
        steps: [
          {
            id: 'emergency-disable-features',
            name: 'Emergency Disable Target Features',
            type: 'feature_flag',
            parameters: { targetComponent, emergencyDisable: true }
          },
          {
            id: 'validate-rollback',
            name: 'Validate Rollback Success',
            type: 'config_change',
            parameters: { validationRequired: true }
          }
        ]
      };
    }
  }

  /**
   * Execute rollback plan
   */
  private async executeRollback(rollbackId: string): Promise<void> {
    try {
      // Get rollback event
      const rollbackEvents_result = await db.select().from(rollbackEvents)
        .where(eq(rollbackEvents.id, rollbackId))
        .limit(1);

      if (rollbackEvents_result.length === 0) {
        throw new Error(`Rollback event not found: ${rollbackId}`);
      }

      const rollbackEvent = rollbackEvents_result[0] as RollbackEvent;
      const plan = rollbackEvent.executionPlan;

      if (!plan || !plan.steps) {
        throw new Error(`No execution plan found for rollback: ${rollbackId}`);
      }

      // Start execution
      await db.update(rollbackEvents)
        .set({ 
          status: 'in-progress',
          startedAt: new Date()
        })
        .where(eq(rollbackEvents.id, rollbackId));

      const execution: RollbackExecution = {
        rollbackId,
        currentStep: 0,
        totalSteps: plan.steps.length,
        executedSteps: [],
        failedSteps: [],
        startTime: new Date(),
        estimatedCompletion: new Date(Date.now() + (plan.estimatedDuration || 300) * 1000),
        progress: 0,
        status: 'running',
        errors: []
      };

      this.activeRollbacks.set(rollbackId, execution);

      // Execute steps sequentially
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        execution.currentStep = i;
        execution.progress = Math.round((i / plan.steps.length) * 100);

        try {
          console.info(`🔄 Executing rollback step ${i + 1}/${plan.steps.length}: ${step.name}`);
          await this.executeRollbackStep(step, rollbackEvent);
          execution.executedSteps.push(step.id);
        } catch (error) {
          const errorMessage = (error as Error).message;
          console.error(`❌ Rollback step failed: ${step.name}`, error);
          
          execution.failedSteps.push(step.id);
          execution.errors.push(`Step ${step.name}: ${errorMessage}`);

          // If critical step fails, abort rollback
          if (step.critical) {
            execution.status = 'failed';
            await this.completeRollback(rollbackId, false, `Critical step failed: ${step.name}`);
            return;
          }
        }
      }

      // Mark rollback as completed
      execution.status = 'completed';
      execution.progress = 100;
      await this.completeRollback(rollbackId, true);

    } catch (error) {
      console.error(`❌ Rollback execution failed: ${rollbackId}`, error);
      await this.completeRollback(rollbackId, false, (error as Error).message);
    }
  }

  /**
   * Execute individual rollback step
   */
  private async executeRollbackStep(step: RollbackStep, rollbackEvent: RollbackEvent): Promise<void> {
    switch (step.type) {
      case 'feature_flag':
        await this.executeFeatureFlagStep(step, rollbackEvent);
        break;
      
      case 'config_change':
        await this.executeConfigChangeStep(step, rollbackEvent);
        break;
      
      case 'service_restart':
        await this.executeServiceRestartStep(step, rollbackEvent);
        break;
      
      case 'notification':
        await this.executeNotificationStep(step, rollbackEvent);
        break;
      
      case 'data_rollback':
        await this.executeDataRollbackStep(step, rollbackEvent);
        break;
      
      default:
        console.warn(`Unknown rollback step type: ${step.type}`);
    }

    // Wait for step duration if specified
    if (step.estimatedDuration > 0) {
      await new Promise(resolve => setTimeout(resolve, Math.min(step.estimatedDuration * 100, 5000)));
    }
  }

  /**
   * Execute feature flag rollback step
   */
  private async executeFeatureFlagStep(step: RollbackStep, rollbackEvent: RollbackEvent): Promise<void> {
    const params = step.parameters;

    if (params.globalKillSwitch) {
      await featureFlagService.activateGlobalKillSwitch(
        rollbackEvent.reason,
        rollbackEvent.initiatedBy,
        rollbackEvent.initiatedByEmail
      );
    }

    if (params.flagsToDisable) {
      for (const flagKey of params.flagsToDisable) {
        if (params.emergencyDisable) {
          await featureFlagService.emergencyDisableFlag(
            flagKey,
            `Rollback: ${rollbackEvent.reason}`,
            rollbackEvent.initiatedBy,
            rollbackEvent.initiatedByEmail
          );
        } else {
          await featureFlagService.updateFlag(
            flagKey,
            { isEnabled: false },
            rollbackEvent.initiatedBy,
            `Rollback: ${rollbackEvent.reason}`
          );
        }
      }
    }

    if (params.flagsToEnable) {
      for (const flagKey of params.flagsToEnable) {
        await featureFlagService.updateFlag(
          flagKey,
          { 
            isEnabled: true,
            rolloutPercentage: params.rolloutPercentage || 100
          },
          rollbackEvent.initiatedBy,
          `Rollback: ${rollbackEvent.reason}`
        );
      }
    }
  }

  /**
   * Execute config change step
   */
  private async executeConfigChangeStep(step: RollbackStep, rollbackEvent: RollbackEvent): Promise<void> {
    const params = step.parameters;

    if (params.validationEndpoint) {
      // Make HTTP request to validation endpoint
      try {
        const response = await fetch(`http://localhost:5000${params.validationEndpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rollbackId: rollbackEvent.id })
        });

        if (!response.ok) {
          throw new Error(`Validation endpoint returned ${response.status}`);
        }

        const result = await response.json();
        if (params.requiredSuccessRate && result.successRate < params.requiredSuccessRate) {
          throw new Error(`Validation failed: success rate ${result.successRate}% below required ${params.requiredSuccessRate}%`);
        }
      } catch (error) {
        throw new Error(`Validation failed: ${(error as Error).message}`);
      }
    }

    if (params.coreValidationSuite) {
      // Run core system validation
      const healthCheck = await metricsService.getSystemHealth();
      const flagHealthCheck = featureFlagService.getSystemHealth();
      
      if (healthCheck.overall === 'critical' || flagHealthCheck.status === 'critical') {
        throw new Error('Core system validation failed - system still in critical state');
      }
    }
  }

  /**
   * Execute service restart step
   */
  private async executeServiceRestartStep(step: RollbackStep, rollbackEvent: RollbackEvent): Promise<void> {
    // TODO: Implement service restart logic
    console.info(`Would restart services: ${JSON.stringify(step.parameters)}`);
  }

  /**
   * Execute notification step
   */
  private async executeNotificationStep(step: RollbackStep, rollbackEvent: RollbackEvent): Promise<void> {
    const params = step.parameters;
    
    // Log notification (in production, would send actual notifications)
    console.info(`📢 ROLLBACK NOTIFICATION: ${rollbackEvent.reason}`);
    console.info(`Channels: ${params.channels?.join(', ')}`);
    console.info(`Recipients: ${params.recipients?.join(', ')}`);
    
    if (params.escalationLevel === 'executive') {
      console.error(`🚨 EXECUTIVE ESCALATION: Global rollback in progress - ${rollbackEvent.reason}`);
    }
  }

  /**
   * Execute data rollback step
   */
  private async executeDataRollbackStep(step: RollbackStep, rollbackEvent: RollbackEvent): Promise<void> {
    // TODO: Implement data rollback logic
    console.info(`Would perform data rollback: ${JSON.stringify(step.parameters)}`);
  }

  /**
   * Complete rollback execution
   */
  private async completeRollback(rollbackId: string, success: boolean, errorMessage?: string): Promise<void> {
    const execution = this.activeRollbacks.get(rollbackId);
    const completedAt = new Date();
    let actualDuration = 0;

    if (execution) {
      actualDuration = Math.round((completedAt.getTime() - execution.startTime.getTime()) / 1000);
      this.activeRollbacks.delete(rollbackId);
    }

    await db.update(rollbackEvents)
      .set({
        status: success ? 'completed' : 'failed',
        completedAt,
        actualDuration,
        success,
        errorMessage,
        executionProgress: execution ? {
          executedSteps: execution.executedSteps,
          failedSteps: execution.failedSteps,
          errors: execution.errors
        } : undefined,
        rollbackSummary: {
          success,
          duration: actualDuration,
          stepsExecuted: execution?.executedSteps.length || 0,
          stepsFailed: execution?.failedSteps.length || 0
        }
      })
      .where(eq(rollbackEvents.id, rollbackId));

    const logMessage = success ? 
      `✅ Rollback completed successfully in ${actualDuration}s` :
      `❌ Rollback failed after ${actualDuration}s: ${errorMessage}`;
    
    console[success ? 'info' : 'error'](logMessage);
  }

  /**
   * Get rollback history
   */
  async getRollbackHistory(limit: number = 50): Promise<RollbackEvent[]> {
    try {
      const rollbacks = await db.select().from(rollbackEvents)
        .orderBy(desc(rollbackEvents.initiatedAt))
        .limit(limit);
      
      return rollbacks as RollbackEvent[];
    } catch (error) {
      console.error('❌ Failed to get rollback history:', error);
      return [];
    }
  }

  /**
   * Get rollback status
   */
  async getRollbackStatus(rollbackId: string): Promise<RollbackEvent & { execution?: RollbackExecution }> {
    try {
      const rollbacks = await db.select().from(rollbackEvents)
        .where(eq(rollbackEvents.id, rollbackId))
        .limit(1);
      
      if (rollbacks.length === 0) {
        throw new Error(`Rollback not found: ${rollbackId}`);
      }
      
      const rollback = rollbacks[0] as RollbackEvent;
      const execution = this.activeRollbacks.get(rollbackId);
      
      return { ...rollback, execution };
    } catch (error) {
      console.error(`❌ Failed to get rollback status for ${rollbackId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel active rollback
   */
  async cancelRollback(rollbackId: string, cancelledBy: string, reason: string): Promise<void> {
    try {
      const execution = this.activeRollbacks.get(rollbackId);
      if (execution && execution.status === 'running') {
        execution.status = 'paused';
        this.activeRollbacks.delete(rollbackId);
      }

      await db.update(rollbackEvents)
        .set({
          status: 'cancelled',
          completedAt: new Date(),
          errorMessage: `Cancelled by ${cancelledBy}: ${reason}`
        })
        .where(eq(rollbackEvents.id, rollbackId));

      console.warn(`🛑 Rollback cancelled: ${rollbackId} by ${cancelledBy}`);
    } catch (error) {
      console.error(`❌ Failed to cancel rollback ${rollbackId}:`, error);
      throw error;
    }
  }

  /**
   * Get system rollback readiness
   */
  async getSystemRollbackReadiness(): Promise<{
    canRollback: boolean;
    blockers: string[];
    warnings: string[];
    recommendedActions: string[];
  }> {
    const blockers: string[] = [];
    const warnings: string[] = [];
    const recommendedActions: string[] = [];

    try {
      // Check if there's already an active rollback
      const activeRollbacks = Array.from(this.activeRollbacks.values())
        .filter(exec => exec.status === 'running');
      
      if (activeRollbacks.length > 0) {
        blockers.push(`${activeRollbacks.length} rollback(s) already in progress`);
      }

      // Check system health
      const systemHealth = await metricsService.getSystemHealth();
      const flagHealth = featureFlagService.getSystemHealth();

      if (systemHealth.overall === 'critical') {
        warnings.push('System is already in critical state');
        recommendedActions.push('Investigate critical alerts before rollback');
      }

      if (flagHealth.globalKillSwitch) {
        warnings.push('Global kill switch is already active');
      }

      // Check database connectivity
      try {
        await db.select().from(rollbackEvents).limit(1);
      } catch (error) {
        blockers.push('Database connectivity issue - rollback may fail');
      }

      return {
        canRollback: blockers.length === 0,
        blockers,
        warnings,
        recommendedActions
      };
    } catch (error) {
      return {
        canRollback: false,
        blockers: ['Unable to assess rollback readiness'],
        warnings: [],
        recommendedActions: ['Check system status and try again']
      };
    }
  }

  /**
   * Cleanup and shutdown
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Cancel any active rollbacks
    for (const rollbackId of this.activeRollbacks.keys()) {
      this.cancelRollback(rollbackId, 'system', 'Service shutdown').catch(console.error);
    }
  }
}

// Export singleton instance
export const rollbackService = new EnterpriseRollbackService();
export default rollbackService;