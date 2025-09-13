import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  serial
} from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  isAdmin: boolean("is_admin").default(false),
  emailVerified: boolean("email_verified").default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CMS-specific tables for content management
export const contentBackups = pgTable("content_backups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: varchar("filename").notNull(),
  content: text("content").notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mediaAssets = pgTable("media_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  cloudUrl: varchar("cloud_url").notNull(),
  fileSize: varchar("file_size"),
  dimensions: varchar("dimensions"),
  mimeType: varchar("mime_type"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Progress Tracking
export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  chapterId: varchar("chapter_id").notNull(),
  cardIndex: integer("card_index").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
  timeSpent: integer("time_spent"), // seconds
  lastAccessed: timestamp("last_accessed").defaultNow(),
});

// Interactive Polls and Quizzes
export const polls = pgTable("polls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => liveEvents.id), // Link polls to events
  chapterId: varchar("chapter_id"),
  cardIndex: integer("card_index"),
  question: text("question").notNull(),
  options: jsonb("options").notNull(), // Array of poll options
  pollType: varchar("poll_type").notNull(), // 'quiz', 'poll', 'survey'
  
  // Enhanced CMS features
  status: varchar("status").default('draft'), // 'draft', 'scheduled', 'live', 'closed'
  scheduleId: varchar("schedule_id").references(() => contentSchedules.id),
  targetAudience: jsonb("target_audience"), // User criteria for targeting
  allowMultiple: boolean("allow_multiple").default(false),
  showResults: boolean("show_results").default(true),
  
  // Quiz-specific fields
  correctAnswer: varchar("correct_answer"), // For quiz questions
  explanation: text("explanation"), // Explanation for quiz answers
  timeLimit: integer("time_limit"), // Time limit in seconds
  points: integer("points"), // Points awarded for correct answer
  showFeedback: boolean("show_feedback").default(true),
  
  // Legacy fields
  isLive: boolean("is_live").default(false),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const pollResponses = pgTable("poll_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").references(() => polls.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  selectedOption: varchar("selected_option").notNull(),
  isCorrect: boolean("is_correct"), // For quiz responses
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Live Event Features
export const liveEvents = pgTable("live_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  isActive: boolean("is_active").default(false),
  settings: jsonb("settings"), // Event configuration
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const qaSessions = pgTable("qa_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => liveEvents.id),
  question: text("question").notNull(),
  askedBy: varchar("asked_by").references(() => users.id).notNull(),
  answeredBy: varchar("answered_by").references(() => users.id),
  answer: text("answer"),
  isModerated: boolean("is_moderated").default(false),
  isAnswered: boolean("is_answered").default(false),
  upvotes: integer("upvotes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  answeredAt: timestamp("answered_at"),
});

export const liveChatMessages = pgTable("live_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => liveEvents.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  messageType: varchar("message_type").default('text'), // 'text', 'reaction', 'system'
  isModerated: boolean("is_moderated").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
});

// Event Memories and Post-Event Content
export const eventMemories = pgTable("event_memories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => liveEvents.id),
  title: varchar("title").notNull(),
  description: text("description"),
  mediaUrl: varchar("media_url"),
  mediaType: varchar("media_type"), // 'image', 'video', 'audio'
  tags: jsonb("tags"), // Array of tags
  isPublic: boolean("is_public").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Memory Wallet - Personal collection of memories from cards, chapters, and events
export const userMemoryWallet = pgTable("user_memory_wallet", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Memory content
  title: varchar("title").notNull(),
  description: text("description"),
  mediaUrl: varchar("media_url"),
  mediaType: varchar("media_type"), // 'image', 'video', 'audio', 'text', 'achievement'
  thumbnail: varchar("thumbnail"), // Thumbnail/preview URL
  
  // Source information
  sourceType: varchar("source_type").notNull(), // 'card', 'chapter', 'event', 'poll', 'quiz', 'manual'
  sourceId: varchar("source_id"), // ID of the source content
  sourceMetadata: jsonb("source_metadata"), // Additional context about the source
  
  // Event/Chapter context
  eventId: varchar("event_id").references(() => liveEvents.id),
  chapterId: varchar("chapter_id"),
  cardIndex: integer("card_index"),
  
  // Collection details
  collectedAt: timestamp("collected_at").defaultNow(),
  collectionTrigger: varchar("collection_trigger"), // 'auto', 'manual', 'completion', 'achievement'
  collectionContext: jsonb("collection_context"), // Details about how it was collected
  
  // User customization
  userNotes: text("user_notes"), // Personal notes added by user
  isFavorite: boolean("is_favorite").default(false),
  tags: jsonb("tags"), // User-added tags
  
  // Metadata and organization
  memoryCategory: varchar("memory_category"), // 'milestone', 'learning', 'interaction', 'achievement', 'moment'
  emotionalTone: varchar("emotional_tone"), // 'positive', 'neutral', 'reflective', 'exciting'
  displayOrder: integer("display_order"), // For custom ordering
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Memory Wallet Collections - For organizing memories into themed groups
export const memoryWalletCollections = pgTable("memory_wallet_collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  name: varchar("name").notNull(),
  description: text("description"),
  color: varchar("color"), // Hex color for theming
  icon: varchar("icon"), // Icon identifier
  
  isDefault: boolean("is_default").default(false), // Default collections like "Favorites", "Achievements"
  displayOrder: integer("display_order"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Junction table for memories in collections
export const memoryWalletItems = pgTable("memory_wallet_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  collectionId: varchar("collection_id").references(() => memoryWalletCollections.id).notNull(),
  memoryId: varchar("memory_id").references(() => userMemoryWallet.id).notNull(),
  
  addedAt: timestamp("added_at").defaultNow(),
  displayOrder: integer("display_order"),
});

export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  eventId: varchar("event_id").references(() => liveEvents.id),
  chapterId: varchar("chapter_id"),
  certificateType: varchar("certificate_type").notNull(), // 'completion', 'participation', 'achievement'
  title: varchar("title").notNull(),
  description: text("description"),
  certificateUrl: varchar("certificate_url"),
  issuedAt: timestamp("issued_at").defaultNow(),
});

// User Engagement and Analytics
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  sessionStart: timestamp("session_start").defaultNow(),
  sessionEnd: timestamp("session_end"),
  pagesVisited: jsonb("pages_visited"), // Array of page visits
  totalTimeSpent: integer("total_time_spent"), // seconds
  deviceInfo: jsonb("device_info"),
});

export const contentInteractions = pgTable("content_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  contentType: varchar("content_type").notNull(), // 'card', 'video', 'ar', 'poll'
  contentId: varchar("content_id").notNull(),
  interactionType: varchar("interaction_type").notNull(), // 'view', 'click', 'complete', 'share'
  duration: integer("duration"), // seconds
  metadata: jsonb("metadata"), // Additional interaction data
  timestamp: timestamp("timestamp").defaultNow(),
});

// Notifications System
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull(), // 'event', 'content', 'achievement', 'reminder'
  isRead: boolean("is_read").default(false),
  actionUrl: varchar("action_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});

// Enhanced Content Scheduling System
export const contentSchedules = pgTable("content_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  
  // Content Reference
  contentType: varchar("content_type").notNull(), // 'chapter', 'poll', 'notification', 'certificate', 'event', 'memory'
  contentId: varchar("content_id"), // Reference to specific content
  contentMetadata: jsonb("content_metadata"), // Additional content configuration
  
  // Scheduling Configuration
  scheduleType: varchar("schedule_type").notNull(), // 'absolute', 'relative', 'conditional', 'manual'
  triggerTime: timestamp("trigger_time"), // Absolute time (for absolute schedules)
  relativeToEvent: varchar("relative_to_event"), // Event ID for relative schedules
  relativeTiming: jsonb("relative_timing"), // { type: 'event_start|event_end|user_action', offset_minutes: number }
  
  // Conditional Release Logic
  conditions: jsonb("conditions"), // Array of conditions that must be met
  conditionLogic: varchar("condition_logic").default('AND'), // 'AND' or 'OR'
  
  // Targeting and Personalization
  targetAudience: jsonb("target_audience"), // User criteria for targeting
  personalizationRules: jsonb("personalization_rules"), // User-specific customizations
  
  // A/B Testing
  abTestConfig: jsonb("ab_test_config"), // A/B test configuration
  abTestVariant: varchar("ab_test_variant"), // Which variant this schedule represents
  
  // Timezone and Recurrence
  timezone: varchar("timezone").default('UTC'),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: jsonb("recurrence_rule"), // RRULE-like configuration
  
  // Status and Execution
  status: varchar("status").default('active'), // 'active', 'paused', 'completed', 'cancelled', 'failed'
  executionCount: integer("execution_count").default(0),
  lastExecutedAt: timestamp("last_executed_at"),
  nextExecutionAt: timestamp("next_execution_at"),
  
  // Priority and Constraints
  priority: integer("priority").default(5), // 1-10, higher = more important
  maxExecutions: integer("max_executions"), // Limit number of executions
  executionTimeoutMinutes: integer("execution_timeout_minutes").default(60),
  
  // Administrative
  createdBy: varchar("created_by").references(() => users.id),
  lastModifiedBy: varchar("last_modified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
});

// Schedule Job Queue for Background Processing
export const scheduleJobs = pgTable("schedule_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").references(() => contentSchedules.id).notNull(),
  jobType: varchar("job_type").notNull(), // 'content_release', 'notification', 'condition_check'
  
  // Execution Details
  status: varchar("status").default('pending'), // 'pending', 'processing', 'completed', 'failed', 'retrying'
  scheduledFor: timestamp("scheduled_for").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Retry Logic
  attemptCount: integer("attempt_count").default(0),
  maxRetries: integer("max_retries").default(3),
  retryDelayMinutes: integer("retry_delay_minutes").default(5),
  
  // Execution Results
  result: jsonb("result"), // Execution outcome and data
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),
  
  // Job Metadata
  jobData: jsonb("job_data"), // Serialized job parameters
  priority: integer("priority").default(5),
  processingNode: varchar("processing_node"), // Which server/worker processed this
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content Release Audit Log
export const contentReleaseAudit = pgTable("content_release_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").references(() => contentSchedules.id),
  jobId: varchar("job_id").references(() => scheduleJobs.id),
  
  // Release Details
  contentType: varchar("content_type").notNull(),
  contentId: varchar("content_id"),
  releaseType: varchar("release_type").notNull(), // 'automatic', 'manual', 'emergency_override'
  
  // Targeting Information
  targetUsers: jsonb("target_users"), // List of user IDs who received the content
  actualRecipients: integer("actual_recipients"), // Count of users who actually received it
  
  // Execution Context
  executedBy: varchar("executed_by").references(() => users.id), // Admin who triggered manual release
  executionContext: jsonb("execution_context"), // Additional context about the release
  
  // Timing Information
  scheduledTime: timestamp("scheduled_time"),
  actualReleaseTime: timestamp("actual_release_time").defaultNow(),
  delayMinutes: integer("delay_minutes"), // Difference between scheduled and actual
  
  // Results and Analytics
  success: boolean("success").notNull(),
  errorDetails: text("error_details"),
  performanceMetrics: jsonb("performance_metrics"), // Execution time, resource usage, etc.
  
  createdAt: timestamp("created_at").defaultNow(),
});

