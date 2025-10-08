import { db } from './db';
import { 
  contentSchedules, 
  scheduleJobs, 
  contentReleaseAudit, 
  userContentAccess,
  users,
  notifications,
  liveEvents,
  polls,
  certificates,
  userProgress,
  pollResponses,
  liveChatMessages
} from '../shared/schema';
import { eq, and, lte, or, isNull, inArray, desc, gte, isNotNull, count } from 'drizzle-orm';
import { NotificationService } from '../src/lib/notificationService';

export interface SchedulerConfig {
  pollIntervalMs: number;
  maxConcurrentJobs: number;
  retryDelayMs: number;
  healthCheckIntervalMs: number;
  enableMetrics: boolean;
}

export interface SchedulerMetrics {
  totalJobsProcessed: number;
  successfulJobs: number;
  failedJobs: number;
  averageExecutionTime: number;
  lastHealthCheck: Date;
  isHealthy: boolean;
}

export interface ContentReleaseParams {
  scheduleId: string;
  contentType: string;
  contentId?: string;
  targetUsers?: string[];
  contentMetadata?: any;
  personalizationRules?: any;
  abTestVariant?: string;
}

export class ContentScheduler {
  private config: SchedulerConfig;
  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private activeJobs: Set<string> = new Set();
  private metrics: SchedulerMetrics = {
    totalJobsProcessed: 0,
    successfulJobs: 0,
    failedJobs: 0,
    averageExecutionTime: 0,
    lastHealthCheck: new Date(),
    isHealthy: true
  };

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      pollIntervalMs: 30000, // 30 seconds
      maxConcurrentJobs: 5,
      retryDelayMs: 300000, // 5 minutes
      healthCheckIntervalMs: 60000, // 1 minute
      enableMetrics: true,
      ...config
    };
  }

  /**
   * Start the content scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Content scheduler is already running');
      return;
    }

    console.log('Starting content scheduler...');
    this.isRunning = true;

    // Start polling for jobs
    this.pollTimer = setInterval(() => {
      this.processPendingJobs().catch(error => {
        console.error('Error processing pending jobs:', error);
      });
    }, this.config.pollIntervalMs);

    // Start health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck().catch(error => {
        console.error('Error performing health check:', error);
      });
    }, this.config.healthCheckIntervalMs);

    // Process any existing pending jobs immediately
    await this.processPendingJobs();
    
    console.log('Content scheduler started successfully');
  }

  /**
   * Stop the content scheduler
   * SECURITY FIX: Prevents race condition during shutdown
   */
  async stop(): Promise<void> {
    console.log('Stopping content scheduler...');

    // CRITICAL: Set isRunning to false FIRST to prevent new jobs from starting
    this.isRunning = false;

    // CRITICAL: Clear timers IMMEDIATELY to prevent new polling cycles
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Wait for active jobs to complete with timeout
    const maxWaitTime = 30000; // 30 seconds max wait
    const startWait = Date.now();

    while (this.activeJobs.size > 0) {
      const elapsed = Date.now() - startWait;

      if (elapsed > maxWaitTime) {
        console.warn(`⚠️ Timeout waiting for ${this.activeJobs.size} jobs to complete. Force shutting down.`);
        console.warn(`⚠️ Remaining jobs: ${Array.from(this.activeJobs).join(', ')}`);
        break;
      }

      console.log(`Waiting for ${this.activeJobs.size} active jobs to complete... (${Math.round(elapsed / 1000)}s elapsed)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (this.activeJobs.size === 0) {
      console.log('✅ Content scheduler stopped gracefully - all jobs completed');
    } else {
      console.log('⚠️ Content scheduler stopped with force - some jobs may not have completed');
    }
  }

  /**
   * Process pending jobs that are ready to execute
   * SECURITY FIX: Double-checks isRunning before starting each job to prevent race conditions
   */
  private async processPendingJobs(): Promise<void> {
    // CRITICAL: Check isRunning BEFORE doing any work
    if (!this.isRunning) return;

    try {
      // Find jobs that are ready to execute
      const now = new Date();
      const pendingJobs = await db
        .select()
        .from(scheduleJobs)
        .where(
          and(
            or(
              eq(scheduleJobs.status, 'pending'),
              eq(scheduleJobs.status, 'retrying')
            ),
            lte(scheduleJobs.scheduledFor, now)
          )
        )
        .orderBy(scheduleJobs.priority, scheduleJobs.scheduledFor)
        .limit(this.config.maxConcurrentJobs - this.activeJobs.size);

      // CRITICAL: Check isRunning again after async DB query
      if (!this.isRunning) return;

      console.log(`Found ${pendingJobs.length} jobs ready for execution`);

      // Process each job
      for (const job of pendingJobs) {
        // CRITICAL: Triple check before starting each job
        if (!this.isRunning) {
          console.log('Scheduler stopped - aborting job processing');
          break;
        }

        if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
          console.log('Max concurrent jobs reached - deferring remaining jobs');
          break;
        }

        // Start job asynchronously (non-blocking)
        this.processJob(job).catch(error => {
          console.error(`Error processing job ${job.id}:`, error);
        });
      }
    } catch (error) {
      console.error('Error fetching pending jobs:', error);
      this.metrics.isHealthy = false;
    }
  }

  /**
   * Process a single scheduled job
   * SECURITY FIX: Ensures job is properly tracked and cleaned up even on shutdown
   */
  private async processJob(job: any): Promise<void> {
    // CRITICAL: Final check before adding to active jobs
    if (!this.isRunning) {
      console.log(`Skipping job ${job.id} - scheduler is shutting down`);
      return;
    }

    const startTime = Date.now();
    this.activeJobs.add(job.id);
    
    try {
      console.log(`Processing job ${job.id} of type ${job.jobType}`);

      // Mark job as processing
      await db
        .update(scheduleJobs)
        .set({
          status: 'processing',
          startedAt: new Date(),
          attemptCount: job.attemptCount + 1,
          updatedAt: new Date()
        })
        .where(eq(scheduleJobs.id, job.id));

      // Get the associated schedule
      const schedule = await db
        .select()
        .from(contentSchedules)
        .where(eq(contentSchedules.id, job.scheduleId))
        .limit(1);

      if (!schedule.length) {
        throw new Error(`Schedule ${job.scheduleId} not found`);
      }

      const scheduleData = schedule[0];

      // Execute the job based on type
      let result: any;
      switch (job.jobType) {
        case 'content_release':
          result = await this.executeContentRelease(scheduleData, job);
          break;
        case 'notification':
          result = await this.executeNotification(scheduleData, job);
          break;
        case 'condition_check':
          result = await this.executeConditionCheck(scheduleData, job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.jobType}`);
      }

      // Mark job as completed
      await db
        .update(scheduleJobs)
        .set({
          status: 'completed',
          completedAt: new Date(),
          result: result,
          updatedAt: new Date()
        })
        .where(eq(scheduleJobs.id, job.id));

      // Update schedule execution count
      await db
        .update(contentSchedules)
        .set({
          executionCount: (scheduleData.executionCount || 0) + 1,
          lastExecutedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(contentSchedules.id, scheduleData.id));

      console.log(`Job ${job.id} completed successfully`);
      this.metrics.successfulJobs++;

    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);

      const shouldRetry = job.attemptCount < job.maxRetries;
      const nextRetryAt = shouldRetry 
        ? new Date(Date.now() + job.retryDelayMinutes * 60 * 1000)
        : null;

      // Update job with error status
      await db
        .update(scheduleJobs)
        .set({
          status: shouldRetry ? 'retrying' : 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : null,
          scheduledFor: nextRetryAt || job.scheduledFor,
          updatedAt: new Date()
        })
        .where(eq(scheduleJobs.id, job.id));

      this.metrics.failedJobs++;

      // Log audit entry for failed release
      await this.logReleaseAudit({
        scheduleId: job.scheduleId,
        jobId: job.id,
        contentType: 'unknown',
        releaseType: 'automatic',
        success: false,
        errorDetails: error instanceof Error ? error.message : String(error)
      });

    } finally {
      this.activeJobs.delete(job.id);
      
      // Update metrics
      const executionTime = Date.now() - startTime;
      this.metrics.totalJobsProcessed++;
      this.metrics.averageExecutionTime = 
        (this.metrics.averageExecutionTime * (this.metrics.totalJobsProcessed - 1) + executionTime) / 
        this.metrics.totalJobsProcessed;
    }
  }

  /**
   * Execute content release job
   */
  private async executeContentRelease(schedule: any, job: any): Promise<any> {
    const targetUsers = await this.getTargetUsers(schedule);
    
    console.log(`Releasing ${schedule.contentType} content to ${targetUsers.length} users`);

    // Create user content access records
    const accessRecords = targetUsers.map(userId => ({
      userId,
      scheduleId: schedule.id,
      contentType: schedule.contentType,
      contentId: schedule.contentId || `${schedule.contentType}-${schedule.id}`,
      accessGrantedAt: new Date(),
      accessMethod: 'scheduled',
      personalizedData: this.getPersonalizedData(schedule, userId),
      abTestVariant: schedule.abTestVariant
    }));

    if (accessRecords.length > 0) {
      await db.insert(userContentAccess).values(accessRecords);
    }

    // Send notifications to users about new content
    await this.notifyUsersOfNewContent(schedule, targetUsers);

    // Log the successful release
    await this.logReleaseAudit({
      scheduleId: schedule.id,
      jobId: job.id,
      contentType: schedule.contentType,
      contentId: schedule.contentId,
      releaseType: 'automatic',
      targetUsers: targetUsers,
      actualRecipients: targetUsers.length,
      success: true
    });

    return {
      contentType: schedule.contentType,
      contentId: schedule.contentId,
      recipientCount: targetUsers.length,
      executedAt: new Date()
    };
  }

  /**
   * Execute notification job
   */
  private async executeNotification(schedule: any, job: any): Promise<any> {
    const targetUsers = await this.getTargetUsers(schedule);
    
    for (const userId of targetUsers) {
      await NotificationService.createNotification({
        userId,
        title: schedule.contentMetadata?.title || 'New Content Available',
        message: schedule.contentMetadata?.message || 'Check out the latest content!',
        type: 'content',
        actionUrl: schedule.contentMetadata?.actionUrl,
        metadata: {
          scheduleId: schedule.id,
          contentType: schedule.contentType,
          abTestVariant: schedule.abTestVariant
        }
      });
    }

    return {
      notificationsSent: targetUsers.length,
      executedAt: new Date()
    };
  }

  /**
   * Execute condition check job
   */
  private async executeConditionCheck(schedule: any, job: any): Promise<any> {
    console.log(`Evaluating conditions for schedule ${schedule.id}`);
    
    if (!schedule.conditions || !Array.isArray(schedule.conditions)) {
      console.log('No conditions defined, marking as successful');
      return {
        conditionsChecked: true,
        conditionsMet: true,
        conditionsEvaluated: 0,
        executedAt: new Date()
      };
    }

    const conditions = schedule.conditions;
    const conditionLogic = schedule.conditionLogic || 'AND';
    const results = [];

    // Evaluate each condition
    for (const condition of conditions) {
      try {
        const result = await this.evaluateCondition(condition, schedule);
        results.push(result);
        console.log(`Condition "${condition.type}" evaluated to: ${result}`);
      } catch (error) {
        console.error(`Error evaluating condition ${condition.type}:`, error);
        results.push(false);
      }
    }

    // Apply logic (AND/OR)
    let conditionsMet: boolean;
    if (conditionLogic === 'OR') {
      conditionsMet = results.some(result => result === true);
    } else { // Default to AND
      conditionsMet = results.every(result => result === true);
    }

    console.log(`Conditions evaluation: ${results.length} conditions, logic: ${conditionLogic}, result: ${conditionsMet}`);

    // If conditions are met, create content release job
    if (conditionsMet) {
      await this.createScheduledJob({
        scheduleId: schedule.id,
        jobType: 'content_release',
        scheduledFor: new Date(), // Release immediately
        jobData: {
          triggerType: 'condition_based',
          conditionResults: results
        }
      });
      console.log(`Created content release job for schedule ${schedule.id}`);
    } else {
      // Schedule another condition check for later (if not at max attempts)
      const jobData = job.jobData || {};
      const attemptCount = jobData.conditionCheckAttempt || 0;
      const maxAttempts = schedule.maxExecutions || 10;

      if (attemptCount < maxAttempts) {
        const nextCheckTime = new Date(Date.now() + (schedule.conditionCheckInterval || 3600000)); // Default 1 hour
        await this.createScheduledJob({
          scheduleId: schedule.id,
          jobType: 'condition_check',
          scheduledFor: nextCheckTime,
          jobData: {
            conditionCheckAttempt: attemptCount + 1
          }
        });
        console.log(`Scheduled next condition check for ${nextCheckTime.toISOString()}`);
      } else {
        console.log(`Max condition check attempts reached for schedule ${schedule.id}`);
      }
    }

    return {
      conditionsChecked: true,
      conditionsMet,
      conditionsEvaluated: results.length,
      conditionResults: results,
      conditionLogic,
      executedAt: new Date()
    };
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: any, schedule: any): Promise<boolean> {
    if (!condition.type) {
      console.warn('Condition missing type, defaulting to false');
      return false;
    }

    console.log(`Evaluating condition: ${condition.type}`, condition);

    switch (condition.type) {
      case 'user_action':
        return await this.evaluateUserActionCondition(condition);
      
      case 'time_based':
        return await this.evaluateTimeBasedCondition(condition);
      
      case 'content_access':
        return await this.evaluateContentAccessCondition(condition);
      
      case 'poll_response':
        return await this.evaluatePollResponseCondition(condition);
      
      case 'chapter_completion':
        return await this.evaluateChapterCompletionCondition(condition);
      
      case 'event_participation':
        return await this.evaluateEventParticipationCondition(condition);
      
      case 'user_attributes':
        return await this.evaluateUserAttributesCondition(condition);
      
      case 'custom_sql':
        return await this.evaluateCustomSQLCondition(condition);
      
      default:
        console.warn(`Unknown condition type: ${condition.type}`);
        return false;
    }
  }

  /**
   * Evaluate user action conditions
   */
  private async evaluateUserActionCondition(condition: any): Promise<boolean> {
    const { action, threshold = 1, timeWindow } = condition;
    
    // Accumulate predicates to avoid overwriting .where() calls
    const predicates = [];
    
    if (timeWindow) {
      const timeWindowStart = new Date(Date.now() - timeWindow * 60 * 1000);
      predicates.push(gte(userProgress.lastAccessed, timeWindowStart));
    }
    
    if (action === 'chapter_completed') {
      predicates.push(isNotNull(userProgress.completedAt));
    }
    
    let query = db.select({ count: count() }).from(userProgress);
    
    if (predicates.length > 0) {
      query = query.where(and(...predicates));
    }
    
    const result = await query;
    return (result[0]?.count || 0) >= threshold;
  }

  /**
   * Evaluate time-based conditions
   */
  private async evaluateTimeBasedCondition(condition: any): Promise<boolean> {
    const { timeType, value, operator = 'gte' } = condition;
    const now = new Date();
    
    switch (timeType) {
      case 'absolute':
        const targetTime = new Date(value);
        return operator === 'gte' ? now >= targetTime : now <= targetTime;
      
      case 'relative_hours':
        const hoursAgo = new Date(now.getTime() - value * 60 * 60 * 1000);
        return operator === 'gte' ? now >= hoursAgo : now <= hoursAgo;
      
      case 'day_of_week':
        return now.getDay() === value;
      
      case 'hour_of_day':
        return now.getHours() === value;
      
      default:
        return false;
    }
  }

  /**
   * Evaluate content access conditions
   */
  private async evaluateContentAccessCondition(condition: any): Promise<boolean> {
    const { contentType, contentId, accessType = 'any', threshold = 1 } = condition;
    
    // Accumulate predicates to avoid overwriting .where() calls
    const predicates = [];
    
    if (contentType) {
      predicates.push(eq(userContentAccess.contentType, contentType));
    }
    
    if (contentId) {
      predicates.push(eq(userContentAccess.contentId, contentId));
    }
    
    let query = db.select({ count: count() }).from(userContentAccess);
    
    if (predicates.length > 0) {
      query = query.where(and(...predicates));
    }
    
    const result = await query;
    return (result[0]?.count || 0) >= threshold;
  }

  /**
   * Evaluate poll response conditions
   */
  private async evaluatePollResponseCondition(condition: any): Promise<boolean> {
    const { pollId, responseValue, threshold = 1 } = condition;
    
    // Accumulate predicates to avoid overwriting .where() calls
    const predicates = [];
    
    if (pollId) {
      predicates.push(eq(pollResponses.pollId, pollId));
    }
    
    if (responseValue !== undefined) {
      // Fix schema field name: selectedOption instead of responseValue
      predicates.push(eq(pollResponses.selectedOption, responseValue));
    }
    
    let query = db.select({ count: count() }).from(pollResponses);
    
    if (predicates.length > 0) {
      query = query.where(and(...predicates));
    }
    
    const result = await query;
    return (result[0]?.count || 0) >= threshold;
  }

  /**
   * Evaluate chapter completion conditions
   */
  private async evaluateChapterCompletionCondition(condition: any): Promise<boolean> {
    const { chapterId, completionRate, userCount } = condition;
    
    if (userCount) {
      // Check if specific number of users completed
      const completedPredicates = [isNotNull(userProgress.completedAt)];
      if (chapterId) {
        completedPredicates.push(eq(userProgress.chapterId, chapterId));
      }
      
      const completedQuery = db.select({ count: count() })
        .from(userProgress)
        .where(and(...completedPredicates));
      
      const completed = await completedQuery;
      return (completed[0]?.count || 0) >= userCount;
    }
    
    if (completionRate) {
      // Check completion rate percentage
      const completedPredicates = [isNotNull(userProgress.completedAt)];
      const totalPredicates = [];
      
      if (chapterId) {
        completedPredicates.push(eq(userProgress.chapterId, chapterId));
        totalPredicates.push(eq(userProgress.chapterId, chapterId));
      }
      
      const [completedResult, totalResult] = await Promise.all([
        db.select({ count: count() })
          .from(userProgress)
          .where(and(...completedPredicates)),
        totalPredicates.length > 0 
          ? db.select({ count: count() })
              .from(userProgress)
              .where(and(...totalPredicates))
          : db.select({ count: count() })
              .from(userProgress)
      ]);
      
      const completed = completedResult[0]?.count || 0;
      const total = totalResult[0]?.count || 0;
      
      if (total === 0) return false;
      
      const actualRate = (completed / total) * 100;
      return actualRate >= completionRate;
    }
    
    return false;
  }

  /**
   * Evaluate event participation conditions
   */
  private async evaluateEventParticipationCondition(condition: any): Promise<boolean> {
    const { eventId, participationType, threshold = 1 } = condition;
    
    switch (participationType) {
      case 'chat_messages':
        let chatQuery = db.select({ count: count() }).from(liveChatMessages);
        if (eventId) {
          chatQuery = chatQuery.where(eq(liveChatMessages.eventId, eventId));
        }
        const chatResult = await chatQuery;
        return (chatResult[0]?.count || 0) >= threshold;
      
      case 'poll_responses':
        if (eventId) {
          // Join with polls to filter by event
          const pollQuery = db.select({ count: count() })
            .from(pollResponses)
            .innerJoin(polls, eq(pollResponses.pollId, polls.id))
            .where(eq(polls.eventId, eventId));
          
          const pollResult = await pollQuery;
          return (pollResult[0]?.count || 0) >= threshold;
        } else {
          // No event filter, count all poll responses
          const pollQuery = db.select({ count: count() }).from(pollResponses);
          const pollResult = await pollQuery;
          return (pollResult[0]?.count || 0) >= threshold;
        }
      
      default:
        return false;
    }
  }

  /**
   * Evaluate user attributes conditions
   */
  private async evaluateUserAttributesCondition(condition: any): Promise<boolean> {
    const { attribute, operator = 'eq', value, threshold = 1 } = condition;
    
    if (!attribute) {
      console.warn('User attributes condition missing attribute, defaulting to false');
      return false;
    }
    
    // Build predicates based on user attributes
    const predicates = [];
    
    switch (attribute) {
      case 'isAdmin':
        if (operator === 'eq') {
          predicates.push(eq(users.isAdmin, Boolean(value)));
        }
        break;
      case 'emailVerified':
        if (operator === 'eq') {
          predicates.push(eq(users.emailVerified, Boolean(value)));
        }
        break;
      case 'email':
        if (operator === 'eq' && value) {
          predicates.push(eq(users.email, String(value)));
        } else if (operator === 'contains' && value) {
          // This would require SQL LIKE - skip for now
          console.warn('Email contains operator not implemented yet');
          return false;
        }
        break;
      case 'createdAt':
        if (operator === 'gte' && value) {
          predicates.push(gte(users.createdAt, new Date(value)));
        } else if (operator === 'lte' && value) {
          predicates.push(lte(users.createdAt, new Date(value)));
        }
        break;
      default:
        console.warn(`Unknown user attribute: ${attribute}`);
        return false;
    }
    
    if (predicates.length === 0) {
      console.warn('No valid predicates for user attributes condition');
      return false;
    }
    
    const query = db.select({ count: count() })
      .from(users)
      .where(and(...predicates));
    
    const result = await query;
    return (result[0]?.count || 0) >= threshold;
  }

  /**
   * Evaluate custom SQL conditions (advanced)
   */
  private async evaluateCustomSQLCondition(condition: any): Promise<boolean> {
    const { query: sqlQuery, expectedValue = true } = condition;
    
    try {
      // For security, this would need proper validation/whitelisting in production
      console.warn('Custom SQL conditions should be carefully validated for security');
      
      // Basic safety check - only allow SELECT statements
      if (!sqlQuery.trim().toLowerCase().startsWith('select')) {
        console.error('Custom SQL condition must be a SELECT statement');
        return false;
      }
      
      // For now, return false for security - this would need proper implementation
      console.log('Custom SQL conditions not fully implemented for security reasons');
      return false;
      
    } catch (error) {
      console.error('Error evaluating custom SQL condition:', error);
      return false;
    }
  }

  /**
   * Get target users based on schedule criteria
   */
  private async getTargetUsers(schedule: any): Promise<string[]> {
    if (!schedule.targetAudience) {
      // No targeting criteria, return all users
      const allUsers = await db.select({ id: users.id }).from(users);
      return allUsers.map(u => u.id);
    }

    // Apply targeting logic based on criteria
    let query = db.select({ id: users.id }).from(users);
    
    // Add targeting filters here based on schedule.targetAudience
    // For now, return all users
    const targetUsers = await query;
    return targetUsers.map(u => u.id);
  }

  /**
   * Get personalized data for a user
   */
  private getPersonalizedData(schedule: any, userId: string): any {
    if (!schedule.personalizationRules) return null;
    
    // Apply personalization rules here
    return schedule.personalizationRules;
  }

  /**
   * Notify users of new content availability
   */
  private async notifyUsersOfNewContent(schedule: any, userIds: string[]): Promise<void> {
    const contentTypeLabels: Record<string, string> = {
      chapter: 'Chapter',
      poll: 'Poll',
      certificate: 'Certificate',
      event: 'Event',
      memory: 'Memory'
    };

    const contentLabel = contentTypeLabels[schedule.contentType] || 'Content';
    
    // Send traditional notifications
    for (const userId of userIds) {
      await NotificationService.createNotification({
        userId,
        title: `🎉 New ${contentLabel} Available!`,
        message: schedule.title || `A new ${contentLabel.toLowerCase()} is now available for you.`,
        type: 'content',
        actionUrl: this.getContentUrl(schedule),
        metadata: {
          scheduleId: schedule.id,
          contentType: schedule.contentType,
          contentId: schedule.contentId
        }
      });
    }

    // Send real-time WebSocket notifications for immediate content availability
    await this.sendRealTimeContentNotifications(schedule, userIds);
  }

  /**
   * Send real-time WebSocket notifications for content availability
   */
  private async sendRealTimeContentNotifications(schedule: any, userIds: string[]): Promise<void> {
    try {
      const { webSocketManager } = await import('./websocket');
      
      const contentUpdateMessage = {
        type: 'content_available',
        payload: {
          contentType: schedule.contentType,
          contentId: schedule.contentId,
          scheduleId: schedule.id,
          title: schedule.title,
          description: schedule.description,
          availableAt: new Date().toISOString(),
          actionUrl: this.getContentUrl(schedule)
        },
        timestamp: Date.now()
      };

      // Send to each affected user
      for (const userId of userIds) {
        webSocketManager.sendNotificationToUser(userId, contentUpdateMessage);
      }

      console.log(`Sent real-time content availability notifications to ${userIds.length} users for ${schedule.contentType}:${schedule.contentId}`);
    } catch (error) {
      console.error('Error sending real-time content notifications:', error);
    }
  }

  /**
   * Get the URL for content based on type
   */
  private getContentUrl(schedule: any): string {
    switch (schedule.contentType) {
      case 'chapter':
        return `/before/${schedule.contentId}`;
      case 'poll':
        return `/event#poll-${schedule.contentId}`;
      case 'certificate':
        return `/certificates/${schedule.contentId}`;
      case 'event':
        return `/event`;
      case 'memory':
        return `/after#memory-${schedule.contentId}`;
      default:
        return '/';
    }
  }

  /**
   * Log content release audit entry
   */
  private async logReleaseAudit(params: {
    scheduleId: string;
    jobId?: string;
    contentType: string;
    contentId?: string;
    releaseType: string;
    targetUsers?: string[];
    actualRecipients?: number;
    executedBy?: string;
    success: boolean;
    errorDetails?: string;
  }): Promise<void> {
    await db.insert(contentReleaseAudit).values({
      scheduleId: params.scheduleId,
      jobId: params.jobId,
      contentType: params.contentType,
      contentId: params.contentId,
      releaseType: params.releaseType,
      targetUsers: params.targetUsers,
      actualRecipients: params.actualRecipients || 0,
      executedBy: params.executedBy,
      success: params.success,
      errorDetails: params.errorDetails
    });
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // Check database connectivity
      await db.select().from(contentSchedules).limit(1);
      
      // Check for stuck jobs
      const stuckJobs = await db
        .select()
        .from(scheduleJobs)
        .where(
          and(
            eq(scheduleJobs.status, 'processing'),
            lte(scheduleJobs.startedAt, new Date(Date.now() - 3600000)) // 1 hour ago
          )
        );

      // Reset stuck jobs
      if (stuckJobs.length > 0) {
        console.warn(`Found ${stuckJobs.length} stuck jobs, resetting...`);
        await db
          .update(scheduleJobs)
          .set({
            status: 'retrying',
            scheduledFor: new Date(Date.now() + this.config.retryDelayMs),
            updatedAt: new Date()
          })
          .where(inArray(scheduleJobs.id, stuckJobs.map(j => j.id)));
      }

      this.metrics.isHealthy = true;
      this.metrics.lastHealthCheck = new Date();

    } catch (error) {
      console.error('Health check failed:', error);
      this.metrics.isHealthy = false;
    }
  }

  /**
   * Get scheduler metrics
   */
  getMetrics(): SchedulerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get status information
   */
  getStatus(): {
    isRunning: boolean;
    activeJobs: number;
    metrics: SchedulerMetrics;
  } {
    return {
      isRunning: this.isRunning,
      activeJobs: this.activeJobs.size,
      metrics: this.getMetrics()
    };
  }

  /**
   * Create a new scheduled job
   */
  async createScheduledJob(params: {
    scheduleId: string;
    jobType: 'content_release' | 'notification' | 'condition_check';
    scheduledFor: Date;
    jobData?: any;
    priority?: number;
  }): Promise<string> {
    const result = await db.insert(scheduleJobs).values({
      scheduleId: params.scheduleId,
      jobType: params.jobType,
      scheduledFor: params.scheduledFor,
      jobData: params.jobData,
      priority: params.priority || 5
    }).returning();

    return result[0].id;
  }

  /**
   * Cancel a scheduled job
   */
  async cancelScheduledJob(jobId: string): Promise<void> {
    await db
      .update(scheduleJobs)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(scheduleJobs.id, jobId));
  }
}

// Export singleton instance
export const contentScheduler = new ContentScheduler();