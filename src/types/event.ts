/**
 * Event Hub Types
 * Comprehensive type definitions for the Event experience
 */

// ============================================================================
// CARD TYPES
// ============================================================================

export type CardSize = 'S' | 'M' | 'L';
export type CardStage = 'before' | 'event' | 'after';
export type CardLane = 'info' | 'interact' | 'rewards';

export type RewardTrigger =
  | 'onOpen'
  | 'onComplete'
  | 'onShare'
  | 'onOrderComplete'
  | 'onPair'
  | 'onScore';

export interface CardVisibility {
  stage: CardStage[];
  minTier?: 'Bronze' | 'Silver' | 'Gold';
  geoZones?: string[];
  persona?: {
    hasOrder?: boolean;
    accessibilityPref?: boolean;
    firstTimer?: boolean;
    momentumScore?: number;
  };
  timeWindow?: {
    from: Date | string;
    to: Date | string;
  };
}

export interface RewardHook {
  enabled: boolean;
  templateId?: string;
  trigger: RewardTrigger;
  points?: number;
  cooldownSec?: number;
  oneTime?: boolean;
}

export interface CardAction {
  label: string;
  type: 'primary' | 'secondary' | 'link';
  action: string; // Action identifier
  params?: Record<string, any>;
}

export interface BaseCard {
  id: string;
  type: string;
  lane: CardLane;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  size: CardSize;
  actions: CardAction[];
  visibility: CardVisibility;
  analyticsTag: string;
  award?: RewardHook;
  params?: Record<string, any>;
  priority?: number;
}

// ============================================================================
// SPECIFIC CARD TYPES
// ============================================================================

export interface ScheduleCardParams {
  nowItem?: {
    title: string;
    time: string;
    description?: string;
  };
  nextItems?: Array<{
    title: string;
    time: string;
    description?: string;
  }>;
  enableReminders?: boolean;
}

export interface MapCardParams {
  zones: Array<{
    id: string;
    name: string;
    icon?: string;
  }>;
  pins: Array<{
    id: string;
    name: string;
    zone: string;
    lat?: number;
    lng?: number;
  }>;
  userLocation?: { lat: number; lng: number };
}

export interface ARCardParams {
  mode: 'markerless' | 'marker';
  sceneId: string;
  unlockRule?: {
    type: 'time' | 'qr' | 'tier';
    value: any;
  };
  saveToWallet: boolean;
}

export interface QRCardParams {
  scanTypes: Array<'stamp' | 'pickup' | 'unlock'>;
  successState?: string;
  reward?: {
    points?: number;
    memory?: string;
  };
}

export interface WearablesCardParams {
  pairingType: string;
  scenes: string[];
  status?: 'unpaired' | 'paired' | 'active';
}

export interface AICreationCardParams {
  captionStyles: string[];
  promptSeeds: string[];
  clipLength: number;
}

export interface MerchCardParams {
  catalogue: Array<{
    id: string;
    name: string;
    price: number;
    tierDiscount?: { tier: string; discount: number }[];
  }>;
  bundles?: Array<{
    id: string;
    name: string;
    items: string[];
    price: number;
  }>;
}

export interface FoodBeverageCardParams {
  menu: Array<{
    id: string;
    name: string;
    price: number;
    category: string;
    prepTime?: number;
  }>;
  collectionPoint?: string;
  tierDiscounts?: { tier: string; discount: number }[];
}

// ============================================================================
// FEATURED RULES
// ============================================================================

export interface FeaturedConditions {
  time?: {
    from: Date | string;
    to: Date | string;
  };
  tierAtLeast?: 'Bronze' | 'Silver' | 'Gold';
  zones?: string[];
  popularityAbove?: number;
}

export interface FeaturedRule {
  id: string;
  priority: number;
  conditions: FeaturedConditions;
  layout: 'hero' | 'carousel';
  cardIds: string[];
  fallback?: string[];
}

// ============================================================================
// EVENT HOME
// ============================================================================

export type QuickAction = 'scan' | 'map' | 'schedule' | 'offers' | 'wallet';

export interface SafetyBanner {
  status: 'ok' | 'notice' | 'alert';
  copy: string;
  pinned?: boolean;
}

export interface EventHomeConfig {
  quickActions: QuickAction[];
  featuredRules: FeaturedRule[];
  safetyBanner?: SafetyBanner;
}

export interface NowNextHero {
  venue: string;
  now?: {
    title: string;
    time: string;
  };
  next?: {
    title: string;
    time: string;
  };
  safetyStatus?: 'ok' | 'notice' | 'alert';
}

// ============================================================================
// WALLET & POINTS
// ============================================================================

export type Tier = 'Bronze' | 'Silver' | 'Gold';

export interface PointsProgress {
  current: number;
  tier: Tier;
  nextTier?: {
    name: Tier;
    threshold: number;
    remaining: number;
  };
}

export interface Memory {
  id: string;
  templateId: string;
  type: 'ar' | 'photo' | 'video' | 'ai' | 'reward';
  title: string;
  imageUrl?: string;
  videoUrl?: string;
  earnedAt: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  userId?: string;
}

export type EventAnalyticsType =
  | 'event_open'
  | 'event_lane_view'
  | 'featured_impression'
  | 'schedule_reminder_set'
  | 'map_pin_filter'
  | 'help_open'
  | 'ar_launch'
  | 'ar_capture'
  | 'qr_scan_success'
  | 'wearable_pair_sim'
  | 'ai_generate'
  | 'ai_share'
  | 'media_capture'
  | 'media_share'
  | 'order_start'
  | 'order_complete'
  | 'pickup_qr_show'
  | 'points_earned'
  | 'memory_awarded';

// ============================================================================
// OFFLINE MODE
// ============================================================================

export interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
  retries: number;
}

export interface OfflineCache {
  config: EventHomeConfig;
  cards: BaseCard[];
  assets: string[];
  lastSync: Date;
}

// ============================================================================
// USER STATE
// ============================================================================

export interface EventUserState {
  userId: string;
  points: number;
  tier: Tier;
  memories: Memory[];
  completedActions: string[];
  zone?: string;
  online: boolean;
  queuedActions: QueuedAction[];
}
