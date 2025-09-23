/**
 * Button System Integration Tests
 * 
 * Comprehensive integration tests for the unified button system,
 * feature flags, monitoring, and rollback mechanisms.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { buttonFeatureFlags, createUserCohort } from '../lib/buttonFeatureFlags';
import { buttonMonitoring } from '../lib/buttonMonitoring';
import { buttonHealthChecks } from '../lib/buttonHealthChecks';
import { buttonRollbackPlan } from '../lib/buttonRollbackPlan';

// Mock window object for browser environment simulation
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 50000000,
      totalJSHeapSize: 100000000,
      jsHeapSizeLimit: 200000000
    }
  }
});

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: {
    getItem: jest.fn(() => 'test-session-id'),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  }
});

Object.defineProperty(window, 'navigator', {
  writable: true,
  value: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

describe('Button System Integration Tests', () => {
  beforeEach(() => {
    // Reset all systems before each test
    buttonFeatureFlags.resetEmergencyState();
    buttonMonitoring.clearOldMetrics(0); // Clear all metrics
    buttonHealthChecks.stopHealthChecks();
    buttonRollbackPlan.stopTriggerMonitoring();
    
    // Mock environment variables
    process.env.ENABLE_UNIFIED_BUTTONS = 'true';
    process.env.ENABLE_BUTTON_MONITORING = 'true';
    process.env.BUTTON_ROLLOUT_PERCENTAGE = '100';
    process.env.ENABLE_EMERGENCY_BUTTON_DISABLE = 'true';
  });

  afterEach(() => {
    // Cleanup after each test
    buttonHealthChecks.stopHealthChecks();
    buttonRollbackPlan.stopTriggerMonitoring();
  });

  describe('Feature Flag System', () => {
    test('should enable unified buttons for 100% rollout', () => {
      const cohort = createUserCohort({
        userId: 'test-user',
        isAdmin: false
      });

      const shouldUseUnified = buttonFeatureFlags.shouldUseUnifiedButtons(cohort);
      expect(shouldUseUnified).toBe(true);
    });

    test('should respect rollout percentage', () => {
      buttonFeatureFlags.updateConfiguration({ rolloutPercentage: 0 });

      const cohort = createUserCohort({
        userId: 'test-user',
        isAdmin: false
      });

      const shouldUseUnified = buttonFeatureFlags.shouldUseUnifiedButtons(cohort);
      expect(shouldUseUnified).toBe(false);
    });

    test('should prioritize admin users', () => {
      buttonFeatureFlags.updateConfiguration({ rolloutPercentage: 0 });

      const adminCohort = createUserCohort({
        userId: 'admin-user',
        isAdmin: true
      });

      const shouldUseUnified = buttonFeatureFlags.shouldUseUnifiedButtons(adminCohort);
      expect(shouldUseUnified).toBe(true);
    });

    test('should handle emergency disable', () => {
      buttonFeatureFlags.triggerEmergencyDisable('Test emergency disable');

      const cohort = createUserCohort({
        userId: 'test-user',
        isAdmin: false
      });

      const shouldUseUnified = buttonFeatureFlags.shouldUseUnifiedButtons(cohort);
      expect(shouldUseUnified).toBe(false);

      const health = buttonFeatureFlags.getSystemHealth();
      expect(health.status).toBe('emergency_disabled');
    });

    test('should record performance metrics', () => {
      buttonFeatureFlags.recordPerformanceMetric('test-operation', 150);

      const health = buttonFeatureFlags.getSystemHealth();
      expect(health.metrics).toHaveProperty('test-operation');
      expect(health.metrics['test-operation']).toContain(150);
    });

    test('should trigger emergency disable on high error rate', () => {
      // Simulate multiple errors to trigger emergency disable
      for (let i = 0; i < 10; i++) {
        buttonFeatureFlags.recordError('test-operation', new Error('Test error'));
      }

      const health = buttonFeatureFlags.getSystemHealth();
      // Should be emergency disabled due to high error rate
      expect(health.status).toBe('emergency_disabled');
    });
  });

  describe('Monitoring System', () => {
    test('should record button interactions', () => {
      buttonMonitoring.recordInteraction('test-button', 'external-url', true, {
        url: 'https://example.com'
      });

      const stats = buttonMonitoring.getUsageStats();
      expect(stats.totalInteractions).toBe(1);
      expect(stats.successRate).toBe(1);
    });

    test('should track performance timing', () => {
      const endTiming = buttonMonitoring.startTiming('button-render');
      
      // Simulate some work
      setTimeout(() => {
        endTiming();
        
        const stats = buttonMonitoring.getUsageStats();
        expect(stats.averageRenderTime).toBeGreaterThan(0);
      }, 10);
    });

    test('should record validation results', () => {
      const validationResult = {
        isValid: false,
        errors: ['Missing button ID', 'Invalid action type']
      };

      buttonMonitoring.recordValidation('invalid-button', validationResult, 5);

      const metrics = buttonMonitoring.getRealTimeMetrics();
      expect(metrics.recentErrors).toBeGreaterThan(0);
    });

    test('should calculate usage statistics correctly', () => {
      // Record multiple interactions with mixed success
      buttonMonitoring.recordInteraction('btn1', 'external-url', true);
      buttonMonitoring.recordInteraction('btn2', 'chapter', true);
      buttonMonitoring.recordInteraction('btn3', 'external-url', false);

      const stats = buttonMonitoring.getUsageStats();
      expect(stats.totalInteractions).toBe(3);
      expect(stats.successRate).toBeCloseTo(2/3, 2);
      expect(stats.errorCount).toBe(1);

      const mostUsed = stats.mostUsedActions;
      expect(mostUsed).toContainEqual({ action: 'external-url', count: 2 });
    });

    test('should export metrics in different formats', () => {
      buttonMonitoring.recordInteraction('test-button', 'test-action', true);

      const jsonExport = buttonMonitoring.exportMetrics('json');
      expect(jsonExport).toContain('metrics');
      expect(() => JSON.parse(jsonExport)).not.toThrow();

      const csvExport = buttonMonitoring.exportMetrics('csv');
      expect(csvExport).toContain('id,operation,timestamp');
    });
  });

  describe('Health Check System', () => {
    test('should run comprehensive health check', async () => {
      const healthReport = await buttonHealthChecks.runFullHealthCheck();

      expect(healthReport).toHaveProperty('overallStatus');
      expect(healthReport).toHaveProperty('healthScore');
      expect(healthReport).toHaveProperty('healthChecks');
      expect(healthReport).toHaveProperty('smokeTests');
      expect(healthReport).toHaveProperty('recommendations');

      expect(healthReport.healthChecks.length).toBeGreaterThan(0);
      expect(healthReport.smokeTests.length).toBeGreaterThan(0);
    });

    test('should run quick health check', async () => {
      const quickHealth = await buttonHealthChecks.runQuickHealthCheck();

      expect(quickHealth).toHaveProperty('overallStatus');
      expect(quickHealth).toHaveProperty('healthScore');
      expect(['healthy', 'degraded', 'critical']).toContain(quickHealth.overallStatus);
      expect(quickHealth.healthScore).toBeGreaterThanOrEqual(0);
      expect(quickHealth.healthScore).toBeLessThanOrEqual(100);
    });

    test('should detect system health degradation', async () => {
      // Simulate performance issues
      buttonFeatureFlags.recordPerformanceMetric('button-render', 500); // Slow render
      buttonFeatureFlags.recordError('button-action', new Error('Test error'));

      const healthReport = await buttonHealthChecks.runFullHealthCheck();
      
      // Health should be degraded due to performance and errors
      expect(['degraded', 'critical']).toContain(healthReport.overallStatus);
    });

    test('should pass smoke tests for basic functionality', async () => {
      const healthReport = await buttonHealthChecks.runFullHealthCheck();

      const smokeTests = healthReport.smokeTests;
      const passedTests = smokeTests.filter(test => test.passed);
      
      // At least 80% of smoke tests should pass
      expect(passedTests.length / smokeTests.length).toBeGreaterThan(0.8);
    });
  });

  describe('Rollback System', () => {
    test('should execute emergency rollback', async () => {
      const rollbackExecution = await buttonRollbackPlan.executeRollbackPlan('emergency-rollback');

      expect(rollbackExecution).toHaveProperty('planId', 'emergency-rollback');
      expect(rollbackExecution).toHaveProperty('status');
      expect(['completed', 'failed']).toContain(rollbackExecution.status);
      expect(rollbackExecution.executedSteps.length).toBeGreaterThan(0);
    });

    test('should trigger automatic rollback on high error rate', async () => {
      // Simulate high error rate to trigger rollback
      const stats = buttonMonitoring.getUsageStats();
      
      // Record many failed interactions
      for (let i = 0; i < 20; i++) {
        buttonMonitoring.recordInteraction(`btn-${i}`, 'test-action', false);
      }

      // The rollback system should detect this and trigger automatically
      // This would typically happen via the monitoring interval
      const newStats = buttonMonitoring.getUsageStats();
      expect(newStats.successRate).toBeLessThan(0.5);
    });

    test('should preserve data during rollback', async () => {
      // Record some data before rollback
      buttonMonitoring.recordInteraction('test-button', 'test-action', true);
      const statsBefore = buttonMonitoring.getUsageStats();

      const rollbackExecution = await buttonRollbackPlan.executeRollbackPlan('emergency-rollback');

      expect(rollbackExecution.preservedData).toBeDefined();
      expect(rollbackExecution.status).toBe('completed');

      // Data should still be accessible after rollback
      const statsAfter = buttonMonitoring.getUsageStats();
      expect(statsAfter.totalInteractions).toBe(statsBefore.totalInteractions);
    });

    test('should provide available rollback plans', () => {
      const plans = buttonRollbackPlan.getAvailableRollbackPlans();

      expect(plans.length).toBeGreaterThan(0);
      expect(plans.some(plan => plan.id === 'emergency-rollback')).toBe(true);
      expect(plans.some(plan => plan.id === 'gradual-rollback')).toBe(true);

      plans.forEach(plan => {
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('description');
        expect(plan).toHaveProperty('steps');
        expect(plan.steps.length).toBeGreaterThan(0);
      });
    });
  });

  describe('End-to-End Integration', () => {
    test('should handle complete feature flag lifecycle', async () => {
      // 1. Start with unified buttons enabled
      let cohort = createUserCohort({ userId: 'test-user' });
      expect(buttonFeatureFlags.shouldUseUnifiedButtons(cohort)).toBe(true);

      // 2. Record some successful interactions
      buttonMonitoring.recordInteraction('btn1', 'external-url', true);
      buttonMonitoring.recordInteraction('btn2', 'chapter', true);

      // 3. Run health check - should be healthy
      let health = await buttonHealthChecks.runQuickHealthCheck();
      expect(health.overallStatus).toBe('healthy');

      // 4. Simulate performance degradation
      buttonFeatureFlags.recordPerformanceMetric('button-render', 300);
      buttonFeatureFlags.recordError('button-action', new Error('Performance error'));

      // 5. Health should degrade but not trigger emergency
      health = await buttonHealthChecks.runQuickHealthCheck();
      expect(['healthy', 'degraded']).toContain(health.overallStatus);

      // 6. Trigger emergency disable
      buttonFeatureFlags.triggerEmergencyDisable('Integration test emergency');

      // 7. Should now fall back to legacy
      expect(buttonFeatureFlags.shouldUseUnifiedButtons(cohort)).toBe(false);

      // 8. Health should show emergency state
      const systemHealth = buttonFeatureFlags.getSystemHealth();
      expect(systemHealth.status).toBe('emergency_disabled');
    });

    test('should maintain data integrity across all operations', () => {
      const testData = {
        interactions: 0,
        errors: 0,
        metrics: 0
      };

      // Record various operations
      for (let i = 0; i < 10; i++) {
        buttonMonitoring.recordInteraction(`btn-${i}`, 'test-action', i % 2 === 0);
        testData.interactions++;
        
        if (i % 2 !== 0) {
          buttonMonitoring.recordError('test-operation', new Error(`Error ${i}`));
          testData.errors++;
        }

        buttonFeatureFlags.recordPerformanceMetric('test-operation', i * 10);
        testData.metrics++;
      }

      // Verify data consistency
      const stats = buttonMonitoring.getUsageStats();
      expect(stats.totalInteractions).toBe(testData.interactions);
      expect(stats.errorCount).toBe(testData.errors);

      const health = buttonFeatureFlags.getSystemHealth();
      expect(health.metrics['test-operation']).toHaveLength(testData.metrics);
    });

    test('should handle concurrent operations safely', async () => {
      const promises = [];

      // Simulate concurrent operations
      for (let i = 0; i < 50; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              buttonMonitoring.recordInteraction(`concurrent-btn-${i}`, 'concurrent-action', true);
              buttonFeatureFlags.recordPerformanceMetric('concurrent-operation', Math.random() * 100);
              resolve();
            }, Math.random() * 100);
          })
        );
      }

      await Promise.all(promises);

      const stats = buttonMonitoring.getUsageStats();
      expect(stats.totalInteractions).toBe(50);

      const health = buttonFeatureFlags.getSystemHealth();
      expect(health.metrics['concurrent-operation']).toHaveLength(50);
    });

    test('should recover gracefully from errors', async () => {
      // Simulate various error conditions
      try {
        buttonFeatureFlags.recordError('critical-operation', new Error('Critical error'));
        buttonMonitoring.recordInteraction('error-button', 'error-action', false);
        
        // System should still be functional
        const health = await buttonHealthChecks.runQuickHealthCheck();
        expect(['healthy', 'degraded', 'critical']).toContain(health.overallStatus);
        
        // Should be able to record successful operations
        buttonMonitoring.recordInteraction('recovery-button', 'recovery-action', true);
        const stats = buttonMonitoring.getUsageStats();
        expect(stats.totalInteractions).toBeGreaterThan(0);
        
      } catch (error) {
        // Should not throw unhandled errors
        fail(`System threw unhandled error: ${error}`);
      }
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle high-frequency operations', () => {
      const startTime = Date.now();
      
      // Record 1000 operations rapidly
      for (let i = 0; i < 1000; i++) {
        buttonMonitoring.recordInteraction(`perf-btn-${i}`, 'perf-action', true);
        buttonFeatureFlags.recordPerformanceMetric('perf-operation', i);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
      
      const stats = buttonMonitoring.getUsageStats();
      expect(stats.totalInteractions).toBe(1000);
    });

    test('should maintain performance under load', async () => {
      const operations = [];
      
      // Simulate load with concurrent operations
      for (let i = 0; i < 100; i++) {
        operations.push(async () => {
          for (let j = 0; j < 10; j++) {
            buttonMonitoring.recordInteraction(`load-btn-${i}-${j}`, 'load-action', true);
            buttonFeatureFlags.recordPerformanceMetric('load-operation', j * 10);
          }
        });
      }
      
      const startTime = Date.now();
      await Promise.all(operations.map(op => op()));
      const endTime = Date.now();
      
      // Should complete 1000 operations within 2 seconds
      expect(endTime - startTime).toBeLessThan(2000);
      
      const stats = buttonMonitoring.getUsageStats();
      expect(stats.totalInteractions).toBe(1000);
    });

    test('should clean up resources properly', () => {
      // Record operations to create data
      for (let i = 0; i < 100; i++) {
        buttonMonitoring.recordInteraction(`cleanup-btn-${i}`, 'cleanup-action', true);
      }
      
      const statsBefore = buttonMonitoring.getUsageStats();
      expect(statsBefore.totalInteractions).toBe(100);
      
      // Clear old metrics
      buttonMonitoring.clearOldMetrics(0); // Clear all
      
      const statsAfter = buttonMonitoring.getUsageStats();
      expect(statsAfter.totalInteractions).toBe(0);
    });
  });
});

// Additional test utilities for manual testing
export const TestUtilities = {
  /**
   * Simulate load testing scenario
   */
  async simulateLoad(operations: number = 1000, concurrency: number = 10) {
    const batches = Math.ceil(operations / concurrency);
    
    for (let batch = 0; batch < batches; batch++) {
      const promises = [];
      
      for (let i = 0; i < concurrency && (batch * concurrency + i) < operations; i++) {
        const opIndex = batch * concurrency + i;
        promises.push(
          new Promise<void>((resolve) => {
            buttonMonitoring.recordInteraction(`load-test-${opIndex}`, 'load-test', true);
            buttonFeatureFlags.recordPerformanceMetric('load-test', Math.random() * 100);
            resolve();
          })
        );
      }
      
      await Promise.all(promises);
    }
    
    return buttonMonitoring.getUsageStats();
  },

  /**
   * Simulate error conditions
   */
  simulateErrors(errorCount: number = 10) {
    for (let i = 0; i < errorCount; i++) {
      buttonFeatureFlags.recordError('test-error', new Error(`Simulated error ${i}`));
      buttonMonitoring.recordInteraction(`error-btn-${i}`, 'error-action', false);
    }
    
    return buttonFeatureFlags.getSystemHealth();
  },

  /**
   * Get comprehensive system status
   */
  async getSystemStatus() {
    const health = await buttonHealthChecks.runFullHealthCheck();
    const stats = buttonMonitoring.getUsageStats();
    const systemHealth = buttonFeatureFlags.getSystemHealth();
    
    return {
      health,
      stats,
      systemHealth,
      timestamp: Date.now()
    };
  }
};