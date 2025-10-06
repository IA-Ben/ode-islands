import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { featuredRules, cards, mediaAssets, featuredRuleConditions } from '../../../../../shared/schema';
import { eq, and, or, desc, lte, gte, isNull } from 'drizzle-orm';

const VALID_CONTEXTS = ['event_hub', 'story_chapter', 'before', 'after', 'rewards'];

type TierRequirement = 'Bronze' | 'Silver' | 'Gold' | 'any';
type Zone = 'main-stage' | 'lobby' | 'vip-lounge' | 'food-court' | 'merchandise' | 'any';

interface FeaturedCardWithRules {
  id: string;
  size: 'S' | 'M' | 'L';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaAction?: Function;
  analyticsTag: string;
  layoutHint?: 'hero' | 'carousel';
  rules: {
    pinned: boolean;
    timeWindow?: { startTime: Date; endTime: Date };
    tierRequirement: TierRequirement;
    zone?: Zone;
    popularity: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextParam = searchParams.get('context');

    if (!contextParam) {
      return NextResponse.json(
        { success: false, error: 'context parameter is required' },
        { status: 400 }
      );
    }

    if (!VALID_CONTEXTS.includes(contextParam)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid context. Must be one of: ${VALID_CONTEXTS.join(', ')}` 
        },
        { status: 400 }
      );
    }

    const context = contextParam as 'event_hub' | 'story_chapter' | 'before' | 'after' | 'rewards';
    const now = new Date();

    const rulesWithCards = await db
      .select({
        ruleId: featuredRules.id,
        rulePriority: featuredRules.priority,
        rulePinned: featuredRules.pinned,
        rulePopularityBoost: featuredRules.popularityBoost,
        ruleStartsAt: featuredRules.startsAt,
        ruleEndsAt: featuredRules.endsAt,
        cardId: cards.id,
        cardTitle: cards.title,
        cardSubtitle: cards.subtitle,
        cardSize: cards.size,
        imageUrl: mediaAssets.cloudUrl,
      })
      .from(featuredRules)
      .innerJoin(cards, eq(featuredRules.cardId, cards.id))
      .leftJoin(mediaAssets, eq(cards.imageMediaId, mediaAssets.id))
      .where(
        and(
          eq(featuredRules.context, context),
          eq(featuredRules.isActive, true),
          eq(cards.publishStatus, 'published'),
          eq(cards.isActive, true),
          or(
            and(
              isNull(featuredRules.startsAt),
              isNull(featuredRules.endsAt)
            ),
            and(
              lte(featuredRules.startsAt, now),
              gte(featuredRules.endsAt, now)
            ),
            and(
              lte(featuredRules.startsAt, now),
              isNull(featuredRules.endsAt)
            ),
            and(
              isNull(featuredRules.startsAt),
              gte(featuredRules.endsAt, now)
            )
          )
        )
      )
      .orderBy(desc(featuredRules.priority), desc(featuredRules.pinned));

    const ruleIds = rulesWithCards.map(r => r.ruleId);

    let conditions: Array<{
      ruleId: string;
      conditionType: string;
      conditionData: any;
    }> = [];

    if (ruleIds.length > 0) {
      conditions = await db
        .select({
          ruleId: featuredRuleConditions.ruleId,
          conditionType: featuredRuleConditions.conditionType,
          conditionData: featuredRuleConditions.conditionData,
        })
        .from(featuredRuleConditions)
        .where(
          eq(featuredRuleConditions.ruleId, ruleIds[0])
        );

      if (ruleIds.length > 1) {
        for (let i = 1; i < ruleIds.length; i++) {
          const moreConditions = await db
            .select({
              ruleId: featuredRuleConditions.ruleId,
              conditionType: featuredRuleConditions.conditionType,
              conditionData: featuredRuleConditions.conditionData,
            })
            .from(featuredRuleConditions)
            .where(
              eq(featuredRuleConditions.ruleId, ruleIds[i])
            );
          conditions = conditions.concat(moreConditions);
        }
      }
    }

    const conditionsByRuleId = conditions.reduce((acc, condition) => {
      if (!acc[condition.ruleId]) {
        acc[condition.ruleId] = [];
      }
      acc[condition.ruleId].push(condition);
      return acc;
    }, {} as Record<string, typeof conditions>);

    const transformedCards: FeaturedCardWithRules[] = rulesWithCards.map(rule => {
      const ruleConditions = conditionsByRuleId[rule.ruleId] || [];
      
      const tierCondition = ruleConditions.find(c => c.conditionType === 'tier_requirement');
      const zoneCondition = ruleConditions.find(c => c.conditionType === 'zone');

      const tierRequirement: TierRequirement = tierCondition?.conditionData?.tier || 'any';
      const zone: Zone | undefined = zoneCondition?.conditionData?.zone;

      const timeWindow = rule.ruleStartsAt && rule.ruleEndsAt
        ? {
            startTime: new Date(rule.ruleStartsAt),
            endTime: new Date(rule.ruleEndsAt),
          }
        : undefined;

      const size = (rule.cardSize as 'S' | 'M' | 'L') || 'M';
      const layoutHint = size === 'L' ? 'hero' : 'carousel';

      return {
        id: rule.cardId,
        size,
        title: rule.cardTitle,
        subtitle: rule.cardSubtitle || undefined,
        imageUrl: rule.imageUrl || undefined,
        analyticsTag: `featured-${rule.cardId}`,
        layoutHint,
        rules: {
          pinned: rule.rulePinned || false,
          timeWindow,
          tierRequirement,
          zone,
          popularity: rule.rulePopularityBoost || 0,
        },
      };
    });

    return NextResponse.json({
      success: true,
      cards: transformedCards,
    });
  } catch (error) {
    console.error('Error fetching featured rules:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch featured rules',
        cards: [],
      },
      { status: 500 }
    );
  }
}
