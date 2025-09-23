/**
 * Enterprise Metrics Service
 * 
 * Server-side metrics aggregation, real-time monitoring, alerting,
 * and performance analytics for enterprise deployment.
 */

import { eq, and, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { db } from './db';
import { systemMetrics, metricEvents, alertRules, alertInstances } from '../shared/schema';
import { isEnterpriseEnabled, isDegradedMode, getEnterpriseStatus } from './enterpriseConfig';

export interface MetricEvent {
  metricName: string;
  metricType: 'counter' | 'gauge' | 'histogram' | 'timer';
  value: number;
  dimensions?: Record<string, string>;
  sessionId?: string;
  userId?: string;
  userAgent?: string;
  timestamp?: Date;
}

export interface AggregatedMetric {
  id: string;
  metricName: string;
  metricType: string;
  category: string;
  value: number;
  count: number;
  min?: number;
  max?: number;
  avg?: number;
  percentile_50?: number;
  percentile_95?: number;
  percentile_99?: number;
  dimensions?: Record<string, string>;
  environment: string;
  aggregationWindow: string;
  windowStart: Date;
  windowEnd: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  category: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metricName: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  evaluationWindow: string;
  isEnabled: boolean;
  cooldownPeriod: number;
  autoResolve: boolean;
  notifications?: any;
  autoRollback: boolean;
  rollbackConditions?: any;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  score: number;
  components: {
    [component: string]: {
      status: 'healthy' | 'degraded' | 'critical';
      metrics: Record<string, number>;
      lastCheck: Date;
    };
  };
  activeAlerts: number;
  criticalAlerts: number;
}

class EnterpriseMetricsService {
  private aggregationInterval: NodeJS.Timeout | null = null;
  private alertEvaluationInterval: NodeJS.Timeout | null = null;
  private metricsBuffer: MetricEvent[] = [];
  private bufferFlushInterval = 5000; // 5 seconds
  private readonly maxBufferSize = 1000;

  constructor() {
    // Check if enterprise mode is enabled
    if (!isEnterpriseEnabled()) {
      console.info('📊 Metrics service running in degraded mode - enterprise features disabled');
      return;
    }
    
    this.startAggregationProcess();
    this.startAlertEvaluation();
    this.startBufferFlush();
  }

  /**
   * Ingest metrics from clients
   */
  async ingestMetrics(events: MetricEvent[]): Promise<void> {
    if (!isEnterpriseEnabled()) {
      return; // No-op in degraded mode
    }
    
    try {
      // Add to buffer for batch processing
      this.metricsBuffer.push(...events.map(event => ({
        ...event,
        timestamp: event.timestamp || new Date()
      })));

      // If buffer is getting full, flush immediately
      if (this.metricsBuffer.length >= this.maxBufferSize) {
        await this.flushMetricsBuffer();
      }

      console.debug(`📊 Ingested ${events.length} metric events`);
    } catch (error) {
      console.error('❌ Failed to ingest metrics:', error);
    }
  }

  /**
   * Ingest single metric event
   */
  async ingestMetric(event: MetricEvent): Promise<void> {
    return this.ingestMetrics([event]);
  }

  /**
   * Start buffer flush process
   */
  private startBufferFlush(): void {
    setInterval(() => {
      if (this.metricsBuffer.length > 0) {
        this.flushMetricsBuffer().catch(console.error);
      }
    }, this.bufferFlushInterval);
  }

  /**
   * Flush metrics buffer to database
   */
  private async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const events = this.metricsBuffer.splice(0); // Take all events and clear buffer

    try {
      // Batch insert metric events
      const dbEvents = events.map(event => ({
        metricName: event.metricName,
        metricType: event.metricType,
        value: event.value.toString(),
        dimensions: event.dimensions,
        sessionId: event.sessionId,
        userId: event.userId,
        userAgent: event.userAgent,
        clientTimestamp: event.timestamp,
        serverTimestamp: new Date()
      }));

      await db.insert(metricEvents).values(dbEvents);
      
      console.debug(`📊 Flushed ${events.length} metric events to database`);
    } catch (error) {
      console.warn('⚠️ Failed to flush metrics buffer - running in degraded mode:', error.message);
      // Put events back in buffer for retry (keep only recent ones)
      this.metricsBuffer.unshift(...events.slice(-100));
    }
  }

  /**
   * Start metric aggregation process
   */
  private startAggregationProcess(): void {
    // Aggregate every minute
    this.aggregationInterval = setInterval(() => {
      this.aggregateMetrics().catch(error => {
        console.warn('⚠️ Metric aggregation failed:', error.message);
      });
    }, 60000); // 1 minute

    // Initial aggregation
    setTimeout(() => {
      this.aggregateMetrics().catch(error => {
        console.warn('⚠️ Initial metric aggregation failed - service running in degraded mode:', error.message);
      });
    }, 5000); // Wait 5 seconds after startup
  }

  /**
   * Aggregate raw metrics into time windows
   */
  private async aggregateMetrics(): Promise<void> {
    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);

      // Get unprocessed metric events from the last minute
      const rawEvents = await db.select().from(metricEvents)
        .where(and(
          eq(metricEvents.processed, false),
          gte(metricEvents.serverTimestamp, oneMinuteAgo)
        ))
        .orderBy(asc(metricEvents.serverTimestamp));

      if (rawEvents.length === 0) {
        console.debug('📊 No metrics to aggregate');
        return;
      }

      // Group by metric name and dimensions
      const groups = new Map<string, typeof rawEvents>();
      
      rawEvents.forEach(event => {
        const key = `${event.metricName}:${JSON.stringify(event.dimensions || {})}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(event);
      });

      // Aggregate each group
      const aggregations = [];
      
      for (const [key, events] of groups.entries()) {
        const firstEvent = events[0];
        const values = events.map(e => parseFloat(e.value));
        
        const aggregation = {
          metricName: firstEvent.metricName,
          metricType: firstEvent.metricType,
          category: this.categorizeMetric(firstEvent.metricName),
          value: values.reduce((sum, val) => sum + val, 0),
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          percentile_50: this.calculatePercentile(values, 0.5),
          percentile_95: this.calculatePercentile(values, 0.95),
          percentile_99: this.calculatePercentile(values, 0.99),
          dimensions: firstEvent.dimensions,
          environment: 'production', // TODO: Get from environment
          aggregationWindow: '1m',
          windowStart: oneMinuteAgo,
          windowEnd: now,
          source: 'client'
        };

        aggregations.push(aggregation);
      }

      // Insert aggregated metrics
      if (aggregations.length > 0) {
        await db.insert(systemMetrics).values(aggregations.map(agg => ({
          ...agg,
          value: agg.value.toString(),
          min: agg.min?.toString(),
          max: agg.max?.toString(),
          avg: agg.avg?.toString(),
          percentile_50: agg.percentile_50?.toString(),
          percentile_95: agg.percentile_95?.toString(),
          percentile_99: agg.percentile_99?.toString()
        })));
      }

      // Mark raw events as processed
      await db.update(metricEvents)
        .set({ 
          processed: true, 
          processedAt: now 
        })
        .where(
          sql`id IN (${rawEvents.map(e => e.id).join(',').split(',').map(() => '?').join(',')})`
        );

      console.info(`📊 Aggregated ${rawEvents.length} events into ${aggregations.length} metric aggregations`);
    } catch (error) {
      console.error('❌ Failed to aggregate metrics:', error);
    }
  }

  /**
   * Calculate percentile from array of values
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }

  /**
   * Categorize metric by name
   */
  private categorizeMetric(metricName: string): string {
    if (metricName.includes('error') || metricName.includes('fail')) {
      return 'error';
    }
    if (metricName.includes('time') || metricName.includes('duration') || metricName.includes('latency')) {
      return 'performance';
    }
    if (metricName.includes('count') || metricName.includes('rate') || metricName.includes('usage')) {
      return 'usage';
    }
    if (metricName.includes('business') || metricName.includes('conversion')) {
      return 'business';
    }
    return 'other';
  }

  /**
   * Start alert evaluation process
   */
  private startAlertEvaluation(): void {
    // Evaluate alerts every minute
    this.alertEvaluationInterval = setInterval(() => {
      this.evaluateAlerts().catch(error => {
        console.warn('⚠️ Alert evaluation failed:', error.message);
      });
    }, 60000);

    // Initial evaluation
    setTimeout(() => {
      this.evaluateAlerts().catch(error => {
        console.warn('⚠️ Initial alert evaluation failed - running without alerts:', error.message);
      });
    }, 10000);
  }

  /**
   * Evaluate alert rules against current metrics
   */
  private async evaluateAlerts(): Promise<void> {
    try {
      const activeRules = await db.select().from(alertRules)
        .where(eq(alertRules.isEnabled, true));

      for (const rule of activeRules) {
        await this.evaluateAlertRule(rule as AlertRule);
      }

      console.debug(`🚨 Evaluated ${activeRules.length} alert rules`);
    } catch (error) {
      console.error('❌ Failed to evaluate alerts:', error);
    }
  }

  /**
   * Evaluate single alert rule
   */
  private async evaluateAlertRule(rule: AlertRule): Promise<void> {
    try {
      // Get recent metric for this rule
      const windowMs = this.parseTimeWindow(rule.evaluationWindow);
      const windowStart = new Date(Date.now() - windowMs);

      const recentMetrics = await db.select().from(systemMetrics)
        .where(and(
          eq(systemMetrics.metricName, rule.metricName),
          gte(systemMetrics.windowStart, windowStart)
        ))
        .orderBy(desc(systemMetrics.windowStart))
        .limit(1);

      if (recentMetrics.length === 0) {
        console.debug(`No recent metrics found for alert rule: ${rule.name}`);
        return;
      }

      const metric = recentMetrics[0];
      const currentValue = parseFloat(metric.value);
      
      // Evaluate condition
      let alertTriggered = false;
      switch (rule.operator) {
        case '>':
          alertTriggered = currentValue > rule.threshold;
          break;
        case '<':
          alertTriggered = currentValue < rule.threshold;
          break;
        case '>=':
          alertTriggered = currentValue >= rule.threshold;
          break;
        case '<=':
          alertTriggered = currentValue <= rule.threshold;
          break;
        case '==':
          alertTriggered = currentValue === rule.threshold;
          break;
        case '!=':
          alertTriggered = currentValue !== rule.threshold;
          break;
      }

      // Check if alert should be fired
      if (alertTriggered) {
        await this.fireAlert(rule, currentValue);
      } else if (rule.autoResolve) {
        await this.resolveAlert(rule);
      }
    } catch (error) {
      console.error(`❌ Failed to evaluate alert rule ${rule.name}:`, error);
    }
  }

  /**
   * Fire an alert
   */
  private async fireAlert(rule: AlertRule, currentValue: number): Promise<void> {
    try {
      // Check for existing active alert
      const existingAlert = await db.select().from(alertInstances)
        .where(and(
          eq(alertInstances.ruleId, rule.id),
          eq(alertInstances.status, 'firing')
        ))
        .limit(1);

      if (existingAlert.length > 0) {
        // Alert already active, check cooldown
        const lastAlert = existingAlert[0];
        const timeSinceLastAlert = Date.now() - lastAlert.firedAt.getTime();
        
        if (timeSinceLastAlert < rule.cooldownPeriod * 1000) {
          return; // Still in cooldown period
        }
      }

      // Create new alert instance
      await db.insert(alertInstances).values({
        ruleId: rule.id,
        status: 'firing',
        currentValue: currentValue.toString(),
        firedAt: new Date(),
        context: {
          metricName: rule.metricName,
          threshold: rule.threshold,
          operator: rule.operator,
          evaluationWindow: rule.evaluationWindow
        }
      });

      console.warn(`🚨 ALERT FIRED: ${rule.name} - ${rule.metricName} ${rule.operator} ${rule.threshold} (current: ${currentValue})`);

      // Send notifications if configured
      if (rule.notifications) {
        await this.sendAlertNotifications(rule, currentValue);
      }

      // Trigger auto-rollback if configured
      if (rule.autoRollback && rule.severity === 'critical') {
        await this.triggerAutoRollback(rule, currentValue);
      }
    } catch (error) {
      console.error('❌ Failed to fire alert:', error);
    }
  }

  /**
   * Resolve an alert
   */
  private async resolveAlert(rule: AlertRule): Promise<void> {
    try {
      const activeAlerts = await db.select().from(alertInstances)
        .where(and(
          eq(alertInstances.ruleId, rule.id),
          eq(alertInstances.status, 'firing')
        ));

      if (activeAlerts.length > 0) {
        await db.update(alertInstances)
          .set({
            status: 'resolved',
            resolvedAt: new Date()
          })
          .where(and(
            eq(alertInstances.ruleId, rule.id),
            eq(alertInstances.status, 'firing')
          ));

        console.info(`✅ ALERT RESOLVED: ${rule.name}`);
      }
    } catch (error) {
      console.error('❌ Failed to resolve alert:', error);
    }
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(rule: AlertRule, currentValue: number): Promise<void> {
    // TODO: Implement actual notification sending (email, Slack, webhooks, etc.)
    console.warn(`📧 Alert notification would be sent for: ${rule.name}`);
  }

  /**
   * Trigger automatic rollback
   */
  private async triggerAutoRollback(rule: AlertRule, currentValue: number): Promise<void> {
    // TODO: Integrate with rollback service
    console.error(`🔄 Auto-rollback would be triggered for: ${rule.name}`);
  }

  /**
   * Get system health overview
   */
  async getSystemHealth(): Promise<SystemHealth> {
    if (!isEnterpriseEnabled()) {
      // Return degraded mode health status
      const enterpriseStatus = getEnterpriseStatus();
      return {
        overall: 'degraded',
        score: 50,
        components: {
          'enterprise_features': {
            status: 'degraded',
            metrics: { availability: 0 },
            lastCheck: new Date()
          }
        },
        activeAlerts: 0,
        criticalAlerts: 0
      };
    }
    
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Get recent metrics by category
      const recentMetrics = await db.select().from(systemMetrics)
        .where(gte(systemMetrics.windowStart, fiveMinutesAgo))
        .orderBy(desc(systemMetrics.windowStart));

      // Get active alerts
      const activeAlerts = await db.select().from(alertInstances)
        .where(eq(alertInstances.status, 'firing'));

      const criticalAlerts = activeAlerts.filter(alert => 
        alert.context?.severity === 'critical'
      ).length;

      // Aggregate metrics by component
      const components: SystemHealth['components'] = {};
      
      recentMetrics.forEach(metric => {
        const component = metric.metricName.split('.')[0] || 'system';
        
        if (!components[component]) {
          components[component] = {
            status: 'healthy',
            metrics: {},
            lastCheck: metric.windowEnd
          };
        }
        
        components[component].metrics[metric.metricName] = parseFloat(metric.value);
      });

      // Calculate overall health score
      let healthScore = 100;
      if (criticalAlerts > 0) {
        healthScore -= criticalAlerts * 25; // -25 per critical alert
      }
      if (activeAlerts.length > 0) {
        healthScore -= (activeAlerts.length - criticalAlerts) * 5; // -5 per non-critical alert
      }
      
      healthScore = Math.max(0, healthScore);

      // Determine overall status
      let overall: SystemHealth['overall'] = 'healthy';
      if (criticalAlerts > 0 || healthScore < 50) {
        overall = 'critical';
      } else if (activeAlerts.length > 0 || healthScore < 80) {
        overall = 'degraded';
      }

      return {
        overall,
        score: healthScore,
        components,
        activeAlerts: activeAlerts.length,
        criticalAlerts
      };
    } catch (error) {
      console.error('❌ Failed to get system health:', error);
      return {
        overall: 'critical',
        score: 0,
        components: {},
        activeAlerts: 0,
        criticalAlerts: 0
      };
    }
  }

  /**
   * Get metrics for a time range
   */
  async getMetrics(
    metricNames: string[],
    startTime: Date,
    endTime: Date,
    aggregationWindow: string = '1m'
  ): Promise<AggregatedMetric[]> {
    try {
      const metrics = await db.select().from(systemMetrics)
        .where(and(
          sql`metric_name = ANY(${metricNames})`,
          gte(systemMetrics.windowStart, startTime),
          lte(systemMetrics.windowEnd, endTime),
          eq(systemMetrics.aggregationWindow, aggregationWindow)
        ))
        .orderBy(asc(systemMetrics.windowStart));

      return metrics.map(metric => ({
        ...metric,
        value: parseFloat(metric.value),
        min: metric.min ? parseFloat(metric.min) : undefined,
        max: metric.max ? parseFloat(metric.max) : undefined,
        avg: metric.avg ? parseFloat(metric.avg) : undefined,
        percentile_50: metric.percentile_50 ? parseFloat(metric.percentile_50) : undefined,
        percentile_95: metric.percentile_95 ? parseFloat(metric.percentile_95) : undefined,
        percentile_99: metric.percentile_99 ? parseFloat(metric.percentile_99) : undefined,
      })) as AggregatedMetric[];
    } catch (error) {
      console.error('❌ Failed to get metrics:', error);
      return [];
    }
  }

  /**
   * Parse time window string to milliseconds
   */
  private parseTimeWindow(window: string): number {
    const match = window.match(/^(\d+)([smhd])$/);
    if (!match) return 60000; // Default 1 minute
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60000;
    }
  }

  /**
   * Cleanup old metrics and events
   */
  async cleanup(): Promise<void> {
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Delete old raw events (keep for 3 days)
      await db.delete(metricEvents)
        .where(lte(metricEvents.serverTimestamp, threeDaysAgo));

      // Delete old aggregated metrics (keep for 30 days)
      await db.delete(systemMetrics)
        .where(lte(systemMetrics.windowStart, thirtyDaysAgo));

      // Delete resolved alerts older than 30 days
      await db.delete(alertInstances)
        .where(and(
          eq(alertInstances.status, 'resolved'),
          lte(alertInstances.firedAt, thirtyDaysAgo)
        ));

      console.info('🧹 Metrics cleanup completed');
    } catch (error) {
      console.error('❌ Failed to cleanup old metrics:', error);
    }
  }

  /**
   * Shutdown cleanup
   */
  shutdown(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    if (this.alertEvaluationInterval) {
      clearInterval(this.alertEvaluationInterval);
    }
  }
}

// Export singleton instance
export const metricsService = new EnterpriseMetricsService();
export default metricsService;