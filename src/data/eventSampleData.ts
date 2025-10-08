/**
 * Sample Event Data for Demo
 */

import type {
  BaseCard,
  EventHomeConfig,
  FeaturedRule,
  NowNextHero,
  PointsProgress,
  Memory
} from '@/types/event';

// ============================================================================
// NOW & NEXT HERO
// ============================================================================

export const sampleNowNext: NowNextHero = {
  venue: 'The Ode Islands Arena',
  now: {
    title: 'Main Stage Performance',
    time: '8:30 PM'
  },
  next: {
    title: 'VIP Meet & Greet',
    time: '9:45 PM'
  },
  safetyStatus: 'ok'
};

// ============================================================================
// FEATURED RULES
// ============================================================================

export const sampleFeaturedRules: FeaturedRule[] = [
  {
    id: 'featured-1',
    priority: 1,
    conditions: {
      time: {
        from: new Date(Date.now() - 3600000), // 1 hour ago
        to: new Date(Date.now() + 7200000)    // 2 hours from now
      }
    },
    layout: 'hero',
    cardIds: ['ar-scene-1'],
    fallback: ['schedule-1']
  },
  {
    id: 'featured-2',
    priority: 2,
    conditions: {
      tierAtLeast: 'Silver'
    },
    layout: 'carousel',
    cardIds: ['vip-discount-1', 'merch-bundle-1'],
    fallback: ['merch-1']
  }
];

// ============================================================================
// EVENT HOME CONFIG
// ============================================================================

export const sampleEventConfig: EventHomeConfig = {
  quickActions: ['scan', 'map', 'schedule', 'offers', 'wallet'],
  featuredRules: sampleFeaturedRules,
  safetyBanner: {
    status: 'ok',
    copy: 'All systems operational. Have a great show!'
  }
};

// ============================================================================
// INFO LANE CARDS
// ============================================================================

export const infoLaneCards: BaseCard[] = [
  {
    id: 'schedule-1',
    type: 'schedule',
    lane: 'info',
    title: 'Event Schedule',
    subtitle: 'Now & Next',
    size: 'M',
    actions: [
      { label: 'Set Reminder', type: 'primary', action: 'set_reminder' },
      { label: 'View Full Schedule', type: 'link', action: 'view_schedule' }
    ],
    visibility: {
      stage: ['event']
    },
    analyticsTag: 'schedule_card',
    params: {
      nowItem: {
        title: 'Main Stage Performance',
        time: '8:30 PM',
        description: 'Live performance by headliner'
      },
      nextItems: [
        { title: 'VIP Meet & Greet', time: '9:45 PM' },
        { title: 'After Party', time: '10:30 PM' }
      ],
      enableReminders: true
    }
  },
  {
    id: 'map-1',
    type: 'map',
    lane: 'info',
    title: 'Venue Map',
    subtitle: 'Find your way around',
    size: 'L',
    actions: [
      { label: 'Filter Locations', type: 'secondary', action: 'filter_pins' },
      { label: 'Get Directions', type: 'primary', action: 'get_directions' }
    ],
    visibility: {
      stage: ['event']
    },
    analyticsTag: 'map_card',
    params: {
      zones: [
        { id: 'main-stage', name: 'Main Stage', icon: '🎤' },
        { id: 'food-court', name: 'Food Court', icon: '🍔' },
        { id: 'merchandise', name: 'Merch', icon: '🛍️' },
        { id: 'restrooms', name: 'Restrooms', icon: '🚻' }
      ],
      pins: [
        { id: 'stage', name: 'Main Stage', zone: 'main-stage' },
        { id: 'food-1', name: 'Pizza Stand', zone: 'food-court' },
        { id: 'merch-1', name: 'Official Store', zone: 'merchandise' }
      ]
    }
  },
  {
    id: 'venue-info-1',
    type: 'venue-info',
    lane: 'info',
    title: 'Venue Information',
    subtitle: 'Rules & accessibility',
    size: 'S',
    actions: [
      { label: 'View Rules', type: 'link', action: 'view_rules' },
      { label: 'Accessibility', type: 'link', action: 'view_accessibility' }
    ],
    visibility: {
      stage: ['event']
    },
    analyticsTag: 'venue_info_card'
  },
  {
    id: 'safety-1',
    type: 'safety',
    lane: 'info',
    title: 'Safety & Help',
    subtitle: 'We\'re here to help',
    size: 'M',
    actions: [
      { label: 'Emergency Contact', type: 'primary', action: 'emergency' },
      { label: 'Report Issue', type: 'secondary', action: 'report' }
    ],
    visibility: {
      stage: ['event']
    },
    analyticsTag: 'safety_card',
    priority: 999 // High priority for safety
  }
];

