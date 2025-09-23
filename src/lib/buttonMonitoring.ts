/**
 * Button System Monitoring and Metrics Collection
 * 
 * Comprehensive monitoring for button rendering, interactions, and performance
 * with real-time metrics collection and alerting capabilities.
 */

import { buttonFeatureFlags } from './buttonFeatureFlags';

export interface ButtonMetric {
  id: string;
  operation: string;
  timestamp: number;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface ButtonPerformanceData {
  renderTime: number;
  actionExecutionTime: number;
  validationTime: number;
  navigationTime: number;
}

export interface ButtonUsageStats {
  totalInteractions: number;
  successRate: number;
  averageRenderTime: number;
  averageActionTime: number;
  errorCount: number;
  mostUsedActions: Array<{ action: string; count: number }>;
}

class ButtonMonitoringService {
  private metrics: ButtonMetric[] = [];
  private performanceBuffer: Map<string, ButtonPerformanceData[]> = new Map();
  private actionCounter: Map<string, number> = new Map();
  private errorLog: Array<{ timestamp: number; error: string; context: any }> = [];

  constructor() {
    this.setupPerformanceObserver();
    this.setupErrorBoundary();
  }

  /**
   * Setup Performance Observer for automatic metric collection
   */
  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes('button-')) {
            this.recordPerformanceEntry(entry);
          }
        });
      });

      observer.observe({ 
        entryTypes: ['measure', 'navigation', 'paint'] 
      });
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  /**
   * Setup global error boundary for button-related errors
   */
  private setupErrorBoundary(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      if (this.isButtonRelatedError(event.error)) {
        this.recordError('global-error', event.error, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      if (this.isButtonRelatedError(event.reason)) {
        this.recordError('unhandled-promise', event.reason, {
          type: 'promise-rejection'
        });
      }
    });
  }

  /**
   * Check if error is related to button system
   */
  private isButtonRelatedError(error: any): boolean {
    if (!error) return false;
    
    const errorString = error.toString().toLowerCase();
    const stackString = error.stack?.toLowerCase() || '';
    
    return errorString.includes('button') || 
           stackString.includes('cardbutton') ||
           stackString.includes('cardactionrouter') ||
           stackString.includes('cardeditorbuttons');
  }

  /**
   * Record performance entry from Performance Observer
   */
  private recordPerformanceEntry(entry: PerformanceEntry): void {
    const metric: ButtonMetric = {
      id: this.generateMetricId(),
      operation: entry.name,
      timestamp: Date.now(),
      duration: entry.duration,
      success: true,
      metadata: {
        entryType: entry.entryType,
        startTime: entry.startTime
      }
    };

    this.addMetric(metric);
  }

  /**
   * Start timing a button operation
   */
  startTiming(operation: string): () => void {
    const startTime = performance.now();
    const operationId = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return () => {
      const duration = performance.now() - startTime;
      this.recordTiming(operation, duration, operationId);
    };
  }

  /**
   * Record timing for a button operation
   */
  recordTiming(operation: string, duration: number, operationId?: string): void {
    const metric: ButtonMetric = {
      id: operationId || this.generateMetricId(),
      operation,
      timestamp: Date.now(),
      duration,
      success: true
    };

    this.addMetric(metric);
    buttonFeatureFlags.recordPerformanceMetric(operation, duration);

    // Add to performance buffer for aggregation
    const perfData = this.performanceBuffer.get(operation) || [];
    perfData.push({
      renderTime: operation.includes('render') ? duration : 0,
      actionExecutionTime: operation.includes('action') ? duration : 0,
      validationTime: operation.includes('validation') ? duration : 0,
      navigationTime: operation.includes('navigation') ? duration : 0
    });

    // Keep only last 100 entries per operation
    if (perfData.length > 100) {
      perfData.shift();
    }

    this.performanceBuffer.set(operation, perfData);
  }

  /**
   * Record an error
   */
  recordError(operation: string, error: Error | string, context?: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const metric: ButtonMetric = {
      id: this.generateMetricId(),
      operation,
      timestamp: Date.now(),
      success: false,
      errorMessage,
      metadata: {
        stack,
        context,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      }
    };

    this.addMetric(metric);
    buttonFeatureFlags.recordError(operation, error instanceof Error ? error : new Error(errorMessage));

    // Add to error log
    this.errorLog.push({
      timestamp: Date.now(),
      error: errorMessage,
      context: { operation, stack, ...context }
    });

    // Keep only last 1000 errors
    if (this.errorLog.length > 1000) {
      this.errorLog.shift();
    }

    console.error(`🔴 Button Error [${operation}]:`, errorMessage, context);
  }

  /**
   * Record button interaction
   */
  recordInteraction(buttonId: string, action: string, success: boolean, metadata?: any): void {
    const endTiming = this.startTiming(`interaction-${action}`);
    
    // Count action usage
    const actionKey = `${action}-${success ? 'success' : 'failure'}`;
    this.actionCounter.set(actionKey, (this.actionCounter.get(actionKey) || 0) + 1);

    const metric: ButtonMetric = {
      id: this.generateMetricId(),
      operation: 'interaction',
      timestamp: Date.now(),
      success,
      metadata: {
        buttonId,
        action,
        ...metadata
      }
    };

    this.addMetric(metric);
    endTiming();

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔵 Button Interaction: ${buttonId} -> ${action} (${success ? 'success' : 'failure'})`);
    }
  }

  /**
   * Record button validation result
   */
  recordValidation(buttonId: string, validationResult: { isValid: boolean; errors: string[] }, duration: number): void {
    const metric: ButtonMetric = {
      id: this.generateMetricId(),
      operation: 'validation',
      timestamp: Date.now(),
      duration,
      success: validationResult.isValid,
      errorMessage: validationResult.errors.join(', '),
      metadata: {
        buttonId,
        errorCount: validationResult.errors.length,
        errors: validationResult.errors
      }
    };

    this.addMetric(metric);
    
    if (!validationResult.isValid) {
      this.recordError('validation-failed', `Validation failed for button ${buttonId}`, {
        errors: validationResult.errors
      });
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(timeRange?: { start: number; end: number }): ButtonUsageStats {
    const filteredMetrics = timeRange
      ? this.metrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end)
      : this.metrics;

    const interactionMetrics = filteredMetrics.filter(m => m.operation === 'interaction');
    const renderMetrics = filteredMetrics.filter(m => m.operation.includes('render'));
    const actionMetrics = filteredMetrics.filter(m => m.operation.includes('action'));

    const totalInteractions = interactionMetrics.length;
    const successfulInteractions = interactionMetrics.filter(m => m.success).length;
    const successRate = totalInteractions > 0 ? successfulInteractions / totalInteractions : 1;

    const averageRenderTime = this.calculateAverageDuration(renderMetrics);
    const averageActionTime = this.calculateAverageDuration(actionMetrics);

    const errorCount = filteredMetrics.filter(m => !m.success).length;

    // Calculate most used actions
    const actionCounts = new Map<string, number>();
    interactionMetrics.forEach(metric => {
      const action = metric.metadata?.action || 'unknown';
      actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
    });

    const mostUsedActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalInteractions,
      successRate,
      averageRenderTime,
      averageActionTime,
      errorCount,
      mostUsedActions
    };
  }

  /**
   * Get real-time metrics for monitoring dashboard
   */
  getRealTimeMetrics(): {
    activeOperations: number;
    recentErrors: number;
    performanceTrends: Record<string, number[]>;
    healthScore: number;
  } {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    const recentMetrics = this.metrics.filter(m => m.timestamp > fiveMinutesAgo);
    const recentErrors = recentMetrics.filter(m => !m.success).length;
    const activeOperations = recentMetrics.length;

    // Calculate performance trends
    const performanceTrends: Record<string, number[]> = {};
    for (const [operation, perfData] of this.performanceBuffer) {
      const recent = perfData.slice(-20); // Last 20 measurements
      performanceTrends[operation] = recent.map(d => 
        d.renderTime + d.actionExecutionTime + d.validationTime + d.navigationTime
      );
    }

    // Calculate health score (0-100)
    const errorRate = activeOperations > 0 ? recentErrors / activeOperations : 0;
    const avgPerformance = Object.values(performanceTrends)
      .flat()
      .reduce((a, b, _, arr) => a + b / arr.length, 0);
    
    const healthScore = Math.max(0, Math.min(100, 
      100 - (errorRate * 50) - (Math.max(0, avgPerformance - 100) / 10)
    ));

    return {
      activeOperations,
      recentErrors,
      performanceTrends,
      healthScore: Math.round(healthScore)
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['id', 'operation', 'timestamp', 'duration', 'success', 'errorMessage'];
      const rows = this.metrics.map(m => [
        m.id,
        m.operation,
        m.timestamp,
        m.duration || '',
        m.success,
        m.errorMessage || ''
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify({
      metrics: this.metrics,
      performanceBuffer: Object.fromEntries(this.performanceBuffer),
      actionCounter: Object.fromEntries(this.actionCounter),
      errorLog: this.errorLog,
      exportTimestamp: Date.now()
    }, null, 2);
  }

  /**
   * Clear old metrics (cleanup)
   */
  clearOldMetrics(olderThan: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - olderThan;
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.errorLog = this.errorLog.filter(e => e.timestamp > cutoff);
    
    console.info(`🧹 Cleared metrics older than ${new Date(cutoff).toISOString()}`);
  }

  /**
   * Add metric to collection
   */
  private addMetric(metric: ButtonMetric): void {
    this.metrics.push(metric);
    
    // Keep only last 10,000 metrics in memory
    if (this.metrics.length > 10000) {
      this.metrics.shift();
    }
  }

  /**
   * Generate unique metric ID
   */
  private generateMetricId(): string {
    return `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate average duration from metrics
   */
  private calculateAverageDuration(metrics: ButtonMetric[]): number {
    const durationsWithValues = metrics.filter(m => m.duration !== undefined);
    if (durationsWithValues.length === 0) return 0;
    
    const total = durationsWithValues.reduce((sum, m) => sum + m.duration!, 0);
    return total / durationsWithValues.length;
  }
}

// Singleton instance
export const buttonMonitoring = new ButtonMonitoringService();

/**
 * React hook for button monitoring
 */
export function useButtonMonitoring() {
  return {
    startTiming: buttonMonitoring.startTiming.bind(buttonMonitoring),
    recordTiming: buttonMonitoring.recordTiming.bind(buttonMonitoring),
    recordError: buttonMonitoring.recordError.bind(buttonMonitoring),
    recordInteraction: buttonMonitoring.recordInteraction.bind(buttonMonitoring),
    recordValidation: buttonMonitoring.recordValidation.bind(buttonMonitoring),
    getUsageStats: buttonMonitoring.getUsageStats.bind(buttonMonitoring),
    getRealTimeMetrics: buttonMonitoring.getRealTimeMetrics.bind(buttonMonitoring),
  };
}

export default buttonMonitoring;