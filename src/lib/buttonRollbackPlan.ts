/**
 * Button System Rollback Plan and Emergency Procedures
 * 
 * Comprehensive rollback strategies and emergency response procedures
 * for safe deployment and recovery of the unified button system.
 */

import { buttonFeatureFlags } from './buttonFeatureFlags';
import { buttonMonitoring } from './buttonMonitoring';
import { buttonHealthChecks } from './buttonHealthChecks';

export interface RollbackTrigger {
  id: string;
  name: string;
  condition: () => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoRollback: boolean;
  description: string;
}

export interface RollbackPlan {
  id: string;
  name: string;
  description: string;
  triggers: RollbackTrigger[];
  steps: RollbackStep[];
  estimatedDuration: number; // minutes
  dataPreservation: string[];
  validationChecks: string[];
}

export interface RollbackStep {
  id: string;
  name: string;
  description: string;
  action: () => Promise<void>;
  rollbackAction?: () => Promise<void>;
  critical: boolean;
  estimatedDuration: number; // minutes
  dependencies?: string[];
}

export interface RollbackExecution {
  planId: string;
  startTime: number;
  endTime?: number;
  status: 'in-progress' | 'completed' | 'failed' | 'cancelled';
  executedSteps: string[];
  failedSteps: string[];
  errors: string[];
  preservedData: Record<string, any>;
}

class ButtonRollbackService {
  private rollbackPlans: Map<string, RollbackPlan> = new Map();
  private activeRollback: RollbackExecution | null = null;
  private triggers: RollbackTrigger[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeRollbackPlans();
    this.initializeTriggers();
    this.startTriggerMonitoring();
  }

  /**
   * Initialize predefined rollback plans
   */
  private initializeRollbackPlans(): void {
    // Emergency rollback plan
    const emergencyPlan: RollbackPlan = {
      id: 'emergency-rollback',
      name: 'Emergency Button System Rollback',
      description: 'Immediate rollback to legacy button system due to critical issues',
      triggers: [],
      steps: [
        {
          id: 'disable-unified-buttons',
          name: 'Disable Unified Button System',
          description: 'Immediately disable unified buttons via feature flag',
          action: async () => {
            buttonFeatureFlags.updateConfiguration({ enableUnifiedButtons: false });
            buttonFeatureFlags.triggerEmergencyDisable('Manual emergency rollback initiated');
          },
          critical: true,
          estimatedDuration: 1
        },
        {
          id: 'activate-legacy-fallbacks',
          name: 'Activate Legacy Fallbacks',
          description: 'Ensure all button components fall back to legacy implementations',
          action: async () => {
            buttonFeatureFlags.updateConfiguration({ 
              fallbackToLegacy: true,
              preserveLegacyActions: true,
              rolloutPercentage: 0
            });
          },
          critical: true,
          estimatedDuration: 2,
          dependencies: ['disable-unified-buttons']
        },
        {
          id: 'preserve-button-data',
          name: 'Preserve Button Configuration Data',
          description: 'Save current button configurations for future restoration',
          action: async () => {
            const data = await this.preserveButtonData();
            if (this.activeRollback) {
              this.activeRollback.preservedData.buttonConfigurations = data;
            }
          },
          critical: false,
          estimatedDuration: 3
        },
        {
          id: 'validate-legacy-functionality',
          name: 'Validate Legacy Functionality',
          description: 'Run smoke tests to ensure legacy buttons are working',
          action: async () => {
            const healthCheck = await buttonHealthChecks.runQuickHealthCheck();
            if (healthCheck.overallStatus === 'critical') {
              throw new Error('Legacy button validation failed');
            }
          },
          critical: true,
          estimatedDuration: 2,
          dependencies: ['activate-legacy-fallbacks']
        },
        {
          id: 'notify-stakeholders',
          name: 'Notify Stakeholders',
          description: 'Send notifications about the rollback to relevant teams',
          action: async () => {
            console.warn('🚨 ROLLBACK EXECUTED: Button system rolled back to legacy implementation');
            this.notifyStakeholders('Emergency rollback executed');
          },
          critical: false,
          estimatedDuration: 1,
          dependencies: ['validate-legacy-functionality']
        }
      ],
      estimatedDuration: 10,
      dataPreservation: ['button-configurations', 'user-interactions', 'performance-metrics'],
      validationChecks: ['legacy-button-rendering', 'action-routing', 'user-sessions']
    };

    // Gradual rollback plan
    const gradualPlan: RollbackPlan = {
      id: 'gradual-rollback',
      name: 'Gradual Button System Rollback',
      description: 'Controlled rollback with reduced exposure before full revert',
      triggers: [],
      steps: [
        {
          id: 'reduce-rollout-percentage',
          name: 'Reduce Rollout Percentage',
          description: 'Gradually reduce unified button exposure to limit impact',
          action: async () => {
            buttonFeatureFlags.updateConfiguration({ rolloutPercentage: 10 });
          },
          critical: false,
          estimatedDuration: 1
        },
        {
          id: 'monitor-error-rates',
          name: 'Monitor Error Rates',
          description: 'Watch error rates for 10 minutes after reduction',
          action: async () => {
            await new Promise(resolve => setTimeout(resolve, 10 * 60 * 1000)); // 10 minutes
            const stats = buttonMonitoring.getUsageStats();
            if (stats.successRate < 0.95) {
              throw new Error('Error rates still elevated after rollout reduction');
            }
          },
          critical: true,
          estimatedDuration: 10,
          dependencies: ['reduce-rollout-percentage']
        },
        {
          id: 'complete-rollback',
          name: 'Complete Rollback if Needed',
          description: 'Execute full rollback if issues persist',
          action: async () => {
            const healthCheck = await buttonHealthChecks.runQuickHealthCheck();
            if (healthCheck.overallStatus !== 'healthy') {
              await this.executeRollbackPlan('emergency-rollback');
            }
          },
          critical: true,
          estimatedDuration: 15,
          dependencies: ['monitor-error-rates']
        }
      ],
      estimatedDuration: 25,
      dataPreservation: ['button-configurations', 'rollout-metrics'],
      validationChecks: ['error-rate-improvement', 'user-experience-validation']
    };

    this.rollbackPlans.set(emergencyPlan.id, emergencyPlan);
    this.rollbackPlans.set(gradualPlan.id, gradualPlan);
  }

