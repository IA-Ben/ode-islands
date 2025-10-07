export type CardElementType = 'text' | 'image' | 'video' | 'button' | 'divider' | 'spacer';

export interface BaseCardElement {
  id: string;
  type: CardElementType;
  order: number;
}

export interface TextElement extends BaseCardElement {
  type: 'text';
  properties: {
    content: string;
    variant: 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'caption';
    alignment: 'left' | 'center' | 'right';
    color?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
  };
}

export interface ImageElement extends BaseCardElement {
  type: 'image';
  properties: {
    mediaAssetId?: string;
    src?: string;
    alt: string;
    width?: string;
    height?: string;
    objectFit: 'cover' | 'contain' | 'fill';
    borderRadius?: number;
  };
}

export interface VideoElement extends BaseCardElement {
  type: 'video';
  properties: {
    mediaAssetId?: string;
    src?: string;
    poster?: string;
    autoplay: boolean;
    loop: boolean;
    muted: boolean;
    controls: boolean;
  };
}

export interface ButtonElement extends BaseCardElement {
  type: 'button';
  properties: {
    text: string;
    action: 'link' | 'navigate' | 'custom';
    url?: string;
    navigationTarget?: string;
    variant: 'primary' | 'secondary' | 'outline';
    size: 'small' | 'medium' | 'large';
    fullWidth: boolean;
  };
}

export interface DividerElement extends BaseCardElement {
  type: 'divider';
  properties: {
    style: 'solid' | 'dashed' | 'dotted';
    color?: string;
    thickness?: number;
    margin?: number;
  };
}

export interface SpacerElement extends BaseCardElement {
  type: 'spacer';
  properties: {
    height: number;
  };
}

export type CardElement = 
  | TextElement 
  | ImageElement 
  | VideoElement 
  | ButtonElement 
  | DividerElement 
  | SpacerElement;

export interface VisualCardLayout {
  version: string;
  backgroundColor?: string;
  backgroundImage?: string;
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  elements: CardElement[];
}

export function createDefaultElement(type: CardElementType, order: number): CardElement {
  const id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  switch (type) {
    case 'text':
      return {
        id,
        type: 'text',
        order,
        properties: {
          content: 'Enter text here...',
          variant: 'paragraph',
          alignment: 'left',
        },
      };
    
    case 'image':
      return {
        id,
        type: 'image',
        order,
        properties: {
          alt: 'Image',
          objectFit: 'cover',
        },
      };
    
    case 'video':
      return {
        id,
        type: 'video',
        order,
        properties: {
          autoplay: false,
          loop: false,
          muted: true,
          controls: true,
        },
      };
    
    case 'button':
      return {
        id,
        type: 'button',
        order,
        properties: {
          text: 'Click me',
          action: 'link',
          variant: 'primary',
          size: 'medium',
          fullWidth: false,
        },
      };
    
    case 'divider':
      return {
        id,
        type: 'divider',
        order,
        properties: {
          style: 'solid',
          color: '#cccccc',
          thickness: 1,
          margin: 16,
        },
      };
    
    case 'spacer':
      return {
        id,
        type: 'spacer',
        order,
        properties: {
          height: 24,
        },
      };
    
    default:
      throw new Error(`Unknown element type: ${type}`);
  }
}

export function createEmptyLayout(): VisualCardLayout {
  return {
    version: '1.0',
    elements: [],
  };
}

// ============================================================================
// BEFORE CARD TYPE TAXONOMY
// ============================================================================

export const PLAN_CARD_TYPES = [
  'tickets',
  'venue-travel',
  'schedule-preview',
  'safety-info',
  'fnb-preload',
  'merch-preorder',
] as const;

export const DISCOVER_CARD_TYPES = [
  'immersive-chapter',
  'chapter-continue',
  'trailer',
  'lore',
  'character-spotlight',
  'daily-drop',
] as const;

export const COMMUNITY_CARD_TYPES = [
  'creator-challenge',
  'ar-hunt',
  'polls-predictions',
  'refer-friend',
  'friends-going',
  'community-leaderboard',
] as const;

export const ENGAGEMENT_CARD_TYPES = [
  'warmup-questline',
  'streak-status',
  'group-planner',
  'outfit-builder',
  'trivia-quiz',
  'prediction-market',
  'puzzle-arg',
  'bts-capsule',
  'soundcheck-playlist',
  'poster-maker',
  'accessibility-guide',
  'calm-mode',
] as const;

export const ALL_BEFORE_CARD_TYPES = [
  ...PLAN_CARD_TYPES,
  ...DISCOVER_CARD_TYPES,
  ...COMMUNITY_CARD_TYPES,
  ...ENGAGEMENT_CARD_TYPES,
] as const;

export type PlanCardType = (typeof PLAN_CARD_TYPES)[number];
export type DiscoverCardType = (typeof DISCOVER_CARD_TYPES)[number];
export type CommunityCardType = (typeof COMMUNITY_CARD_TYPES)[number];
export type EngagementCardType = (typeof ENGAGEMENT_CARD_TYPES)[number];
export type BeforeCardType = (typeof ALL_BEFORE_CARD_TYPES)[number];

// Card type validation helpers
export function isBeforeCardType(type: string): type is BeforeCardType {
  return ALL_BEFORE_CARD_TYPES.includes(type as BeforeCardType);
}

export function getCardLane(type: BeforeCardType): 'plan' | 'discover' | 'community' | 'engagement' | null {
  if (PLAN_CARD_TYPES.includes(type as any)) return 'plan';
  if (DISCOVER_CARD_TYPES.includes(type as any)) return 'discover';
  if (COMMUNITY_CARD_TYPES.includes(type as any)) return 'community';
  if (ENGAGEMENT_CARD_TYPES.includes(type as any)) return 'engagement';
  return null;
}

export function getCardIcon(type: BeforeCardType): string {
  const iconMap: Record<BeforeCardType, string> = {
    'tickets': 'Ticket',
    'venue-travel': 'MapPin',
    'schedule-preview': 'Calendar',
    'safety-info': 'Heart',
    'fnb-preload': 'Coffee',
    'merch-preorder': 'ShoppingBag',
    'immersive-chapter': 'BookOpen',
    'chapter-continue': 'PlayCircle',
    'trailer': 'Film',
    'lore': 'Sparkles',
    'character-spotlight': 'User',
    'daily-drop': 'Play',
    'creator-challenge': 'Trophy',
    'ar-hunt': 'Search',
    'polls-predictions': 'MessageSquare',
    'refer-friend': 'UserPlus',
    'friends-going': 'Users',
    'community-leaderboard': 'Trophy',
    'warmup-questline': 'Target',
    'streak-status': 'Flame',
    'group-planner': 'Users',
    'outfit-builder': 'Shirt',
    'trivia-quiz': 'Brain',
    'prediction-market': 'TrendingUp',
    'puzzle-arg': 'Puzzle',
    'bts-capsule': 'Film',
    'soundcheck-playlist': 'Music',
    'poster-maker': 'Image',
    'accessibility-guide': 'Accessibility',
    'calm-mode': 'HeartHandshake',
  };
  
  return iconMap[type] || 'Square';
}
