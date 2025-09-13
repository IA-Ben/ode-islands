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
  certificates
} from '../shared/schema';
import { eq, and, lte, or, isNull, inArray, desc } from 'drizzle-orm';
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
   */
  async stop(): Promise<void> {
    console.log('Stopping content scheduler...');
    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Wait for active jobs to complete
    while (this.activeJobs.size > 0) {
      console.log(`Waiting for ${this.activeJobs.size} active jobs to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Content scheduler stopped');
  }

  /**
   * Process pending jobs that are ready to execute
   */
  private async processPendingJobs(): Promise<void> {
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

      console.log(`Found ${pendingJobs.length} jobs ready for execution`);

      // Process each job
      for (const job of pendingJobs) {
        if (this.activeJobs.size >= this.config.maxConcurrentJobs) break;
        if (!this.isRunning) break;

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
   */
  private async processJob(job: any): Promise<void> {
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
    // This would check if conditions are met and create new jobs if needed
    // For now, return a placeholder
    return {
      conditionsChecked: true,
      executedAt: new Date()
    };
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