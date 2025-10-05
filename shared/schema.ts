import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
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
  
  // Legacy fields for backward compatibility
  passwordHash: varchar("password_hash"), // Will be deprecated
  isAdmin: boolean("is_admin").default(false),
  emailVerified: boolean("email_verified").default(false),
  lastLoginAt: timestamp("last_login_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chapters table for Before experience
export const chapters = pgTable("chapters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  summary: text("summary"),
  eventId: varchar("event_id").references(() => liveEvents.id),
  
  // Hierarchy fields
  parentId: varchar("parent_id").references((): any => chapters.id),
  depth: integer("depth").default(0),
  path: varchar("path"),
  
  order: integer("order").default(0),
  hasAR: boolean("has_ar").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    eventIdIndex: index("chapters_event_id_idx").on(table.eventId),
    parentIdIndex: index("chapters_parent_id_idx").on(table.parentId),
    depthIndex: index("chapters_depth_idx").on(table.depth),
    pathIndex: index("chapters_path_idx").on(table.path),
    orderIndex: index("chapters_order_idx").on(table.order),
  };
});

// Sub-chapters table
export const subChapters = pgTable("sub_chapters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chapterId: varchar("chapter_id").references(() => chapters.id).notNull(),
  title: varchar("title").notNull(),
  summary: text("summary"),
  order: integer("order").default(0),
  unlockConditions: jsonb("unlock_conditions"), // JSON array of conditions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    chapterIdIndex: index("sub_chapters_chapter_id_idx").on(table.chapterId),
    orderIndex: index("sub_chapters_order_idx").on(table.order),
  };
});

// Story cards table - content blocks for chapters
export const storyCards = pgTable("story_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chapterId: varchar("chapter_id").references(() => chapters.id).notNull(),
  order: integer("order").default(0),
  content: jsonb("content").notNull(), // JSON containing text, images, video references
  hasAR: boolean("has_ar").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    chapterIdIndex: index("story_cards_chapter_id_idx").on(table.chapterId),
    orderIndex: index("story_cards_order_idx").on(table.order),
  };
});

// Custom buttons table - flexible buttons for various parent types
export const customButtons = pgTable("custom_buttons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentType: varchar("parent_type").notNull(), // 'story_card', 'sub_chapter', 'chapter'
  parentId: varchar("parent_id").notNull(), // ID of the parent entity
  label: varchar("label").notNull(),
  variant: varchar("variant").default('primary'), // 'primary', 'secondary', 'link', 'ghost'
  icon: varchar("icon"), // Icon identifier
  destinationType: varchar("destination_type").notNull(), // 'sub-chapter', 'chapter', 'ar-item', 'event-route', 'wallet', 'presents', 'external-link'
  destinationId: varchar("destination_id"), // Target ID or URL
  unlockConditions: jsonb("unlock_conditions"), // JSON array of unlock conditions
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    parentIndex: index("custom_buttons_parent_idx").on(table.parentType, table.parentId),
    orderIndex: index("custom_buttons_order_idx").on(table.order),
  };
});

// CMS-specific tables for content management
// Enhanced with versioning support for content history and rollback
export const contentBackups = pgTable("content_backups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: varchar("filename").notNull(),
  content: text("content").notNull(),
  
  // Versioning fields
  contentType: varchar("content_type").notNull(), // 'chapter', 'card', 'sub_chapter'
  contentId: varchar("content_id").notNull(), // ID of the content being versioned
  versionNumber: integer("version_number").notNull(), // Sequential version number
  changeDescription: text("change_description"), // Optional description of changes
  
  // Audit fields
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    contentIndex: index("content_backups_content_idx").on(table.contentType, table.contentId),
    versionIndex: index("content_backups_version_idx").on(table.contentId, table.versionNumber),
    createdByIndex: index("content_backups_created_by_idx").on(table.createdBy),
    createdAtIndex: index("content_backups_created_at_idx").on(table.createdAt),
  };
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
}, (table) => {
  return {
    userIdIndex: index("user_progress_user_id_idx").on(table.userId),
    chapterIdIndex: index("user_progress_chapter_id_idx").on(table.chapterId),
    completedAtIndex: index("user_progress_completed_at_idx").on(table.completedAt),
  };
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

// Enhanced Interactive Choice System - extends beyond simple polls
export const interactiveChoices = pgTable("interactive_choices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => liveEvents.id),
  chapterId: varchar("chapter_id"),
  cardIndex: integer("card_index"),
  
  // Core choice configuration
  title: text("title").notNull(),
  description: text("description"),
  choiceType: varchar("choice_type").notNull(), // 'multi_choice', 'ranking', 'preference_scale', 'grouped_choices', 'collaborative_board'
  
  // Choice options and configuration
  choices: jsonb("choices").notNull(), // Array of choice objects with extended properties
  maxSelections: integer("max_selections"), // For multi-select scenarios
  minSelections: integer("min_selections").default(1),
  allowCustomInput: boolean("allow_custom_input").default(false),
  
  // Visualization and interaction settings
  visualizationType: varchar("visualization_type").default('bar_chart'), // 'bar_chart', 'pie_chart', 'word_cloud', 'live_grid'
  showLiveResults: boolean("show_live_results").default(true),
  showPercentages: boolean("show_percentages").default(true),
  animateResults: boolean("animate_results").default(true),
  
  // Group decision making features
  requireConsensus: boolean("require_consensus").default(false),
  consensusThreshold: integer("consensus_threshold").default(75), // percentage
  allowDiscussion: boolean("allow_discussion").default(false),
  discussionTimeLimit: integer("discussion_time_limit"), // seconds
  
  // Timing and lifecycle
  status: varchar("status").default('draft'), // 'draft', 'active', 'paused', 'completed', 'archived'
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  timeLimit: integer("time_limit"), // seconds for individual responses
  
  // Results and feedback
  showResults: boolean("show_results").default(true),
  resultsVisibleTo: varchar("results_visible_to").default('all'), // 'all', 'participants', 'admins_only'
  feedbackMessage: text("feedback_message"),
  
  // CMS integration
  cmsConfig: jsonb("cms_config"), // CMS-specific configuration
  themeSettings: jsonb("theme_settings"), // Visual theme customization
  
  // Metadata
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    eventIdIndex: index("interactive_choices_event_id_idx").on(table.eventId),
    chapterIdIndex: index("interactive_choices_chapter_id_idx").on(table.chapterId),
    statusIndex: index("interactive_choices_status_idx").on(table.status),
    createdAtIndex: index("interactive_choices_created_at_idx").on(table.createdAt),
  };
});