// User Content Access Tracking
export const userContentAccess = pgTable("user_content_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  scheduleId: varchar("schedule_id").references(() => contentSchedules.id),
  
  // Access Details
  contentType: varchar("content_type").notNull(),
  contentId: varchar("content_id").notNull(),
  accessGrantedAt: timestamp("access_granted_at").notNull(),
  accessMethod: varchar("access_method").notNull(), // 'scheduled', 'manual', 'condition_met'
  
  // User Interaction
  firstAccessedAt: timestamp("first_accessed_at"),
  lastAccessedAt: timestamp("last_accessed_at"),
  totalAccessCount: integer("total_access_count").default(0),
  
  // Personalization Data
  personalizedData: jsonb("personalized_data"), // User-specific content modifications
  abTestVariant: varchar("ab_test_variant"), // Which A/B test variant user received
  
  // Status
  isActive: boolean("is_active").default(true),
  removedAt: timestamp("removed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Emergency Override System
export const emergencyOverrides = pgTable("emergency_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  
  // Override Type
  overrideType: varchar("override_type").notNull(), // 'release_now', 'cancel_schedule', 'modify_timing', 'pause_all'
  affectedSchedules: jsonb("affected_schedules"), // List of schedule IDs affected
  
  // Override Details
  newReleaseTime: timestamp("new_release_time"),
  overrideReason: text("override_reason").notNull(),
  urgencyLevel: varchar("urgency_level").notNull(), // 'low', 'medium', 'high', 'critical'
  
  // Approval Workflow
  requestedBy: varchar("requested_by").references(() => users.id).notNull(),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvalStatus: varchar("approval_status").default('pending'), // 'pending', 'approved', 'rejected'
  approvalNotes: text("approval_notes"),
  
  // Execution
  executedAt: timestamp("executed_at"),
  executionResult: jsonb("execution_result"),
  rollbackData: jsonb("rollback_data"), // Data needed to rollback the override
  
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Collaboration and Social Features
export const userNotes = pgTable("user_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  chapterId: varchar("chapter_id").notNull(),
  cardIndex: integer("card_index").notNull(),
  note: text("note").notNull(),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const forumPosts = pgTable("forum_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  category: varchar("category").notNull(),
  tags: jsonb("tags"),
  isPinned: boolean("is_pinned").default(false),
  replyCount: integer("reply_count").default(0),
  lastActivity: timestamp("last_activity").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const forumReplies = pgTable("forum_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => forumPosts.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Feedback and Surveys
export const feedbackSurveys = pgTable("feedback_surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull(), // Array of survey questions
  isActive: boolean("is_active").default(true),
  targetAudience: jsonb("target_audience"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const surveyResponses = pgTable("survey_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => feedbackSurveys.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  responses: jsonb("responses").notNull(), // User's answers
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Export all types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type ContentBackup = typeof contentBackups.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;
export type Poll = typeof polls.$inferSelect;
export type PollResponse = typeof pollResponses.$inferSelect;
export type LiveEvent = typeof liveEvents.$inferSelect;
export type QASession = typeof qaSessions.$inferSelect;
export type LiveChatMessage = typeof liveChatMessages.$inferSelect;
export type EventMemory = typeof eventMemories.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type ContentInteraction = typeof contentInteractions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ContentSchedule = typeof contentSchedules.$inferSelect;
export type UpsertContentSchedule = typeof contentSchedules.$inferInsert;
export type ScheduleJob = typeof scheduleJobs.$inferSelect;
export type UpsertScheduleJob = typeof scheduleJobs.$inferInsert;
export type ContentReleaseAudit = typeof contentReleaseAudit.$inferSelect;
export type UserContentAccess = typeof userContentAccess.$inferSelect;
export type EmergencyOverride = typeof emergencyOverrides.$inferSelect;
export type UserNote = typeof userNotes.$inferSelect;
export type ForumPost = typeof forumPosts.$inferSelect;
export type ForumReply = typeof forumReplies.$inferSelect;
export type FeedbackSurvey = typeof feedbackSurveys.$inferSelect;
export type SurveyResponse = typeof surveyResponses.$inferSelect;