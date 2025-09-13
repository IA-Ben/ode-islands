import { contentScheduler, ContentScheduler } from './contentScheduler';
import { db } from './db';
import { contentSchedules, scheduleJobs } from '../shared/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

export interface ScheduleCreateParams {
  title: string;
  description?: string;
  contentType: string;
  contentId?: string;
  contentMetadata?: any;
  scheduleType: 'absolute' | 'relative' | 'conditional' | 'manual';
  triggerTime?: Date;
  relativeToEvent?: string;
  relativeTiming?: any;
  conditions?: any;
  targetAudience?: any;
  personalizationRules?: any;
  abTestConfig?: any;
  timezone?: string;
  isRecurring?: boolean;
  recurrenceRule?: any;
  priority?: number;
  createdBy: string;
}

export class SchedulerManager {
  private scheduler: ContentScheduler;
  private isInitialized: boolean = false;

  constructor() {
    this.scheduler = contentScheduler;
  }

  /**
   * Initialize the scheduler manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing Content Scheduler Manager...');
      
      // Start the background scheduler
      await this.scheduler.start();
      
      // Schedule any pending jobs that need immediate attention
      await this.scheduleImmediatePendingJobs();
      
      this.isInitialized = true;
      console.log('Content Scheduler Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Content Scheduler Manager:', error);
      throw error;
    }
  }

  /**
   * Shutdown the scheduler manager
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    console.log('Shutting down Content Scheduler Manager...');
    await this.scheduler.stop();
    this.isInitialized = false;
    console.log('Content Scheduler Manager stopped');
  }

  /**
   * Create a new content schedule
   */
  async createSchedule(params: ScheduleCreateParams): Promise<string> {
    // Insert the schedule record
    const scheduleResult = await db.insert(contentSchedules).values({
      title: params.title,
      description: params.description,
      contentType: params.contentType,
      contentId: params.contentId,
      contentMetadata: params.contentMetadata,
      scheduleType: params.scheduleType,
      triggerTime: params.triggerTime,
      relativeToEvent: params.relativeToEvent,
      relativeTiming: params.relativeTiming,
      conditions: params.conditions,
      targetAudience: params.targetAudience,
      personalizationRules: params.personalizationRules,
      abTestConfig: params.abTestConfig,
      timezone: params.timezone || 'UTC',
      isRecurring: params.isRecurring || false,
      recurrenceRule: params.recurrenceRule,
      priority: params.priority || 5,
      createdBy: params.createdBy,
      lastModifiedBy: params.createdBy
    }).returning();

    const scheduleId = scheduleResult[0].id;

    // Calculate when the job should execute
    const executionTime = this.calculateExecutionTime(params);
    
    if (executionTime) {
      // Create the scheduled job
      await this.scheduler.createScheduledJob({
        scheduleId,
        jobType: 'content_release',
        scheduledFor: executionTime,
        priority: params.priority || 5
      });

      // Update the schedule with next execution time
      await db
        .update(contentSchedules)
        .set({ nextExecutionAt: executionTime })
        .where(eq(contentSchedules.id, scheduleId));
    }

    return scheduleId;
  }

  /**
   * Get all schedules with optional filtering
   */
  async getSchedules(filters?: {
    status?: string;
    contentType?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    // Apply filters
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(contentSchedules.status, filters.status));
    }
    if (filters?.contentType) {
      conditions.push(eq(contentSchedules.contentType, filters.contentType));
    }
    if (filters?.fromDate) {
      conditions.push(gte(contentSchedules.nextExecutionAt, filters.fromDate));
    }
    if (filters?.toDate) {
      conditions.push(lte(contentSchedules.nextExecutionAt, filters.toDate));
    }

    // Build query with full chaining without reassignment
    const queryBuilder = db.select().from(contentSchedules);
    
    // Apply conditions if they exist
    const queryWithConditions = conditions.length > 0 
      ? queryBuilder.where(and(...conditions))
      : queryBuilder;

    // Apply ordering
    const queryWithOrdering = queryWithConditions.orderBy(desc(contentSchedules.createdAt));
    
    // Apply limit if specified
    const finalQuery = filters?.limit 
      ? queryWithOrdering.limit(filters.limit)
      : queryWithOrdering;