// ============================================================================
// INTERACT LANE CARDS
// ============================================================================

export const interactLaneCards: BaseCard[] = [
  {
    id: 'ar-scene-1',
    type: 'ar',
    lane: 'interact',
    title: 'Live AR Experience',
    subtitle: 'Capture the magic in AR',
    imageUrl: '/assets/ar-preview.jpg',
    size: 'L',
    actions: [
      { label: 'Launch AR', type: 'primary', action: 'launch_ar' },
      { label: 'View Examples', type: 'link', action: 'view_examples' }
    ],
    visibility: {
      stage: ['event']
    },
    analyticsTag: 'ar_card',
    award: {
      enabled: true,
      trigger: 'onComplete',
      points: 50,
      templateId: 'ar-memory-1',
      oneTime: false
    },
    params: {
      mode: 'markerless',
      sceneId: 'main-stage-ar',
      saveToWallet: true
    }
  },
  {
    id: 'qr-scan-1',
    type: 'qr',
    lane: 'interact',
    title: 'Venue Stamp Collection',
    subtitle: 'Scan QR codes around the venue',
    size: 'M',
    actions: [
      { label: 'Start Scanning', type: 'primary', action: 'open_scanner' }
    ],
    visibility: {
      stage: ['event']
    },
    analyticsTag: 'qr_card',
    award: {
      enabled: true,
      trigger: 'onComplete',
      points: 20,
      cooldownSec: 300 // 5 minutes between scans
    },
    params: {
      scanTypes: ['stamp', 'pickup'],
      reward: {
        points: 20,
        memory: 'venue-stamp'
      }
    }
  },
  {
    id: 'wearables-1',
    type: 'wearables',
    lane: 'interact',
    title: 'LED Wristband',
    subtitle: 'Sync your wearable',
    size: 'S',
    actions: [
      { label: 'Pair Device', type: 'primary', action: 'pair_wearable' }
    ],
    visibility: {
      stage: ['event']
    },
    analyticsTag: 'wearables_card',
    award: {
      enabled: true,
      trigger: 'onPair',
      points: 10,
      oneTime: true
    },
    params: {
      pairingType: 'bluetooth-mock',
      scenes: ['pulse', 'wave', 'rainbow'],
      status: 'unpaired'
    }
  },
  {
    id: 'ai-creation-1',
    type: 'ai',
    lane: 'interact',
    title: 'AI Video Creator',
    subtitle: 'Auto-caption your moments',
    size: 'M',
    actions: [
      { label: 'Create Video', type: 'primary', action: 'create_ai_video' }
    ],
    visibility: {
      stage: ['event'],
      minTier: 'Silver'
    },
    analyticsTag: 'ai_card',
    award: {
      enabled: true,
      trigger: 'onShare',
      points: 10
    },
    params: {
      captionStyles: ['modern', 'retro', 'minimal'],
      promptSeeds: ['epic moment', 'behind the scenes', 'crowd energy'],
      clipLength: 15
    }
  },
  {
    id: 'user-media-1',
    type: 'media',
    lane: 'interact',
    title: 'Capture & Share',
    subtitle: 'Share your photos and videos',
    size: 'M',
    actions: [
      { label: 'Take Photo', type: 'primary', action: 'capture_photo' },
      { label: 'Record Video', type: 'secondary', action: 'capture_video' }
    ],
    visibility: {
      stage: ['event']
    },
    analyticsTag: 'media_card',
    award: {
      enabled: true,
      trigger: 'onShare',
      points: 10,
      cooldownSec: 600 // 10 minutes
    }
  }
];

