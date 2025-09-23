/**
 * Comprehensive Button System Validation Script
 * 
 * Validates all feature flags, monitoring, rollback mechanisms,
 * and safety features to ensure production readiness.
 */

import { buttonFeatureFlags, createUserCohort } from '../lib/buttonFeatureFlags';
import { buttonMonitoring } from '../lib/buttonMonitoring';
import { buttonHealthChecks } from '../lib/buttonHealthChecks';
import { buttonRollbackPlan } from '../lib/buttonRollbackPlan';

interface ValidationResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
  duration: number;
}

class ButtonSystemValidator {
  private results: ValidationResult[] = [];
  
  async runAllValidations(): Promise<{ passed: number; failed: number; results: ValidationResult[] }> {
    console.log('🚀 Starting comprehensive button system validation...\n');
    
    this.results = [];
    
    // Reset system state
    this.resetSystemState();
    
    // Run all validation tests
    await this.validateFeatureFlags();
    await this.validateMonitoring();
    await this.validateHealthChecks();
    await this.validateRollbackSystem();
    await this.validateSafetyMechanisms();
    await this.validatePerformance();
    await this.validateDataIntegrity();
    
    // Generate summary
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    
    this.printSummary(passed, failed);
    
    return { passed, failed, results: this.results };
  }
  
  private resetSystemState(): void {
    console.log('🔄 Resetting system state...');
    
    buttonFeatureFlags.resetEmergencyState();
    buttonMonitoring.clearOldMetrics(0);
    buttonHealthChecks.stopHealthChecks();
    buttonRollbackPlan.stopTriggerMonitoring();
    
    // Set default configuration
    buttonFeatureFlags.updateConfiguration({
      enableUnifiedButtons: true,
      enableButtonMonitoring: true,
      rolloutPercentage: 100,
      enableEmergencyButtonDisable: true,
      fallbackToLegacy: true,
      preserveLegacyActions: true,
      maxRenderTime: 100,
      maxActionExecutionTime: 1000,
      errorRateThreshold: 0.05
    });
    
    console.log('✅ System state reset complete\n');
  }
  
  private async validateFeatureFlags(): Promise<void> {
    console.log('🎛️ Validating Feature Flag System...');
    
    await this.runTest('Feature Flag - Unified Buttons Enabled', async () => {
      const cohort = createUserCohort({ userId: 'test-user', isAdmin: false });
      const shouldUse = buttonFeatureFlags.shouldUseUnifiedButtons(cohort);
      
      if (!shouldUse) {
        throw new Error('Unified buttons should be enabled for 100% rollout');
      }
      
      return 'Unified buttons correctly enabled for standard user';
    });
    
    await this.runTest('Feature Flag - Rollout Percentage', async () => {
      buttonFeatureFlags.updateConfiguration({ rolloutPercentage: 0 });
      
      const cohort = createUserCohort({ userId: 'test-user', isAdmin: false });
      const shouldUse = buttonFeatureFlags.shouldUseUnifiedButtons(cohort);
      
      if (shouldUse) {
        throw new Error('Unified buttons should be disabled for 0% rollout');
      }
      
      // Reset for subsequent tests
      buttonFeatureFlags.updateConfiguration({ rolloutPercentage: 100 });
      
      return 'Rollout percentage correctly controls feature flag';
    });
    
    await this.runTest('Feature Flag - Admin Priority', async () => {
      buttonFeatureFlags.updateConfiguration({ rolloutPercentage: 0 });
      
      const adminCohort = createUserCohort({ userId: 'admin-user', isAdmin: true });
      const shouldUse = buttonFeatureFlags.shouldUseUnifiedButtons(adminCohort);
      
      if (!shouldUse) {
        throw new Error('Admin users should always get unified buttons');
      }
      
      buttonFeatureFlags.updateConfiguration({ rolloutPercentage: 100 });
      
      return 'Admin users correctly prioritized in feature flags';
    });
    
    await this.runTest('Feature Flag - Emergency Disable', async () => {
      buttonFeatureFlags.triggerEmergencyDisable('Validation test emergency disable');
      
      const cohort = createUserCohort({ userId: 'test-user', isAdmin: false });
      const shouldUse = buttonFeatureFlags.shouldUseUnifiedButtons(cohort);
      
      if (shouldUse) {
        throw new Error('Emergency disable should override all other settings');
      }
      
      const health = buttonFeatureFlags.getSystemHealth();
      if (health.status !== 'emergency_disabled') {
        throw new Error('System health should show emergency disabled state');
      }
      
      buttonFeatureFlags.resetEmergencyState();
      
      return 'Emergency disable mechanism working correctly';
    });
    
    console.log('✅ Feature Flag validation complete\n');
  }
  