// Individual user responses to interactive choices
export const choiceResponses = pgTable("choice_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  choiceId: varchar("choice_id").references(() => interactiveChoices.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Response data
  selectedChoices: jsonb("selected_choices").notNull(), // Array of selected choice IDs/values
  customInput: text("custom_input"), // For open-ended responses
  ranking: jsonb("ranking"), // For ranking-type choices
  
  // Response metadata
  responseTime: integer("response_time"), // Time taken to respond in seconds
  confidence: integer("confidence"), // Self-reported confidence (1-10)
  isAnonymous: boolean("is_anonymous").default(false),
  
  // Timestamps
  submittedAt: timestamp("submitted_at").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
}, (table) => {
  return {
    choiceIdIndex: index("choice_responses_choice_id_idx").on(table.choiceId),
    userIdIndex: index("choice_responses_user_id_idx").on(table.userId),
    submittedAtIndex: index("choice_responses_submitted_at_idx").on(table.submittedAt),
    // Unique constraint to prevent duplicate responses
    uniqueUserChoice: uniqueIndex("choice_responses_user_choice_unique").on(table.choiceId, table.userId),
  };
});

export const pollResponses = pgTable("poll_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").references(() => polls.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  selectedOption: varchar("selected_option").notNull(),
  isCorrect: boolean("is_correct"), // For quiz responses
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (table) => {
  return {
    pollIdIndex: index("poll_responses_poll_id_idx").on(table.pollId),
    userIdIndex: index("poll_responses_user_id_idx").on(table.userId),
    submittedAtIndex: index("poll_responses_submitted_at_idx").on(table.submittedAt),
  };
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
  
  // Venue Information
  venueName: varchar("venue_name"),
  venueAddress: text("venue_address"),
  venueLatitude: decimal("venue_latitude", { precision: 10, scale: 8 }),
  venueLongitude: decimal("venue_longitude", { precision: 11, scale: 8 }),
  venueDetails: jsonb("venue_details"), // Additional venue info (section, gate, doors open time, etc.)
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    // Performance indexes for common queries
    isActiveIndex: index("live_events_is_active_idx").on(table.isActive),
    startTimeIndex: index("live_events_start_time_idx").on(table.startTime),
    endTimeIndex: index("live_events_end_time_idx").on(table.endTime),
    timeRangeIndex: index("live_events_time_range_idx").on(table.startTime, table.endTime),
    activeTimeIndex: index("live_events_active_time_idx").on(table.isActive, table.startTime, table.endTime),
    createdByIndex: index("live_events_created_by_idx").on(table.createdBy),
  };
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
}, (table) => {
  return {
    eventIdIndex: index("qa_sessions_event_id_idx").on(table.eventId),
    askedByIndex: index("qa_sessions_asked_by_idx").on(table.askedBy),
    createdAtIndex: index("qa_sessions_created_at_idx").on(table.createdAt),
  };
});