// ============================================================================
// REWARDS LANE CARDS
// ============================================================================

export const rewardsLaneCards: BaseCard[] = [
  {
    id: 'points-1',
    type: 'points',
    lane: 'rewards',
    title: 'Superfan Progress',
    subtitle: 'Silver Tier • 324 points',
    size: 'L',
    actions: [
      { label: 'View Tasks', type: 'primary', action: 'view_tasks' },
      { label: 'Tier Benefits', type: 'link', action: 'view_benefits' }
    ],
    visibility: {
      stage: ['event']
    },
    analyticsTag: 'points_card'
  },
  {
    id: 'discounts-1',
    type: 'discounts',
    lane: 'rewards',
    title: 'Silver Perks',
    subtitle: '15% off merch & food',
    size: 'M',
    actions: [
      { label: 'View All Perks', type: 'link', action: 'view_perks' }
    ],
    visibility: {
      stage: ['event'],
      minTier: 'Silver'
    },
    analyticsTag: 'discounts_card'
  },
  {
    id: 'merch-1',
    type: 'merch',
    lane: 'rewards',
    title: 'Official Merchandise',
    subtitle: 'Exclusive tour items',
    imageUrl: '/assets/merch-preview.jpg',
    size: 'M',
    actions: [
      { label: 'Shop Now', type: 'primary', action: 'shop_merch' }
    ],
    visibility: {
      stage: ['event']
    },
    analyticsTag: 'merch_card',
    award: {
      enabled: true,
      trigger: 'onOrderComplete',
      points: 20
    },
    params: {
      catalogue: [
        { id: 'm1', name: 'Tour T-Shirt', price: 35, tierDiscount: [{ tier: 'Silver', discount: 15 }] },
        { id: 'm2', name: 'Hoodie', price: 65, tierDiscount: [{ tier: 'Silver', discount: 15 }] }
      ]
    }
  },
  {
    id: 'fnb-1',
    type: 'food-beverage',
    lane: 'rewards',
    title: 'Food & Beverages',
    subtitle: 'Order ahead, skip the line',
    size: 'M',
    actions: [
      { label: 'Order Now', type: 'primary', action: 'order_fnb' }
    ],
    visibility: {
      stage: ['event']
    },
    analyticsTag: 'fnb_card',
    award: {
      enabled: true,
      trigger: 'onOrderComplete',
      points: 10
    },
    params: {
      menu: [
        { id: 'f1', name: 'Pizza Slice', price: 8, category: 'food', prepTime: 10 },
        { id: 'f2', name: 'Soft Drink', price: 5, category: 'beverage', prepTime: 2 }
      ],
      collectionPoint: 'Food Court - Counter 3',
      tierDiscounts: [
        { tier: 'Silver', discount: 10 },
        { tier: 'Gold', discount: 20 }
      ]
    }
  }
];

// ============================================================================
// USER STATE
// ============================================================================

export const sampleUserState = {
  userId: 'user-123',
  points: 324,
  tier: 'Silver' as const,
  memories: [] as Memory[],
  completedActions: ['qr-scan-entrance', 'wearable-pair'],
  zone: 'main-stage',
  online: true,
  queuedActions: []
};

// ============================================================================
// POINTS PROGRESS
// ============================================================================

export const samplePointsProgress: PointsProgress = {
  current: 324,
  tier: 'Silver',
  nextTier: {
    name: 'Gold',
    threshold: 500,
    remaining: 176
  }
};

// ============================================================================
// ALL CARDS
// ============================================================================

export const allSampleCards: BaseCard[] = [
  ...infoLaneCards,
  ...interactLaneCards,
  ...rewardsLaneCards
];