    return await finalQuery;
  }

  /**
   * Get a specific schedule by ID
   */
  async getSchedule(scheduleId: string): Promise<any | null> {
    const result = await db
      .select()
      .from(contentSchedules)
      .where(eq(contentSchedules.id, scheduleId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Update a schedule
   */
  async updateSchedule(scheduleId: string, updates: Partial<ScheduleCreateParams>): Promise<void> {
    // Update the schedule record
    await db
      .update(contentSchedules)
      .set({
        ...updates,
        lastModifiedBy: updates.createdBy, // Reuse createdBy as lastModifiedBy
        updatedAt: new Date()
      })
      .where(eq(contentSchedules.id, scheduleId));

    // If timing changed, update associated jobs
    if (updates.triggerTime || updates.scheduleType || updates.relativeTiming) {
      const newExecutionTime = this.calculateExecutionTime(updates as ScheduleCreateParams);
      
      if (newExecutionTime) {
        // Cancel existing pending jobs
        const existingJobs = await db
          .select()
          .from(scheduleJobs)
          .where(
            and(
              eq(scheduleJobs.scheduleId, scheduleId),
              eq(scheduleJobs.status, 'pending')
            )
          );

        for (const job of existingJobs) {
          await this.scheduler.cancelScheduledJob(job.id);
        }

        // Create new job
        await this.scheduler.createScheduledJob({
          scheduleId,
          jobType: 'content_release',
          scheduledFor: newExecutionTime,
          priority: updates.priority || 5
        });

        // Update next execution time
        await db
          .update(contentSchedules)
          .set({ nextExecutionAt: newExecutionTime })
          .where(eq(contentSchedules.id, scheduleId));
      }
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    // Cancel all pending jobs for this schedule
    const pendingJobs = await db
      .select()
      .from(scheduleJobs)
      .where(
        and(
          eq(scheduleJobs.scheduleId, scheduleId),
          eq(scheduleJobs.status, 'pending')
        )
      );

    for (const job of pendingJobs) {
      await this.scheduler.cancelScheduledJob(job.id);
    }

    // Mark schedule as archived instead of deleting
    await db
      .update(contentSchedules)
      .set({
        status: 'cancelled',
        archivedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(contentSchedules.id, scheduleId));
  }

  /**
   * Manually trigger a schedule release
   */
  async triggerScheduleNow(scheduleId: string, triggeredBy: string): Promise<void> {
    // Create an immediate job
    await this.scheduler.createScheduledJob({
      scheduleId,
      jobType: 'content_release',
      scheduledFor: new Date(),
      priority: 10, // High priority for manual triggers
      jobData: {
        triggeredBy,
        triggerType: 'manual'
      }
    });
  }

  /**
   * Get scheduler status and metrics
   */
  getSchedulerStatus(): any {
    return this.scheduler.getStatus();
  }

  /**
   * Get jobs for a specific schedule
   */
  async getScheduleJobs(scheduleId: string, limit: number = 50): Promise<any[]> {
    return await db
      .select()
      .from(scheduleJobs)
      .where(eq(scheduleJobs.scheduleId, scheduleId))
      .orderBy(desc(scheduleJobs.createdAt))
      .limit(limit);
  }

  /**
   * Get recent job executions across all schedules
   */
  async getRecentJobs(limit: number = 100): Promise<any[]> {
    return await db
      .select()
      .from(scheduleJobs)
      .orderBy(desc(scheduleJobs.createdAt))
      .limit(limit);
  }

  /**
   * Calculate when a job should execute based on schedule parameters
   */
  private calculateExecutionTime(params: Partial<ScheduleCreateParams>): Date | null {
    switch (params.scheduleType) {
      case 'absolute':
        return params.triggerTime || null;
      
      case 'relative':
        // For now, return null - would need event data to calculate
        return null;
      
      case 'conditional':
        // For conditional releases, don't schedule immediately
        return null;
      
      case 'manual':
        // Manual releases don't get automatically scheduled
        return null;
      
      default:
        return params.triggerTime || null;
    }
  }

  /**
   * Schedule any pending jobs that need immediate attention
   */
  private async scheduleImmediatePendingJobs(): Promise<void> {
    const now = new Date();
    
    // Find schedules that should have already executed but haven't
    const overdueSchedules = await db
      .select()
      .from(contentSchedules)
      .where(
        and(
          eq(contentSchedules.status, 'active'),
          lte(contentSchedules.nextExecutionAt, now)
        )
      );

    console.log(`Found ${overdueSchedules.length} overdue schedules to process`);

    for (const schedule of overdueSchedules) {
      await this.scheduler.createScheduledJob({
        scheduleId: schedule.id,
        jobType: 'content_release',
        scheduledFor: now,
        priority: 8 // High priority for overdue items
      });
    }
  }

  /**
   * Create a quick content release schedule (utility method)
   */
  async createQuickRelease(params: {
    title: string;
    contentType: string;
    contentId?: string;
    releaseTime: Date;
    targetAudience?: any;
    createdBy: string;
  }): Promise<string> {
    return await this.createSchedule({
      title: params.title,
      contentType: params.contentType,
      contentId: params.contentId,
      scheduleType: 'absolute',
      triggerTime: params.releaseTime,
      targetAudience: params.targetAudience,
      priority: 5,
      createdBy: params.createdBy
    });
  }
}

// Export singleton instance
export const schedulerManager = new SchedulerManager();