export const liveChatMessages = pgTable("live_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => liveEvents.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  messageType: varchar("message_type").default('text'), // 'text', 'reaction', 'system'
  isModerated: boolean("is_moderated").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
}, (table) => {
  return {
    eventIdIndex: index("live_chat_messages_event_id_idx").on(table.eventId),
    userIdIndex: index("live_chat_messages_user_id_idx").on(table.userId),
    sentAtIndex: index("live_chat_messages_sent_at_idx").on(table.sentAt),
  };
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
}, (table) => {
  return {
    userIdIndex: index("user_memory_wallet_user_id_idx").on(table.userId),
    eventIdIndex: index("user_memory_wallet_event_id_idx").on(table.eventId),
    sourceTypeIndex: index("user_memory_wallet_source_type_idx").on(table.sourceType),
    collectedAtIndex: index("user_memory_wallet_collected_at_idx").on(table.collectedAt),
    isFavoriteIndex: index("user_memory_wallet_is_favorite_idx").on(table.isFavorite),
  };
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

// Collection Grid - Gamified Collectibles System (Memory Wallet Feature)
export const collectibleDefinitions = pgTable("collectible_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => liveEvents.id).notNull(), // Made required for consistency
  
  // Collectible identity
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // 'story_card', 'chapter_stamp', 'show_activation'
  shape: varchar("shape").notNull(), // 'rectangle', 'circle', 'hexagon'
  
  // Grid positioning with constraints
  gridPosition: integer("grid_position").notNull(), // 1-12 for 3x4 grid
  gridRow: integer("grid_row").notNull(), // 1-4  
  gridColumn: integer("grid_column").notNull(), // 1-3
  
  // Visual properties
  imageUrl: varchar("image_url"), // Unlocked collectible image
  thumbnailUrl: varchar("thumbnail_url"), // Small preview
  silhouetteUrl: varchar("silhouette_url"), // Grey locked version
  primaryColor: varchar("primary_color"), // Hex color for theming
  accentColor: varchar("accent_color"), // Secondary color
  
  // Unlock conditions
  unlockTrigger: varchar("unlock_trigger").notNull(), // 'chapter_complete', 'card_view', 'event_attend', 'poll_answer', 'manual'
  unlockConditions: jsonb("unlock_conditions"), // Specific requirements
  triggerSourceId: varchar("trigger_source_id"), // ID of source that triggers unlock
  
  // Bonus properties
  isBonus: boolean("is_bonus").default(false), // Holographic bonus collectibles
  bonusType: varchar("bonus_type"), // 'holographic', 'animated', 'special'
  rarity: varchar("rarity").default('common'), // 'common', 'rare', 'epic', 'legendary'
  
  // Content details for detail view
  fullContentUrl: varchar("full_content_url"), // Full-screen image/video
  contentType: varchar("content_type"), // 'image', 'video', 'animation', 'ar'
  caption: text("caption"), // Description for detail modal
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    // Critical: Prevent overlapping grid positions within same event
    uniqueEventGridPosition: uniqueIndex("unique_event_grid_position").on(table.eventId, table.gridPosition),
    // Performance indexes for common query patterns
    eventIdIndex: index("collectible_definitions_event_id_idx").on(table.eventId),
    typeIndex: index("collectible_definitions_type_idx").on(table.type),
  };
});

// User's collectible unlock status and progress
export const userCollectibles = pgTable("user_collectibles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  collectibleId: varchar("collectible_id").references(() => collectibleDefinitions.id).notNull(),
  // Removed eventId - it's redundant since it's already implied through collectible_id → definition
  
  // Unlock status
  isUnlocked: boolean("is_unlocked").default(false),
  unlockedAt: timestamp("unlocked_at"),
  unlockContext: jsonb("unlock_context"), // Details about how it was unlocked
  
  // Animation and display
  animationViewed: boolean("animation_viewed").default(false), // Has user seen unlock animation
  lastViewedAt: timestamp("last_viewed_at"),
  viewCount: integer("view_count").default(0),
  
  // User customization
  isFavorite: boolean("is_favorite").default(false),
  userNotes: text("user_notes"), // Personal notes about this collectible
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    // Critical: Prevent duplicate unlock records per user/collectible
    uniqueUserCollectible: uniqueIndex("unique_user_collectible").on(table.userId, table.collectibleId),
    // Performance indexes for common queries
    userIdIndex: index("user_collectibles_user_id_idx").on(table.userId),
    collectibleIdIndex: index("user_collectibles_collectible_id_idx").on(table.collectibleId),
  };
});

// =============================================================================
// ENTERPRISE FEATURE FLAG SYSTEM
// =============================================================================

// Feature flags table - server-side feature flag management
export const featureFlags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Flag identification
  flagKey: varchar("flag_key").notNull().unique(), // e.g., 'enableUnifiedButtons'
  flagName: varchar("flag_name").notNull(), // Human-readable name
  description: text("description"), // What this flag controls
  category: varchar("category").default('feature'), // 'feature', 'experiment', 'operational', 'killswitch'
  
  // Flag status and values
  isEnabled: boolean("is_enabled").default(false),
  rolloutPercentage: integer("rollout_percentage").default(0), // 0-100
  rolloutStrategy: varchar("rollout_strategy").default('percentage'), // 'percentage', 'user-cohort', 'environment'
  
  // Conditions and targeting
  targetConditions: jsonb("target_conditions"), // User cohort conditions, environment rules
  environmentRestrictions: jsonb("environment_restrictions"), // dev/staging/prod restrictions
  
  // Emergency controls
  isEmergencyDisabled: boolean("is_emergency_disabled").default(false),
  emergencyDisabledAt: timestamp("emergency_disabled_at"),
  emergencyDisabledBy: varchar("emergency_disabled_by").references(() => users.id),
  emergencyReason: text("emergency_reason"),
  
  // Lifecycle management
  status: varchar("status").default('active'), // 'draft', 'active', 'deprecated', 'archived'
  expiresAt: timestamp("expires_at"), // Auto-disable date
  
  // Audit fields
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  lastModifiedBy: varchar("last_modified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    flagKeyIndex: index("feature_flags_flag_key_idx").on(table.flagKey),
    categoryIndex: index("feature_flags_category_idx").on(table.category),
    statusIndex: index("feature_flags_status_idx").on(table.status),
    rolloutIndex: index("feature_flags_rollout_idx").on(table.isEnabled, table.rolloutPercentage),
    emergencyIndex: index("feature_flags_emergency_idx").on(table.isEmergencyDisabled),
  };
});

