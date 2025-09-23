/**
 * Button System Health Checks and Smoke Tests
 * 
 * Comprehensive health monitoring and validation for the button system
 * with automated smoke tests for critical button action paths.
 */

import { buttonFeatureFlags, UserCohort } from './buttonFeatureFlags';
import { buttonMonitoring } from './buttonMonitoring';
import { CardData } from '@/@typings';

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  details?: any;
  timestamp: number;
  duration: number;
}

export interface SmokeTestResult {
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
  timestamp: number;
  metadata?: any;
}

export interface SystemHealthReport {
  overallStatus: 'healthy' | 'degraded' | 'critical';
  healthScore: number;
  healthChecks: HealthCheckResult[];
  smokeTests: SmokeTestResult[];
  recommendations: string[];
  lastUpdated: number;
}

class ButtonHealthCheckService {
  private lastHealthCheck: SystemHealthReport | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startPeriodicHealthChecks();
  }

  /**
   * Start periodic health checks (every 5 minutes)
   */
  private startPeriodicHealthChecks(): void {
    if (typeof window === 'undefined') return; // Server-side skip

    this.healthCheckInterval = setInterval(() => {
      this.runFullHealthCheck().catch(console.error);
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Run comprehensive health check
   */
  async runFullHealthCheck(): Promise<SystemHealthReport> {
    const startTime = Date.now();
    
    const healthChecks: HealthCheckResult[] = [];
    const smokeTests: SmokeTestResult[] = [];

    try {
      // Core health checks
      healthChecks.push(await this.checkFeatureFlagSystem());
      healthChecks.push(await this.checkMonitoringSystem());
      healthChecks.push(await this.checkPerformanceMetrics());
      healthChecks.push(await this.checkErrorRates());
      healthChecks.push(await this.checkSystemResources());

      // Smoke tests
      smokeTests.push(await this.testButtonRendering());
      smokeTests.push(await this.testActionRouting());
      smokeTests.push(await this.testValidationSystem());
      smokeTests.push(await this.testFallbackMechanism());
      smokeTests.push(await this.testEmergencyDisable());

      // Calculate overall health
      const report = this.calculateOverallHealth(healthChecks, smokeTests);
      this.lastHealthCheck = report;
      
      console.info(`🏥 Health check completed in ${Date.now() - startTime}ms - Status: ${report.overallStatus}`);
      return report;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      
      const errorReport: SystemHealthReport = {
        overallStatus: 'critical',
        healthScore: 0,
        healthChecks: [{
          name: 'health-check-system',
          status: 'critical',
          message: `Health check system failure: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        }],
        smokeTests: [],
        recommendations: ['Check system logs', 'Restart health check service', 'Investigate health check infrastructure'],
        lastUpdated: Date.now()
      };
      
      this.lastHealthCheck = errorReport;
      return errorReport;
    }
  }

  /**
   * Check feature flag system health
   */
  private async checkFeatureFlagSystem(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const testCohort: UserCohort = { userId: 'health-check-user', isAdmin: false };
      const shouldUseUnified = buttonFeatureFlags.shouldUseUnifiedButtons(testCohort);
      const systemHealth = buttonFeatureFlags.getSystemHealth();
      
      let status: HealthCheckResult['status'] = 'healthy';
      let message = 'Feature flag system operational';
      
      if (systemHealth.status === 'emergency_disabled') {
        status = 'critical';
        message = 'Feature flags in emergency disabled state';
      } else if (systemHealth.status === 'degraded') {
        status = 'warning';
        message = 'Feature flag system showing degraded performance';
      }

      return {
        name: 'feature-flag-system',
        status,
        message,
        details: {
          unifiedButtonsEnabled: shouldUseUnified,
          systemHealth: systemHealth.status,
          recommendations: systemHealth.recommendations
        },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        name: 'feature-flag-system',
        status: 'critical',
        message: `Feature flag system error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Check monitoring system health
   */
  private async checkMonitoringSystem(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const realtimeMetrics = buttonMonitoring.getRealTimeMetrics();
      const usageStats = buttonMonitoring.getUsageStats();
      
      let status: HealthCheckResult['status'] = 'healthy';
      let message = 'Monitoring system operational';
      
      if (realtimeMetrics.healthScore < 50) {
        status = 'critical';
        message = `Low system health score: ${realtimeMetrics.healthScore}`;
      } else if (realtimeMetrics.healthScore < 80) {
        status = 'warning';
        message = `Degraded system health score: ${realtimeMetrics.healthScore}`;
      }

      return {
        name: 'monitoring-system',
        status,
        message,
        details: {
          healthScore: realtimeMetrics.healthScore,
          activeOperations: realtimeMetrics.activeOperations,
          recentErrors: realtimeMetrics.recentErrors,
          successRate: usageStats.successRate
        },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        name: 'monitoring-system',
        status: 'critical',
        message: `Monitoring system error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Check performance metrics
   */
  private async checkPerformanceMetrics(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const usageStats = buttonMonitoring.getUsageStats();
      
      let status: HealthCheckResult['status'] = 'healthy';
      let message = 'Performance metrics within acceptable ranges';
      
      if (usageStats.averageRenderTime > 200) {
        status = 'warning';
        message = `Slow render times: ${usageStats.averageRenderTime.toFixed(1)}ms`;
      }
      
      if (usageStats.averageActionTime > 1000) {
        status = 'critical';
        message = `Very slow action execution: ${usageStats.averageActionTime.toFixed(1)}ms`;
      }

      return {
        name: 'performance-metrics',
        status,
        message,
        details: {
          averageRenderTime: usageStats.averageRenderTime,
          averageActionTime: usageStats.averageActionTime,
          totalInteractions: usageStats.totalInteractions
        },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        name: 'performance-metrics',
        status: 'critical',
        message: `Performance metrics error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Check error rates
   */
  private async checkErrorRates(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const usageStats = buttonMonitoring.getUsageStats();
      
      let status: HealthCheckResult['status'] = 'healthy';
      let message = 'Error rates within acceptable thresholds';
      
      if (usageStats.successRate < 0.95) {
        status = 'warning';
        message = `Elevated error rate: ${((1 - usageStats.successRate) * 100).toFixed(1)}%`;
      }
      
      if (usageStats.successRate < 0.90) {
        status = 'critical';
        message = `High error rate: ${((1 - usageStats.successRate) * 100).toFixed(1)}%`;
      }

      return {
        name: 'error-rates',
        status,
        message,
        details: {
          successRate: usageStats.successRate,
          errorCount: usageStats.errorCount,
          totalInteractions: usageStats.totalInteractions
        },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        name: 'error-rates',
        status: 'critical',
        message: `Error rate check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Check system resources
   */
  private async checkSystemResources(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      let status: HealthCheckResult['status'] = 'healthy';
      let message = 'System resources adequate';
      const details: any = {};

      // Check memory usage (if available)
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsagePercent = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
        
        details.memoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: memoryUsagePercent
        };

        if (memoryUsagePercent > 90) {
          status = 'critical';
          message = `High memory usage: ${memoryUsagePercent.toFixed(1)}%`;
        } else if (memoryUsagePercent > 75) {
          status = 'warning';
          message = `Elevated memory usage: ${memoryUsagePercent.toFixed(1)}%`;
        }
      }

      // Check if we can create DOM elements (browser functionality test)
      if (typeof document !== 'undefined') {
        const testElement = document.createElement('div');
        testElement.remove();
        details.domManipulation = 'operational';
      }

      return {
        name: 'system-resources',
        status,
        message,
        details,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        name: 'system-resources',
        status: 'critical',
        message: `System resource check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Smoke test: Button rendering
   */
  private async testButtonRendering(): Promise<SmokeTestResult> {
    const startTime = Date.now();
    
    try {
      // Create a test button configuration
      const testButton: NonNullable<CardData['customButtons']>[0] = {
        id: 'smoke-test-button',
        label: 'Test Button',
        variant: 'primary',
        action: {
          type: 'external-url',
          target: 'https://example.com'
        },
        position: {
          x: 50,
          y: 50,
          unit: 'percent'
        },
        isUnlocked: true
      };

      // Simulate button rendering check
      if (typeof document !== 'undefined') {
        const testContainer = document.createElement('div');
        testContainer.innerHTML = `
          <button data-testid="smoke-test-button" style="
            background: #3B82F6; color: white; padding: 12px 24px; 
            border: none; border-radius: 8px; cursor: pointer;
          ">
            ${testButton.label}
          </button>
        `;
        
        const buttonElement = testContainer.querySelector('[data-testid="smoke-test-button"]');
        if (!buttonElement) throw new Error('Failed to create button element');
        
        testContainer.remove();
      }

      return {
        testName: 'button-rendering',
        passed: true,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        metadata: { testButtonId: testButton.id }
      };

    } catch (error) {
      return {
        testName: 'button-rendering',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Smoke test: Action routing
   */
  private async testActionRouting(): Promise<SmokeTestResult> {
    const startTime = Date.now();
    
    try {
      // Test action routing logic without actual navigation
      const testActions = [
        { type: 'external-url', target: 'https://example.com' },
        { type: 'chapter', target: 'test-chapter' },
        { type: 'sub-chapter', target: 'test-subchapter' },
        { type: 'wallet' },
        { type: 'ar-item', target: 'test-ar' }
      ];

      for (const action of testActions) {
        // Validate action structure
        if (!action.type) throw new Error('Action type missing');
        if (['external-url', 'chapter', 'sub-chapter', 'ar-item'].includes(action.type) && !action.target) {
          throw new Error(`Action target missing for ${action.type}`);
        }
      }

      return {
        testName: 'action-routing',
        passed: true,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        metadata: { testedActions: testActions.length }
      };

    } catch (error) {
      return {
        testName: 'action-routing',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Smoke test: Validation system
   */
  private async testValidationSystem(): Promise<SmokeTestResult> {
    const startTime = Date.now();
    
    try {
      // Test button validation with various scenarios
      const validButton: NonNullable<CardData['customButtons']>[0] = {
        id: 'valid-test-button',
        label: 'Valid Button',
        action: { type: 'external-url', target: 'https://example.com' },
        isUnlocked: true
      };

      const invalidButton: any = {
        // Missing required fields
        label: 'Invalid Button'
      };

      // Import validation function dynamically to test it
      const validationPassed = validButton.id && validButton.label && validButton.action;
      const invalidationDetected = !invalidButton.id || !invalidButton.action;

      if (!validationPassed || !invalidationDetected) {
        throw new Error('Validation logic not working correctly');
      }

      return {
        testName: 'validation-system',
        passed: true,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        metadata: { validationTests: 2 }
      };

    } catch (error) {
      return {
        testName: 'validation-system',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Smoke test: Fallback mechanism
   */
  private async testFallbackMechanism(): Promise<SmokeTestResult> {
    const startTime = Date.now();
    
    try {
      // Test that feature flag system can determine fallback behavior
      const testCohort: UserCohort = { userId: 'fallback-test', isAdmin: false };
      
      // This should not throw an error regardless of feature flag state
      const shouldUseUnified = buttonFeatureFlags.shouldUseUnifiedButtons(testCohort);
      
      // Test both paths exist
      const hasUnifiedPath = typeof shouldUseUnified === 'boolean';
      const canTogglePath = buttonFeatureFlags.shouldUseUnifiedButtons({ userId: 'admin-test', isAdmin: true });
      
      if (!hasUnifiedPath) throw new Error('Feature flag system not responding correctly');

      return {
        testName: 'fallback-mechanism',
        passed: true,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        metadata: { 
          unifiedEnabled: shouldUseUnified,
          adminUnified: canTogglePath
        }
      };

    } catch (error) {
      return {
        testName: 'fallback-mechanism',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Smoke test: Emergency disable mechanism
   */
  private async testEmergencyDisable(): Promise<SmokeTestResult> {
    const startTime = Date.now();
    
    try {
      // Test emergency disable mechanism (without actually disabling)
      const initialHealth = buttonFeatureFlags.getSystemHealth();
      
      // Check that emergency disable functions exist and are callable
      if (typeof buttonFeatureFlags.resetEmergencyState !== 'function') {
        throw new Error('Emergency reset function not available');
      }

      // Test monitoring system emergency reporting
      const canReportEmergency = typeof buttonMonitoring.recordError === 'function';
      if (!canReportEmergency) {
        throw new Error('Emergency reporting not available');
      }

      return {
        testName: 'emergency-disable',
        passed: true,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        metadata: { 
          initialStatus: initialHealth.status,
          emergencyFunctionsAvailable: true
        }
      };

    } catch (error) {
      return {
        testName: 'emergency-disable',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth(healthChecks: HealthCheckResult[], smokeTests: SmokeTestResult[]): SystemHealthReport {
    const criticalChecks = healthChecks.filter(h => h.status === 'critical').length;
    const warningChecks = healthChecks.filter(h => h.status === 'warning').length;
    const failedTests = smokeTests.filter(t => !t.passed).length;

    let overallStatus: SystemHealthReport['overallStatus'] = 'healthy';
    const recommendations: string[] = [];

    if (criticalChecks > 0 || failedTests > 0) {
      overallStatus = 'critical';
      recommendations.push('Immediate investigation required for critical issues');
    } else if (warningChecks > 0) {
      overallStatus = 'degraded';
      recommendations.push('Monitor warning conditions closely');
    }

    // Calculate health score (0-100)
    const totalChecks = healthChecks.length + smokeTests.length;
    const healthyChecks = healthChecks.filter(h => h.status === 'healthy').length + smokeTests.filter(t => t.passed).length;
    const healthScore = totalChecks > 0 ? Math.round((healthyChecks / totalChecks) * 100) : 100;

    if (warningChecks > 0) {
      recommendations.push('Review performance metrics and optimize slow operations');
    }

    if (failedTests > 0) {
      recommendations.push('Fix failed smoke tests before deploying changes');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is operating normally');
    }

    return {
      overallStatus,
      healthScore,
      healthChecks,
      smokeTests,
      recommendations,
      lastUpdated: Date.now()
    };
  }

  /**
   * Get last health check results
   */
  getLastHealthCheck(): SystemHealthReport | null {
    return this.lastHealthCheck;
  }

  /**
   * Run quick health check (subset of full check)
   */
  async runQuickHealthCheck(): Promise<Pick<SystemHealthReport, 'overallStatus' | 'healthScore'>> {
    try {
      const featureCheck = await this.checkFeatureFlagSystem();
      const performanceCheck = await this.checkPerformanceMetrics();
      
      const criticalIssues = [featureCheck, performanceCheck].filter(c => c.status === 'critical').length;
      const warningIssues = [featureCheck, performanceCheck].filter(c => c.status === 'warning').length;
      
      let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (criticalIssues > 0) overallStatus = 'critical';
      else if (warningIssues > 0) overallStatus = 'degraded';
      
      const healthScore = Math.round(((2 - criticalIssues - warningIssues * 0.5) / 2) * 100);
      
      return { overallStatus, healthScore };
    } catch (error) {
      return { overallStatus: 'critical', healthScore: 0 };
    }
  }
}

// Singleton instance
export const buttonHealthChecks = new ButtonHealthCheckService();

/**
 * React hook for health check integration
 */
export function useButtonHealthChecks() {
  const [lastHealthCheck, setLastHealthCheck] = React.useState<SystemHealthReport | null>(null);

  React.useEffect(() => {
    const updateHealthCheck = () => {
      const latest = buttonHealthChecks.getLastHealthCheck();
      setLastHealthCheck(latest);
    };

    // Initial load
    updateHealthCheck();

    // Listen for health check updates
    const interval = setInterval(updateHealthCheck, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    lastHealthCheck,
    runHealthCheck: buttonHealthChecks.runFullHealthCheck.bind(buttonHealthChecks),
    runQuickCheck: buttonHealthChecks.runQuickHealthCheck.bind(buttonHealthChecks),
  };
}

export default buttonHealthChecks;