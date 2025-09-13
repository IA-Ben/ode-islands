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
  chapterId: varchar("chapter_id"),
  cardIndex: integer("card_index"),
  question: text("question").notNull(),
  options: jsonb("options").notNull(), // Array of poll options
  pollType: varchar("poll_type").notNull(), // 'quiz', 'poll', 'survey'
  isLive: boolean("is_live").default(false),
  correctAnswer: varchar("correct_answer"), // For quiz questions
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

// Content Scheduling
export const scheduledContent = pgTable("scheduled_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chapterId: varchar("chapter_id").notNull(),
  releaseDate: timestamp("release_date").notNull(),
  isReleased: boolean("is_released").default(false),
  targetAudience: jsonb("target_audience"), // User criteria
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
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
export type ScheduledContent = typeof scheduledContent.$inferSelect;
export type UserNote = typeof userNotes.$inferSelect;
export type ForumPost = typeof forumPosts.$inferSelect;
export type ForumReply = typeof forumReplies.$inferSelect;
export type FeedbackSurvey = typeof feedbackSurveys.$inferSelect;
export type SurveyResponse = typeof surveyResponses.$inferSelect;