// Feature flag audit log - track all changes for compliance
export const featureFlagAuditLog = pgTable("feature_flag_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  flagId: varchar("flag_id").references(() => featureFlags.id).notNull(),
  
  // Change details
  action: varchar("action").notNull(), // 'created', 'updated', 'enabled', 'disabled', 'emergency_disabled', 'deleted'
  changedFields: jsonb("changed_fields"), // Which fields were modified
  oldValues: jsonb("old_values"), // Previous values
  newValues: jsonb("new_values"), // New values
  
  // Context
  reason: text("reason"), // Why the change was made
  source: varchar("source").default('admin'), // 'admin', 'api', 'automation', 'emergency'
  
  // Actor information
  userId: varchar("user_id").references(() => users.id),
  userEmail: varchar("user_email"),
  userAgent: varchar("user_agent"),
  ipAddress: varchar("ip_address"),
  
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => {
  return {
    flagIdIndex: index("flag_audit_log_flag_id_idx").on(table.flagId),
    actionIndex: index("flag_audit_log_action_idx").on(table.action),
    timestampIndex: index("flag_audit_log_timestamp_idx").on(table.timestamp),
    userIdIndex: index("flag_audit_log_user_id_idx").on(table.userId),
  };
});

// =============================================================================
// ENTERPRISE MONITORING & METRICS SYSTEM
// =============================================================================

// Aggregated metrics table - server-side metrics storage
export const systemMetrics = pgTable("system_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Metric identification
  metricName: varchar("metric_name").notNull(), // e.g., 'button.render.time', 'button.action.success_rate'
  metricType: varchar("metric_type").notNull(), // 'counter', 'gauge', 'histogram', 'timer'
  category: varchar("category").notNull(), // 'performance', 'error', 'usage', 'business'
  
  // Metric values
  value: decimal("value", { precision: 15, scale: 6 }).notNull(),
  count: integer("count").default(1), // For aggregated metrics
  min: decimal("min", { precision: 15, scale: 6 }),
  max: decimal("max", { precision: 15, scale: 6 }),
  avg: decimal("avg", { precision: 15, scale: 6 }),
  percentile_50: decimal("percentile_50", { precision: 15, scale: 6 }),
  percentile_95: decimal("percentile_95", { precision: 15, scale: 6 }),
  percentile_99: decimal("percentile_99", { precision: 15, scale: 6 }),
  
  // Context and dimensions
  dimensions: jsonb("dimensions"), // Labels like {feature: 'buttons', browser: 'chrome', version: 'v1.2.3'}
  environment: varchar("environment").default('production'), // 'development', 'staging', 'production'
  
  // Time aggregation
  aggregationWindow: varchar("aggregation_window").default('1m'), // '1m', '5m', '1h', '1d'
  windowStart: timestamp("window_start").notNull(),
  windowEnd: timestamp("window_end").notNull(),
  
  // Metadata
  source: varchar("source").default('client'), // 'client', 'server', 'synthetic'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    metricNameIndex: index("system_metrics_metric_name_idx").on(table.metricName),
    categoryIndex: index("system_metrics_category_idx").on(table.category),
    timeRangeIndex: index("system_metrics_time_range_idx").on(table.windowStart, table.windowEnd),
    environmentIndex: index("system_metrics_environment_idx").on(table.environment),
    aggregationIndex: index("system_metrics_aggregation_idx").on(table.metricName, table.aggregationWindow, table.windowStart),
  };
});

// Real-time metric events - raw events before aggregation
export const metricEvents = pgTable("metric_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Event identification
  metricName: varchar("metric_name").notNull(),
  metricType: varchar("metric_type").notNull(),
  value: decimal("value", { precision: 15, scale: 6 }).notNull(),
  
  // Context
  dimensions: jsonb("dimensions"),
  sessionId: varchar("session_id"),
  userId: varchar("user_id").references(() => users.id),
  
  // Client information
  userAgent: varchar("user_agent"),
  clientTimestamp: timestamp("client_timestamp"),
  serverTimestamp: timestamp("server_timestamp").defaultNow(),
  
  // Processing status
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    metricNameIndex: index("metric_events_metric_name_idx").on(table.metricName),
    timestampIndex: index("metric_events_timestamp_idx").on(table.serverTimestamp),
    processedIndex: index("metric_events_processed_idx").on(table.processed, table.serverTimestamp),
    sessionIdIndex: index("metric_events_session_id_idx").on(table.sessionId),
    userIdIndex: index("metric_events_user_id_idx").on(table.userId),
  };
});