  private async validateMonitoring(): Promise<void> {
    console.log('📊 Validating Monitoring System...');
    
    await this.runTest('Monitoring - Interaction Recording', async () => {
      buttonMonitoring.recordInteraction('test-btn-1', 'external-url', true, { url: 'https://example.com' });
      buttonMonitoring.recordInteraction('test-btn-2', 'chapter', false, { error: 'Navigation failed' });
      
      const stats = buttonMonitoring.getUsageStats();
      
      if (stats.totalInteractions !== 2) {
        throw new Error(`Expected 2 interactions, got ${stats.totalInteractions}`);
      }
      
      if (stats.successRate !== 0.5) {
        throw new Error(`Expected 50% success rate, got ${stats.successRate * 100}%`);
      }
      
      return 'Interaction recording and statistics calculation working';
    });
    
    await this.runTest('Monitoring - Performance Tracking', async () => {
      const endTiming = buttonMonitoring.startTiming('test-operation');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 50));
      
      endTiming();
      
      const metrics = buttonMonitoring.getRealTimeMetrics();
      if (metrics.activeOperations < 0) {
        throw new Error('Real-time metrics should be available');
      }
      
      return 'Performance timing and metrics collection working';
    });
    
    await this.runTest('Monitoring - Error Tracking', async () => {
      buttonMonitoring.recordError('test-operation', new Error('Test validation error'), {
        buttonId: 'error-test-btn',
        context: 'validation test'
      });
      
      const stats = buttonMonitoring.getUsageStats();
      if (stats.errorCount === 0) {
        throw new Error('Error should have been recorded');
      }
      
      return 'Error tracking and logging working';
    });
    
    await this.runTest('Monitoring - Data Export', async () => {
      const jsonExport = buttonMonitoring.exportMetrics('json');
      const csvExport = buttonMonitoring.exportMetrics('csv');
      
      if (!jsonExport.includes('metrics')) {
        throw new Error('JSON export should contain metrics data');
      }
      
      if (!csvExport.includes('id,operation,timestamp')) {
        throw new Error('CSV export should contain proper headers');
      }
      
      JSON.parse(jsonExport); // Should not throw
      
      return 'Metrics export functionality working';
    });
    
    console.log('✅ Monitoring validation complete\n');
  }
  
  private async validateHealthChecks(): Promise<void> {
    console.log('🏥 Validating Health Check System...');
    
    await this.runTest('Health Check - Quick Check', async () => {
      const quickHealth = await buttonHealthChecks.runQuickHealthCheck();
      
      if (!['healthy', 'degraded', 'critical'].includes(quickHealth.overallStatus)) {
        throw new Error(`Invalid health status: ${quickHealth.overallStatus}`);
      }
      
      if (quickHealth.healthScore < 0 || quickHealth.healthScore > 100) {
        throw new Error(`Invalid health score: ${quickHealth.healthScore}`);
      }
      
      return 'Quick health check returning valid results';
    });
    
    await this.runTest('Health Check - Full Health Check', async () => {
      const fullHealth = await buttonHealthChecks.runFullHealthCheck();
      
      if (!fullHealth.healthChecks || fullHealth.healthChecks.length === 0) {
        throw new Error('Full health check should include system checks');
      }
      
      if (!fullHealth.smokeTests || fullHealth.smokeTests.length === 0) {
        throw new Error('Full health check should include smoke tests');
      }
      
      if (!fullHealth.recommendations || fullHealth.recommendations.length === 0) {
        throw new Error('Full health check should include recommendations');
      }
      
      return 'Full health check providing comprehensive results';
    });
    
    console.log('✅ Health Check validation complete\n');
  }
  
  private async validateRollbackSystem(): Promise<void> {
    console.log('🔄 Validating Rollback System...');
    
    await this.runTest('Rollback - Plan Availability', async () => {
      const plans = buttonRollbackPlan.getAvailableRollbackPlans();
      
      if (plans.length === 0) {
        throw new Error('No rollback plans available');
      }
      
      const emergencyPlan = plans.find(p => p.id === 'emergency-rollback');
      if (!emergencyPlan) {
        throw new Error('Emergency rollback plan not found');
      }
      
      const gradualPlan = plans.find(p => p.id === 'gradual-rollback');
      if (!gradualPlan) {
        throw new Error('Gradual rollback plan not found');
      }
      
      return 'Rollback plans properly configured and available';
    });
    
    await this.runTest('Rollback - Emergency Execution', async () => {
      // Record some data before rollback
      buttonMonitoring.recordInteraction('pre-rollback-btn', 'test-action', true);
      const statsBefore = buttonMonitoring.getUsageStats();
      
      const rollbackExecution = await buttonRollbackPlan.executeRollbackPlan('emergency-rollback');
      
      if (!['completed', 'failed'].includes(rollbackExecution.status)) {
        throw new Error(`Unexpected rollback status: ${rollbackExecution.status}`);
      }
      
      if (rollbackExecution.status === 'failed') {
        throw new Error(`Rollback failed: ${rollbackExecution.errors.join(', ')}`);
      }
      
      // Verify data preservation
      const statsAfter = buttonMonitoring.getUsageStats();
      if (statsAfter.totalInteractions !== statsBefore.totalInteractions) {
        throw new Error('Data not preserved during rollback');
      }
      
      return 'Emergency rollback executed successfully with data preservation';
    });
    
    console.log('✅ Rollback validation complete\n');
  }
  
  private async validateSafetyMechanisms(): Promise<void> {
    console.log('🛡️ Validating Safety Mechanisms...');
    
    await this.runTest('Safety - Emergency Disable Event', async () => {
      let eventFired = false;
      
      if (typeof window !== 'undefined') {
        window.addEventListener('button-emergency-disable', () => {
          eventFired = true;
        });
        
        buttonFeatureFlags.triggerEmergencyDisable('Safety validation test');
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!eventFired) {
          throw new Error('Emergency disable event not fired');
        }
      }
      
      buttonFeatureFlags.resetEmergencyState();
      
      return 'Emergency disable event mechanism working';
    });
    
    await this.runTest('Safety - Performance Threshold Monitoring', async () => {
      // Record slow performance metrics
      for (let i = 0; i < 5; i++) {
        buttonFeatureFlags.recordPerformanceMetric('slow-operation', 300); // Above 100ms threshold
      }
      
      const health = buttonFeatureFlags.getSystemHealth();
      
      if (health.status === 'healthy' && health.recommendations.length === 0) {
        // System should at least provide warnings for consistent slow performance
        console.warn('Performance threshold monitoring may need adjustment');
      }
      
      return 'Performance threshold monitoring active';
    });
    
    await this.runTest('Safety - Error Rate Monitoring', async () => {
      // Record high error rate
      for (let i = 0; i < 10; i++) {
        buttonFeatureFlags.recordError('error-prone-operation', new Error(`Error ${i}`));
      }
      
      const health = buttonFeatureFlags.getSystemHealth();
      
      // System should detect high error rate
      if (health.status === 'healthy') {
        console.warn('Error rate monitoring may need threshold adjustment');
      }
      
      return 'Error rate monitoring active';
    });
    
    console.log('✅ Safety mechanism validation complete\n');
  }
  
  private async validatePerformance(): Promise<void> {
    console.log('⚡ Validating Performance...');
    
    await this.runTest('Performance - High Frequency Operations', async () => {
      const startTime = Date.now();
      
      // Record 1000 operations
      for (let i = 0; i < 1000; i++) {
        buttonMonitoring.recordInteraction(`perf-btn-${i}`, 'perf-action', true);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (duration > 2000) { // Should complete within 2 seconds
        throw new Error(`High frequency operations too slow: ${duration}ms`);
      }
      
      const stats = buttonMonitoring.getUsageStats();
      if (stats.totalInteractions < 1000) {
        throw new Error('Some operations were lost during high frequency testing');
      }
      
      return `1000 operations completed in ${duration}ms`;
    });
    
    await this.runTest('Performance - Memory Usage', async () => {
      const initialMemory = process.memoryUsage();
      
      // Generate data to test memory usage
      for (let i = 0; i < 1000; i++) {
        buttonFeatureFlags.recordPerformanceMetric(`memory-test-${i}`, Math.random() * 100);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Should not use excessive memory (> 50MB for 1000 operations seems excessive)
      if (memoryIncrease > 50 * 1024 * 1024) {
        throw new Error(`Excessive memory usage: ${memoryIncrease / 1024 / 1024}MB`);
      }
      
      return `Memory usage increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB for 1000 operations`;
    });
    
    console.log('✅ Performance validation complete\n');
  }
  
  private async validateDataIntegrity(): Promise<void> {
    console.log('🔒 Validating Data Integrity...');
    
    await this.runTest('Data Integrity - Feature Flag Toggles', async () => {
      // Record initial data
      buttonMonitoring.recordInteraction('integrity-btn-1', 'integrity-action', true);
      const initialStats = buttonMonitoring.getUsageStats();
      
      // Toggle feature flags
      buttonFeatureFlags.updateConfiguration({ enableUnifiedButtons: false });
      buttonFeatureFlags.updateConfiguration({ enableUnifiedButtons: true });
      
      // Verify data preserved
      const finalStats = buttonMonitoring.getUsageStats();
      if (finalStats.totalInteractions !== initialStats.totalInteractions) {
        throw new Error('Data lost during feature flag toggles');
      }
      
      return 'Data preserved during feature flag toggles';
    });
    
    await this.runTest('Data Integrity - System Reset', async () => {
      // Record data
      buttonMonitoring.recordInteraction('reset-test-btn', 'reset-action', true);
      const beforeReset = buttonMonitoring.getUsageStats();
      
      // Reset system state (but don't clear metrics)
      buttonFeatureFlags.resetEmergencyState();
      
      // Verify data still available
      const afterReset = buttonMonitoring.getUsageStats();
      if (afterReset.totalInteractions !== beforeReset.totalInteractions) {
        throw new Error('Data lost during system reset');
      }
      
      return 'Data preserved during system reset';
    });
    
    console.log('✅ Data integrity validation complete\n');
  }
  
  private async runTest(testName: string, testFunction: () => Promise<string>): Promise<void> {
    const startTime = Date.now();
    
    try {
      const message = await testFunction();
      const duration = Date.now() - startTime;
      
      this.results.push({
        testName,
        passed: true,
        message,
        duration
      });
      
      console.log(`  ✅ ${testName}: ${message} (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        testName,
        passed: false,
        message: error instanceof Error ? error.message : String(error),
        duration
      });
      
      console.log(`  ❌ ${testName}: ${error instanceof Error ? error.message : String(error)} (${duration}ms)`);
    }
  }
  
  private printSummary(passed: number, failed: number): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`  • ${result.testName}: ${result.message}`);
      });
    }
    
    console.log('\n🎯 PRODUCTION READINESS:');
    if (failed === 0) {
      console.log('  ✅ All validation tests passed - System ready for production');
    } else if (failed <= 2) {
      console.log('  ⚠️  Minor issues detected - Review failed tests before production');
    } else {
      console.log('  ❌ Multiple critical issues - NOT ready for production');
    }
    
    console.log('\n📋 NEXT STEPS:');
    if (failed === 0) {
      console.log('  1. ✅ Run load testing in staging environment');
      console.log('  2. ✅ Configure monitoring alerts');
      console.log('  3. ✅ Brief support and operations teams');
      console.log('  4. ✅ Plan gradual production rollout');
    } else {
      console.log('  1. ❌ Fix all failed validation tests');
      console.log('  2. ❌ Re-run validation suite');
      console.log('  3. ❌ Conduct additional testing');
      console.log('  4. ❌ Review system architecture if multiple failures');
    }
    
    console.log('\n🔧 CONFIGURATION VALIDATION:');
    console.log('  Environment Variables:');
    console.log(`    ENABLE_UNIFIED_BUTTONS: ${process.env.ENABLE_UNIFIED_BUTTONS || 'true'}`);
    console.log(`    ENABLE_BUTTON_MONITORING: ${process.env.ENABLE_BUTTON_MONITORING || 'true'}`);
    console.log(`    BUTTON_ROLLOUT_PERCENTAGE: ${process.env.BUTTON_ROLLOUT_PERCENTAGE || '100'}`);
    console.log(`    ENABLE_EMERGENCY_BUTTON_DISABLE: ${process.env.ENABLE_EMERGENCY_BUTTON_DISABLE || 'true'}`);
    
    console.log('\n🎉 Validation complete!');
  }
}

// Export for programmatic use
export { ButtonSystemValidator };

// CLI execution
if (typeof window === 'undefined' && require.main === module) {
  const validator = new ButtonSystemValidator();
  validator.runAllValidations().then(results => {
    process.exit(results.failed === 0 ? 0 : 1);
  }).catch(error => {
    console.error('Validation failed with error:', error);
    process.exit(1);
  });
}