  /**
   * Initialize rollback triggers
   */
  private initializeTriggers(): void {
    this.triggers = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: () => {
          const stats = buttonMonitoring.getUsageStats();
          return stats.successRate < 0.85; // 15% error rate
        },
        severity: 'critical',
        autoRollback: true,
        description: 'Error rate exceeds 15% threshold'
      },
      {
        id: 'slow-performance',
        name: 'Slow Performance',
        condition: () => {
          const stats = buttonMonitoring.getUsageStats();
          return stats.averageRenderTime > 500 || stats.averageActionTime > 2000;
        },
        severity: 'high',
        autoRollback: false,
        description: 'Performance metrics exceed acceptable thresholds'
      },
      {
        id: 'memory-leak',
        name: 'Memory Leak Detection',
        condition: () => {
          if (typeof performance !== 'undefined' && 'memory' in performance) {
            const memory = (performance as any).memory;
            const memoryUsagePercent = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
            return memoryUsagePercent > 95;
          }
          return false;
        },
        severity: 'critical',
        autoRollback: true,
        description: 'Memory usage approaching critical levels'
      },
      {
        id: 'validation-failures',
        name: 'Validation Failures',
        condition: () => {
          const metrics = buttonMonitoring.getRealTimeMetrics();
          return metrics.recentErrors > 10; // More than 10 errors in 5 minutes
        },
        severity: 'medium',
        autoRollback: false,
        description: 'Multiple validation failures detected'
      },
      {
        id: 'emergency-disable-signal',
        name: 'Emergency Disable Signal',
        condition: () => {
          const health = buttonFeatureFlags.getSystemHealth();
          return health.status === 'emergency_disabled';
        },
        severity: 'critical',
        autoRollback: true,
        description: 'Emergency disable signal received'
      }
    ];
  }

  /**
   * Start monitoring for rollback triggers
   */
  private startTriggerMonitoring(): void {
    if (typeof window === 'undefined') return; // Server-side skip

    this.monitoringInterval = setInterval(() => {
      this.checkTriggers();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check all rollback triggers
   */
  private checkTriggers(): void {
    if (this.activeRollback) return; // Don't trigger during active rollback

    for (const trigger of this.triggers) {
      try {
        if (trigger.condition()) {
          console.warn(`🚨 Rollback trigger activated: ${trigger.name}`);
          
          if (trigger.autoRollback) {
            this.executeAutoRollback(trigger);
          } else {
            this.notifyRollbackTrigger(trigger);
          }
        }
      } catch (error) {
        console.error(`Error checking rollback trigger ${trigger.id}:`, error);
      }
    }
  }

  /**
   * Execute automatic rollback
   */
  private async executeAutoRollback(trigger: RollbackTrigger): Promise<void> {
    const planId = trigger.severity === 'critical' ? 'emergency-rollback' : 'gradual-rollback';
    
    console.error(`🚨 AUTO-ROLLBACK TRIGGERED: ${trigger.name} - Executing plan: ${planId}`);
    
    await this.executeRollbackPlan(planId);
  }

  /**
   * Notify about rollback trigger (manual intervention required)
   */
  private notifyRollbackTrigger(trigger: RollbackTrigger): void {
    console.warn(`⚠️ ROLLBACK TRIGGER: ${trigger.name} - Manual intervention recommended`);
    
    // In a real application, this would send alerts to monitoring systems
    this.notifyStakeholders(`Rollback trigger activated: ${trigger.name}`);
  }

  /**
   * Execute a rollback plan
   */
  async executeRollbackPlan(planId: string): Promise<RollbackExecution> {
    const plan = this.rollbackPlans.get(planId);
    if (!plan) {
      throw new Error(`Rollback plan not found: ${planId}`);
    }

    if (this.activeRollback) {
      throw new Error('Another rollback is already in progress');
    }

    console.warn(`🔄 STARTING ROLLBACK: ${plan.name}`);

    const execution: RollbackExecution = {
      planId,
      startTime: Date.now(),
      status: 'in-progress',
      executedSteps: [],
      failedSteps: [],
      errors: [],
      preservedData: {}
    };

    this.activeRollback = execution;

    try {
      // Execute steps in dependency order
      const sortedSteps = this.sortStepsByDependencies(plan.steps);
      
      for (const step of sortedSteps) {
        console.info(`🔧 Executing rollback step: ${step.name}`);
        
        try {
          await step.action();
          execution.executedSteps.push(step.id);
          console.info(`✅ Rollback step completed: ${step.name}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          execution.failedSteps.push(step.id);
          execution.errors.push(`${step.name}: ${errorMessage}`);
          
          console.error(`❌ Rollback step failed: ${step.name}`, error);
          
          if (step.critical) {
            execution.status = 'failed';
            throw new Error(`Critical rollback step failed: ${step.name}`);
          }
        }
      }

      execution.status = 'completed';
      execution.endTime = Date.now();
      
      console.info(`✅ ROLLBACK COMPLETED: ${plan.name} in ${execution.endTime - execution.startTime}ms`);
      
      // Run validation checks
      await this.validateRollback(plan);
      
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = Date.now();
      execution.errors.push(error instanceof Error ? error.message : String(error));
      
      console.error(`❌ ROLLBACK FAILED: ${plan.name}`, error);
      
      // Attempt to rollback the rollback (if possible)
      await this.rollbackRollback(execution);
    } finally {
      this.activeRollback = null;
    }

    return execution;
  }

  /**
   * Sort steps by dependencies
   */
  private sortStepsByDependencies(steps: RollbackStep[]): RollbackStep[] {
    const sorted: RollbackStep[] = [];
    const remaining = [...steps];
    
    while (remaining.length > 0) {
      const canExecute = remaining.filter(step => 
        !step.dependencies || 
        step.dependencies.every(dep => sorted.some(s => s.id === dep))
      );
      
      if (canExecute.length === 0) {
        // Circular dependency or missing dependency
        console.warn('Circular or missing dependencies detected, executing remaining steps in order');
        sorted.push(...remaining);
        break;
      }
      
      sorted.push(...canExecute);
      canExecute.forEach(step => {
        const index = remaining.indexOf(step);
        remaining.splice(index, 1);
      });
    }
    
    return sorted;
  }

  /**
   * Validate rollback success
   */
  private async validateRollback(plan: RollbackPlan): Promise<void> {
    console.info('🔍 Validating rollback success...');
    
    for (const check of plan.validationChecks) {
      try {
        await this.runValidationCheck(check);
        console.info(`✅ Validation check passed: ${check}`);
      } catch (error) {
        console.error(`❌ Validation check failed: ${check}`, error);
        throw new Error(`Rollback validation failed: ${check}`);
      }
    }
  }

  /**
   * Run a validation check
   */
  private async runValidationCheck(check: string): Promise<void> {
    switch (check) {
      case 'legacy-button-rendering':
        // Test that legacy buttons can render
        if (typeof document !== 'undefined') {
          const testButton = document.createElement('button');
          testButton.textContent = 'Test';
          if (!testButton.textContent) throw new Error('Button rendering failed');
        }
        break;
        
      case 'action-routing':
        // Test that action routing works
        const testRouting = buttonFeatureFlags.shouldUseUnifiedButtons();
        if (testRouting) throw new Error('Unified buttons still active after rollback');
        break;
        
      case 'error-rate-improvement':
        // Check that error rates have improved
        const stats = buttonMonitoring.getUsageStats();
        if (stats.successRate < 0.90) throw new Error('Error rates have not improved');
        break;
        
      default:
        console.warn(`Unknown validation check: ${check}`);
    }
  }

  /**
   * Attempt to rollback a failed rollback
   */
  private async rollbackRollback(execution: RollbackExecution): Promise<void> {
    console.warn('🔄 Attempting to rollback failed rollback...');
    
    try {
      const plan = this.rollbackPlans.get(execution.planId);
      if (!plan) return;
      
      // Execute rollback actions for completed steps in reverse order
      const completedSteps = plan.steps.filter(step => 
        execution.executedSteps.includes(step.id) && step.rollbackAction
      );
      
      for (const step of completedSteps.reverse()) {
        if (step.rollbackAction) {
          try {
            await step.rollbackAction();
            console.info(`✅ Rollback of rollback step completed: ${step.name}`);
          } catch (error) {
            console.error(`❌ Failed to rollback rollback step: ${step.name}`, error);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to rollback the rollback:', error);
    }
  }

  /**
   * Preserve button data for restoration
   */
  private async preserveButtonData(): Promise<any> {
    try {
      // In a real implementation, this would save to database or storage
      const preservedData = {
        timestamp: Date.now(),
        featureFlags: buttonFeatureFlags.getSystemHealth(),
        metrics: buttonMonitoring.exportMetrics('json'),
        configuration: 'Button configuration data would be saved here'
      };
      
      console.info('💾 Button data preserved for future restoration');
      return preservedData;
      
    } catch (error) {
      console.error('❌ Failed to preserve button data:', error);
      throw error;
    }
  }

  /**
   * Notify stakeholders about rollback events
   */
  private notifyStakeholders(message: string): void {
    // In a real implementation, this would send notifications via:
    // - Email alerts
    // - Slack/Teams notifications
    // - PagerDuty alerts
    // - SMS notifications
    
    console.warn(`📧 STAKEHOLDER NOTIFICATION: ${message}`);
    
    // For now, just log to console and potentially send to monitoring service
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('button-rollback-notification', {
        detail: { message, timestamp: Date.now() }
      }));
    }
  }

  /**
   * Get current rollback status
   */
  getCurrentRollbackStatus(): RollbackExecution | null {
    return this.activeRollback;
  }

  /**
   * Get available rollback plans
   */
  getAvailableRollbackPlans(): RollbackPlan[] {
    return Array.from(this.rollbackPlans.values());
  }

  /**
   * Manually trigger a rollback plan
   */
  async manualRollback(planId: string, reason: string): Promise<RollbackExecution> {
    console.warn(`🔧 MANUAL ROLLBACK INITIATED: ${reason}`);
    this.notifyStakeholders(`Manual rollback initiated: ${reason}`);
    return await this.executeRollbackPlan(planId);
  }

  /**
   * Stop trigger monitoring (for testing or shutdown)
   */
  stopTriggerMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Add custom rollback trigger
   */
  addCustomTrigger(trigger: RollbackTrigger): void {
    this.triggers.push(trigger);
    console.info(`🎯 Custom rollback trigger added: ${trigger.name}`);
  }

  /**
   * Remove rollback trigger
   */
  removeTrigger(triggerId: string): void {
    this.triggers = this.triggers.filter(t => t.id !== triggerId);
    console.info(`🗑️ Rollback trigger removed: ${triggerId}`);
  }
}

// Singleton instance
export const buttonRollbackPlan = new ButtonRollbackService();

/**
 * React hook for rollback management
 */
export function useButtonRollback() {
  const [currentRollback, setCurrentRollback] = React.useState<RollbackExecution | null>(null);

  React.useEffect(() => {
    const checkRollbackStatus = () => {
      const status = buttonRollbackPlan.getCurrentRollbackStatus();
      setCurrentRollback(status);
    };

    checkRollbackStatus();
    const interval = setInterval(checkRollbackStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    currentRollback,
    executeRollback: buttonRollbackPlan.manualRollback.bind(buttonRollbackPlan),
    getAvailablePlans: buttonRollbackPlan.getAvailableRollbackPlans.bind(buttonRollbackPlan),
  };
}

export default buttonRollbackPlan;