// System alerts and thresholds
export const alertRules = pgTable("alert_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Alert identification
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").default('performance'), // 'performance', 'error', 'availability', 'business'
  severity: varchar("severity").default('warning'), // 'info', 'warning', 'error', 'critical'
  
  // Alert conditions
  metricName: varchar("metric_name").notNull(),
  operator: varchar("operator").notNull(), // '>', '<', '>=', '<=', '==', '!='
  threshold: decimal("threshold", { precision: 15, scale: 6 }).notNull(),
  evaluationWindow: varchar("evaluation_window").default('5m'), // Time window for evaluation
  
  // Alert behavior
  isEnabled: boolean("is_enabled").default(true),
  cooldownPeriod: integer("cooldown_period").default(300), // Seconds before re-alerting
  autoResolve: boolean("auto_resolve").default(true),
  
  // Actions
  notifications: jsonb("notifications"), // Email, slack, webhooks, etc.
  autoRollback: boolean("auto_rollback").default(false), // Trigger automatic rollback
  rollbackConditions: jsonb("rollback_conditions"),
  
  // Audit
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    metricNameIndex: index("alert_rules_metric_name_idx").on(table.metricName),
    severityIndex: index("alert_rules_severity_idx").on(table.severity),
    enabledIndex: index("alert_rules_enabled_idx").on(table.isEnabled),
  };
});

// Alert instances - fired alerts
export const alertInstances = pgTable("alert_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  ruleId: varchar("rule_id").references(() => alertRules.id).notNull(),
  
  // Alert state
  status: varchar("status").default('firing'), // 'firing', 'resolved', 'acknowledged', 'silenced'
  currentValue: decimal("current_value", { precision: 15, scale: 6 }),
  
  // Timeline
  firedAt: timestamp("fired_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
  
  // Context
  context: jsonb("context"), // Additional context when alert fired
  notificationsSent: jsonb("notifications_sent"), // Track which notifications were sent
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    ruleIdIndex: index("alert_instances_rule_id_idx").on(table.ruleId),
    statusIndex: index("alert_instances_status_idx").on(table.status),
    firedAtIndex: index("alert_instances_fired_at_idx").on(table.firedAt),
  };
});

// =============================================================================
// GLOBAL ROLLBACK & DEPLOYMENT CONTROL
// =============================================================================

// Deployment rollback events
export const rollbackEvents = pgTable("rollback_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Rollback identification
  rollbackType: varchar("rollback_type").notNull(), // 'emergency', 'planned', 'gradual', 'partial'
  scope: varchar("scope").notNull(), // 'global', 'feature', 'user-cohort', 'environment'
  targetComponent: varchar("target_component"), // 'buttons', 'entire-system', 'specific-feature'
  
  // Rollback details
  trigger: varchar("trigger").notNull(), // 'manual', 'automated', 'threshold-breach', 'health-check-failure'
  triggerData: jsonb("trigger_data"), // Details about what caused the rollback
  
  // Execution
  status: varchar("status").default('initiated'), // 'initiated', 'in-progress', 'completed', 'failed', 'cancelled'
  executionPlan: jsonb("execution_plan"), // Steps to be executed
  executionProgress: jsonb("execution_progress"), // Current progress and completed steps
  
  // Timeline
  initiatedAt: timestamp("initiated_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  estimatedDuration: integer("estimated_duration"), // Estimated duration in seconds
  actualDuration: integer("actual_duration"), // Actual duration in seconds
  
  // Results
  success: boolean("success"),
  errorMessage: text("error_message"),
  rollbackSummary: jsonb("rollback_summary"), // What was rolled back
  affectedUsers: integer("affected_users"), // Number of users affected
  
  // Actor information
  initiatedBy: varchar("initiated_by").references(() => users.id).notNull(),
  initiatedByEmail: varchar("initiated_by_email"),
  reason: text("reason").notNull(),
  
  // Metadata
  environment: varchar("environment").default('production'),
  version: varchar("version"), // Version being rolled back from/to
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    rollbackTypeIndex: index("rollback_events_type_idx").on(table.rollbackType),
    statusIndex: index("rollback_events_status_idx").on(table.status),
    initiatedAtIndex: index("rollback_events_initiated_at_idx").on(table.initiatedAt),
    initiatedByIndex: index("rollback_events_initiated_by_idx").on(table.initiatedBy),
    scopeIndex: index("rollback_events_scope_idx").on(table.scope),
  };
});

// System health status tracking
export const systemHealth = pgTable("system_health", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Component identification
  component: varchar("component").notNull(), // 'buttons', 'api', 'database', 'frontend'
  healthCheckName: varchar("health_check_name").notNull(),
  
  // Health status
  status: varchar("status").notNull(), // 'healthy', 'warning', 'critical', 'unknown'
  healthScore: decimal("health_score", { precision: 5, scale: 2 }), // 0-100
  
  // Check results
  checkResults: jsonb("check_results"), // Detailed check results
  responseTime: integer("response_time"), // Health check response time in ms
  errorMessage: text("error_message"),
  
  // Metadata
  environment: varchar("environment").default('production'),
  version: varchar("version"),
  checkInterval: integer("check_interval").default(60), // Seconds between checks
  
  // Timestamps
  checkedAt: timestamp("checked_at").defaultNow(),
  lastHealthyAt: timestamp("last_healthy_at"),
  unhealthySince: timestamp("unhealthy_since"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    componentIndex: index("system_health_component_idx").on(table.component),
    statusIndex: index("system_health_status_idx").on(table.status),
    checkedAtIndex: index("system_health_checked_at_idx").on(table.checkedAt),
    healthScoreIndex: index("system_health_score_idx").on(table.healthScore),
    // Composite index for latest health status per component
    latestHealthIndex: index("system_health_latest_idx").on(table.component, table.checkedAt),
  };
});

