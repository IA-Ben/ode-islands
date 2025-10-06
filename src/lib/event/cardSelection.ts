import type { FeaturedCard } from '@/components/event/EventHub';

export type Tier = 'Bronze' | 'Silver' | 'Gold';
export type Zone = 'main-stage' | 'lobby' | 'vip-lounge' | 'food-court' | 'merchandise' | 'any';

export interface TimeWindow {
  startTime: Date;
  endTime: Date;
}

export interface CardSelectionRules {
  pinned: boolean;
  timeWindow?: TimeWindow;
  tierRequirement: Tier | 'any';
  zone?: Zone;
  popularity: number;
}

export interface FeaturedCardWithRules extends FeaturedCard {
  rules: CardSelectionRules;
  analyticsTag: string;
  layoutHint?: 'hero' | 'carousel';
}

export interface UserContext {
  currentTier: Tier;
  currentTime: Date;
  userZone?: Zone;
  clickData?: Record<string, number>;
}

export interface SelectionResult {
  selectedCards: FeaturedCard[];
  layoutHint: 'hero' | 'carousel' | 'fallback';
}

const TIER_HIERARCHY: Record<Tier, number> = {
  Bronze: 1,
  Silver: 2,
  Gold: 3,
};

function isTierEligible(cardTier: Tier | 'any', userTier: Tier): boolean {
  if (cardTier === 'any') return true;
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[cardTier];
}

function isWithinTimeWindow(timeWindow: TimeWindow | undefined, currentTime: Date): boolean {
  if (!timeWindow) return true;
  return currentTime >= timeWindow.startTime && currentTime <= timeWindow.endTime;
}

function isZoneMatch(cardZone: Zone | undefined, userZone: Zone | undefined): boolean {
  if (!cardZone || cardZone === 'any') return true;
  if (!userZone) return true;
  return cardZone === userZone;
}

export function selectFeaturedCards(
  allCards: FeaturedCardWithRules[],
  userContext: UserContext,
  currentTime?: Date
): SelectionResult {
  const now = currentTime || userContext.currentTime;

  const eligibleCards = allCards.filter((card) => {
    const tierMatch = isTierEligible(card.rules.tierRequirement, userContext.currentTier);
    const timeMatch = isWithinTimeWindow(card.rules.timeWindow, now);
    const zoneMatch = isZoneMatch(card.rules.zone, userContext.userZone);

    return tierMatch && timeMatch && zoneMatch;
  });

  const sortedCards = eligibleCards.sort((a, b) => {
    if (a.rules.pinned && !b.rules.pinned) return -1;
    if (!a.rules.pinned && b.rules.pinned) return 1;

    if (a.rules.timeWindow && !b.rules.timeWindow) return -1;
    if (!a.rules.timeWindow && b.rules.timeWindow) return 1;

    const aTierValue = a.rules.tierRequirement === 'any' ? 0 : TIER_HIERARCHY[a.rules.tierRequirement];
    const bTierValue = b.rules.tierRequirement === 'any' ? 0 : TIER_HIERARCHY[b.rules.tierRequirement];
    if (aTierValue !== bTierValue) return bTierValue - aTierValue;

    if (a.rules.zone && a.rules.zone !== 'any' && (!b.rules.zone || b.rules.zone === 'any')) return -1;
    if ((!a.rules.zone || a.rules.zone === 'any') && b.rules.zone && b.rules.zone !== 'any') return 1;

    return b.rules.popularity - a.rules.popularity;
  });

  if (sortedCards.length === 0) {
    return {
      selectedCards: [],
      layoutHint: 'fallback',
    };
  }

  if (sortedCards.length === 1 && sortedCards[0].size === 'L') {
    return {
      selectedCards: [sortedCards[0]],
      layoutHint: 'hero',
    };
  }

  const selectedCards = sortedCards.slice(0, 3);

  const hasLargeCard = selectedCards.some((card) => card.size === 'L');
  if (hasLargeCard) {
    const largeCard = selectedCards.find((card) => card.size === 'L');
    return {
      selectedCards: largeCard ? [largeCard] : selectedCards.slice(0, 1),
      layoutHint: 'hero',
    };
  }

  return {
    selectedCards,
    layoutHint: 'carousel',
  };
}

export function createMockAnalyticsData(): Record<string, number> {
  return {
    'featured-hero-welcome': 245,
    'featured-ar-experience': 189,
    'featured-limited-merch': 156,
    'featured-vip-upgrade': 134,
    'featured-photo-contest': 98,
    'featured-backstage-tour': 76,
    'featured-exclusive-content': 52,
  };
}

export function getFallbackCards(): FeaturedCard[] {
  return [
    {
      id: 'fallback-map',
      size: 'M',
      title: 'Venue Map',
      subtitle: 'Navigate the Space',
      ctaLabel: 'View Map',
      ctaAction: () => console.log('Map clicked'),
    },
    {
      id: 'fallback-schedule',
      size: 'M',
      title: 'Event Schedule',
      subtitle: 'What\'s Happening',
      ctaLabel: 'View Schedule',
      ctaAction: () => console.log('Schedule clicked'),
    },
  ];
}