// =============================================================================
// ADMIN SECURITY & RBAC
// =============================================================================

// Admin roles and permissions
export const adminRoles = pgTable("admin_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  name: varchar("name").notNull().unique(), // 'super_admin', 'feature_flag_manager', 'metrics_viewer', 'rollback_operator'
  description: text("description"),
  level: integer("level").default(1), // 1=lowest, 10=highest permissions
  
  // Permission sets
  permissions: jsonb("permissions").notNull(), // Array of permission strings
  
  // Constraints
  isSystemRole: boolean("is_system_role").default(false), // Cannot be deleted
  maxUsers: integer("max_users"), // Max users that can have this role
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User role assignments
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").references(() => users.id).notNull(),
  roleId: varchar("role_id").references(() => adminRoles.id).notNull(),
  
  // Assignment context
  assignedBy: varchar("assigned_by").references(() => users.id).notNull(),
  assignedReason: text("assigned_reason"),
  
  // Lifecycle
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"), // Optional role expiration
  
  assignedAt: timestamp("assigned_at").defaultNow(),
  revokedAt: timestamp("revoked_at"),
  revokedBy: varchar("revoked_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    userIdIndex: index("user_roles_user_id_idx").on(table.userId),
    roleIdIndex: index("user_roles_role_id_idx").on(table.roleId),
    isActiveIndex: index("user_roles_is_active_idx").on(table.isActive),
    // Unique constraint to prevent duplicate active role assignments
    uniqueUserRole: uniqueIndex("user_roles_unique_active").on(table.userId, table.roleId, table.isActive),
  };
});

// Admin action audit log
export const adminAuditLog = pgTable("admin_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Action identification
  action: varchar("action").notNull(), // 'feature_flag_toggle', 'rollback_initiate', 'user_role_assign', etc.
  category: varchar("category").notNull(), // 'feature_flags', 'rollbacks', 'user_management', 'system'
  resource: varchar("resource"), // ID of the affected resource
  resourceType: varchar("resource_type"), // 'feature_flag', 'rollback_event', 'user', etc.
  
  // Action details
  actionDetails: jsonb("action_details"), // Full details of what was done
  oldValues: jsonb("old_values"), // Previous state
  newValues: jsonb("new_values"), // New state
  
  // Result
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  
  // Actor information
  userId: varchar("user_id").references(() => users.id).notNull(),
  userEmail: varchar("user_email").notNull(),
  userRoles: jsonb("user_roles"), // Roles at time of action
  
  // Context
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  sessionId: varchar("session_id"),
  environment: varchar("environment").default('production'),
  
  // Impact assessment
  affectedUsers: integer("affected_users"), // Estimated number of affected users
  riskLevel: varchar("risk_level"), // 'low', 'medium', 'high', 'critical'
  
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => {
  return {
    actionIndex: index("admin_audit_log_action_idx").on(table.action),
    categoryIndex: index("admin_audit_log_category_idx").on(table.category),
    userIdIndex: index("admin_audit_log_user_id_idx").on(table.userId),
    timestampIndex: index("admin_audit_log_timestamp_idx").on(table.timestamp),
    resourceIndex: index("admin_audit_log_resource_idx").on(table.resourceType, table.resource),
    riskLevelIndex: index("admin_audit_log_risk_idx").on(table.riskLevel),
  };
});

// Collection Grid progress tracking per event (passport pages)
export const collectibleProgress = pgTable("collectible_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  eventId: varchar("event_id").references(() => liveEvents.id).notNull(),
  
  // Progress metrics
  totalCollectibles: integer("total_collectibles").default(0), // Total available for this event
  unlockedCount: integer("unlocked_count").default(0), // Currently unlocked
  completionPercentage: integer("completion_percentage").default(0), // 0-100
  
  // Milestones and celebrations
  hasCompletedGrid: boolean("has_completed_grid").default(false), // 100% completion
  completionCelebrationViewed: boolean("completion_celebration_viewed").default(false),
  completedAt: timestamp("completed_at"),
  
  // Timeline tracking
  firstUnlockAt: timestamp("first_unlock_at"), // When user got their first collectible
  lastUnlockAt: timestamp("last_unlock_at"), // Most recent unlock
  
  // Export and sharing
  hasExportedPassport: boolean("has_exported_passport").default(false),
  lastExportedAt: timestamp("last_exported_at"),
  exportCount: integer("export_count").default(0),
  sharedCount: integer("shared_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    // Critical: Prevent duplicate progress records per user/event
    uniqueUserEventProgress: uniqueIndex("unique_user_event_progress").on(table.userId, table.eventId),
    // Performance indexes for common queries
    userIdIndex: index("collectible_progress_user_id_idx").on(table.userId),
    eventIdIndex: index("collectible_progress_event_id_idx").on(table.eventId),
  };
});

// Export configurations and generated files
export const collectibleExports = pgTable("collectible_exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  eventId: varchar("event_id").references(() => liveEvents.id),
  
  // Export details
  exportType: varchar("export_type").notNull(), // 'passport_page', 'grid_collage', 'timeline', 'animated_gif'
  format: varchar("format").notNull(), // 'png', 'jpg', 'gif', 'mp4', 'pdf'
  fileUrl: varchar("file_url").notNull(), // Generated file location
  thumbnailUrl: varchar("thumbnail_url"), // Preview image
  
  // Generation metadata
  dimensions: jsonb("dimensions"), // {width, height}
  fileSize: integer("file_size"), // bytes
  duration: integer("duration"), // seconds for animated exports
  includeAnimation: boolean("include_animation").default(false),
  
  // Sharing configuration
  socialFormat: varchar("social_format"), // 'instagram_story', 'instagram_post', 'tiktok', 'twitter'
  includeWatermark: boolean("include_watermark").default(true),
  customMessage: text("custom_message"),
  
  // Status tracking
  generationStatus: varchar("generation_status").default('pending'), // 'pending', 'processing', 'completed', 'failed'
  processingStartedAt: timestamp("processing_started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Fan Score System
export const fanScoringRules = pgTable("fan_scoring_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityType: varchar("activity_type").notNull(), // 'card_completion', 'poll_participation', 'quiz_correct', 'memory_collection', etc.
  points: integer("points").notNull(),
  phase: varchar("phase"), // Optional phase filtering
  eventId: varchar("event_id").references(() => liveEvents.id), // Optional event filtering
  chapterId: varchar("chapter_id"), // Optional chapter filtering
  cardIndex: integer("card_index"), // Optional card filtering
  maxPerDay: integer("max_per_day"), // Daily limit for earning points from this activity
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"), // Additional configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_fan_scoring_rules_lookup").on(table.isActive, table.activityType, table.eventId, table.phase, table.chapterId, table.cardIndex),
]);

export const fanScoreEvents = pgTable("fan_score_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  activityType: varchar("activity_type").notNull(), // 'card_completion', 'poll_participation', 'quiz_correct', etc.
  points: integer("points").notNull(),
  referenceType: varchar("reference_type").notNull(), // 'card', 'poll', 'quiz', 'memory', 'achievement'
  referenceId: varchar("reference_id").notNull(), // ID of the referenced content
  eventId: varchar("event_id").references(() => liveEvents.id), // Context: which event
  chapterId: varchar("chapter_id"), // Context: which chapter
  cardIndex: integer("card_index"), // Context: which card
  phase: varchar("phase"), // Context: which phase ('before', 'during', 'after')
  idempotencyKey: varchar("idempotency_key").notNull(), // Prevent duplicate scoring
  metadata: jsonb("metadata"), // Additional context about the scoring event
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_fan_score_events_user_created").on(table.userId, table.createdAt),
  uniqueIndex("idx_fan_score_events_idempotency").on(table.userId, table.activityType, table.referenceType, table.referenceId),
  uniqueIndex("idx_fan_score_events_idempotency_key").on(table.userId, table.idempotencyKey),
  index("idx_fan_score_events_event_created").on(table.eventId, table.createdAt),
  index("idx_fan_score_events_reference").on(table.referenceType, table.referenceId),
  index("idx_fan_score_events_daily_cap").on(table.userId, table.activityType, table.createdAt),
]);

export const userFanScores = pgTable("user_fan_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  scopeType: varchar("scope_type").notNull(), // 'global', 'event', 'phase'
  scopeId: varchar("scope_id").notNull().default('global'), // 'global' for global scope, eventId for 'event' scope, phase name for 'phase' scope
  totalScore: integer("total_score").default(0),
  level: integer("level").default(1), // Calculated based on total score
  stats: jsonb("stats"), // Additional statistics like achievements count, streak days, etc.
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_user_fan_scores_unique").on(table.userId, table.scopeType, table.scopeId),
  index("idx_user_fan_scores_total").on(table.totalScore),
  index("idx_user_fan_scores_leaderboard").on(table.scopeType, table.scopeId, table.totalScore.desc()),
]);

export const achievementDefinitions = pgTable("achievement_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(), // Unique identifier for the achievement
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  icon: varchar("icon"), // Icon identifier or URL
  criteria: jsonb("criteria").notNull(), // JSON defining the criteria to unlock this achievement
  pointsBonus: integer("points_bonus").default(0), // Bonus points awarded when achievement is unlocked
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  achievementId: varchar("achievement_id").references(() => achievementDefinitions.id).notNull(),
  awardedAt: timestamp("awarded_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_user_achievements_unique").on(table.userId, table.achievementId),
]);

// After Experience CMS Tables
export const afterEventConfig = pgTable("after_event_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => liveEvents.id).notNull(),
  status: varchar("status").default('draft'), // 'draft', 'published'
  version: integer("version").default(1),
  publishedAt: timestamp("published_at"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const afterTabs = pgTable("after_tabs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => liveEvents.id).notNull(),
  tabKey: varchar("tab_key").notNull(), // 'message', 'wallet', 'gallery', 'merch', 'community'
  title: varchar("title").notNull(),
  displayOrder: integer("display_order").notNull(),
  isVisible: boolean("is_visible").default(true),
  theme: jsonb("theme"), // Colors, styling configuration
  createdAt: timestamp("created_at").defaultNow(),
});

export const recapHeroConfig = pgTable("recap_hero_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => liveEvents.id).notNull(),
  copy: jsonb("copy"), // Titles, descriptions, labels
  metrics: jsonb("metrics"), // Which metrics to show and thresholds
  shareImage: jsonb("share_image"), // Theme, colors, logo, watermark settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messageTemplates = pgTable("message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  allowedParams: jsonb("allowed_params"), // Whitelisted customization parameters
  mediaRefs: jsonb("media_refs"), // References to background assets, music, etc.
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventMessageSettings = pgTable("event_message_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => liveEvents.id).notNull(),
  templateId: varchar("template_id").references(() => messageTemplates.id).notNull(),
  params: jsonb("params"), // Template customization parameters
  flags: jsonb("flags"), // Feature flags and settings
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const communitySettings = pgTable("community_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => liveEvents.id).notNull(),
  newsletter: jsonb("newsletter"), // Provider, list ID, copy
  discord: jsonb("discord"), // Invite URL, server info
  moderation: jsonb("moderation"), // Moderation settings and rules
  socialLinks: jsonb("social_links"), // External social media links
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const upcomingEvents = pgTable("upcoming_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => liveEvents.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  link: varchar("link"),
  imageRef: varchar("image_ref").references(() => mediaAssets.id),
  isVisible: boolean("is_visible").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const merchCollections = pgTable("merch_collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => liveEvents.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  displayOrder: integer("display_order").default(0),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const merchProducts = pgTable("merch_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  collectionId: varchar("collection_id").references(() => merchCollections.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  imageRefs: jsonb("image_refs"), // Array of media asset IDs
  stripePriceId: varchar("stripe_price_id").notNull(), // Stripe price ID
  badge: varchar("badge"), // 'limited', 'exclusive', 'new', etc.
  displayOrder: integer("display_order").default(0),
  isVisible: boolean("is_visible").default(true),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const gallerySettings = pgTable("gallery_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => liveEvents.id).notNull(),
  uploadRules: jsonb("upload_rules"), // Max items, mime types, size limits
  moderationMode: varchar("moderation_mode").default('auto'), // 'auto', 'manual', 'disabled'
  visibilitySettings: jsonb("visibility_settings"), // Public/private rules
  featuredItems: jsonb("featured_items"), // Curated featured content
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Note: Enterprise featureFlags table is defined earlier in the file with comprehensive functionality

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
export type FanScoringRule = typeof fanScoringRules.$inferSelect;
export type UpsertFanScoringRule = typeof fanScoringRules.$inferInsert;
export type FanScoreEvent = typeof fanScoreEvents.$inferSelect;
export type UpsertFanScoreEvent = typeof fanScoreEvents.$inferInsert;
export type UserFanScore = typeof userFanScores.$inferSelect;
export type UpsertUserFanScore = typeof userFanScores.$inferInsert;
export type AchievementDefinition = typeof achievementDefinitions.$inferSelect;
export type UpsertAchievementDefinition = typeof achievementDefinitions.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type UpsertUserAchievement = typeof userAchievements.$inferInsert;

// After Experience CMS Types
export type AfterEventConfig = typeof afterEventConfig.$inferSelect;
export type UpsertAfterEventConfig = typeof afterEventConfig.$inferInsert;
export type AfterTab = typeof afterTabs.$inferSelect;
export type UpsertAfterTab = typeof afterTabs.$inferInsert;
export type RecapHeroConfig = typeof recapHeroConfig.$inferSelect;
export type UpsertRecapHeroConfig = typeof recapHeroConfig.$inferInsert;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type UpsertMessageTemplate = typeof messageTemplates.$inferInsert;
export type EventMessageSettings = typeof eventMessageSettings.$inferSelect;
export type UpsertEventMessageSettings = typeof eventMessageSettings.$inferInsert;
export type CommunitySettings = typeof communitySettings.$inferSelect;
export type UpsertCommunitySettings = typeof communitySettings.$inferInsert;
export type UpcomingEvent = typeof upcomingEvents.$inferSelect;
export type UpsertUpcomingEvent = typeof upcomingEvents.$inferInsert;
export type MerchCollection = typeof merchCollections.$inferSelect;
export type UpsertMerchCollection = typeof merchCollections.$inferInsert;
export type MerchProduct = typeof merchProducts.$inferSelect;
export type UpsertMerchProduct = typeof merchProducts.$inferInsert;
export type GallerySettings = typeof gallerySettings.$inferSelect;
export type UpsertGallerySettings = typeof gallerySettings.$inferInsert;
// Note: FeatureFlag types are defined with the enterprise featureFlags table above

// Memory Wallet Collection Grid Types
export type CollectibleDefinition = typeof collectibleDefinitions.$inferSelect;
export type UpsertCollectibleDefinition = typeof collectibleDefinitions.$inferInsert;
export type UserCollectible = typeof userCollectibles.$inferSelect;
export type UpsertUserCollectible = typeof userCollectibles.$inferInsert;
export type CollectibleProgress = typeof collectibleProgress.$inferSelect;
export type UpsertCollectibleProgress = typeof collectibleProgress.$inferInsert;
export type CollectibleExport = typeof collectibleExports.$inferSelect;
export type UpsertCollectibleExport = typeof collectibleExports.$inferInsert;

// Interactive Choice System Types
export type InteractiveChoice = typeof interactiveChoices.$inferSelect;
export type UpsertInteractiveChoice = typeof interactiveChoices.$inferInsert;
export type ChoiceResponse = typeof choiceResponses.$inferSelect;
export type UpsertChoiceResponse = typeof choiceResponses.$inferInsert;