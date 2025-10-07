import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { cards, cardAssignments, mediaAssets, featuredRules, featuredRuleConditions, beforeLanes } from '../../../../../shared/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

interface UserContext {
  tier?: 'bronze' | 'silver' | 'gold';
  hasTicket?: boolean;
  firstTimer?: boolean;
  location?: { lat: number; lng: number };
  eventDate?: string;
  currentTime?: string;
}

function evaluateTargetingRules(card: any, context: UserContext): boolean {
  if (!card.metadata?.targeting) return true;
  
  const targeting = card.metadata.targeting;
  
  // Time window evaluation
  if (targeting.timeWindow && context.eventDate && context.currentTime) {
    const now = new Date(context.currentTime);
    const eventDate = new Date(context.eventDate);
    
    if (targeting.timeWindow.relativeDays) {
      const targetDate = new Date(eventDate);
      targetDate.setDate(targetDate.getDate() + targeting.timeWindow.relativeDays);
      if (now > targetDate) return false;
    }
    
    if (targeting.timeWindow.relativeHours) {
      const targetDate = new Date(eventDate);
      targetDate.setHours(targetDate.getHours() + targeting.timeWindow.relativeHours);
      if (now > targetDate) return false;
    }
  }
  
  // Persona targeting
  if (targeting.persona) {
    if (targeting.persona.hasTicket !== undefined && targeting.persona.hasTicket !== context.hasTicket) {
      return false;
    }
    if (targeting.persona.tier && targeting.persona.tier !== 'any' && targeting.persona.tier !== context.tier) {
      return false;
    }
    if (targeting.persona.firstTimer !== undefined && targeting.persona.firstTimer !== context.firstTimer) {
      return false;
    }
  }
  
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lane = searchParams.get('lane'); // 'plan', 'discover', 'community', 'bts'
    const featured = searchParams.get('featured'); // 'true' for featured rail
    const tier = searchParams.get('tier'); // 'bronze', 'silver', 'gold'
    const hasTicket = searchParams.get('hasTicket') === 'true';
    const firstTimer = searchParams.get('firstTimer') === 'true';
    const eventDate = searchParams.get('eventDate');
    const currentTime = new Date().toISOString();

    // Build user context for targeting evaluation
    const userContext: UserContext = {
      tier: tier as any,
      hasTicket,
      firstTimer,
      eventDate: eventDate || undefined,
      currentTime,
    };

    let query = db
      .select({
        card: cards,
        assignment: cardAssignments,
        imageMedia: mediaAssets,
      })
      .from(cards)
      .leftJoin(cardAssignments, eq(cards.id, cardAssignments.cardId))
      .leftJoin(mediaAssets, eq(cards.imageMediaId, mediaAssets.id))
      .$dynamic();

    const conditions: any[] = [
      eq(cards.scope, 'event'), // Before phase uses 'event' scope
      eq(cards.publishStatus, 'published'), // Only published cards
      eq(cards.isActive, true), // Only active cards
    ];

    // Featured rail logic
    if (featured === 'true') {
      const now = new Date();
      
      // Fetch featured rules for 'before' context with proper filtering
      const featuredCardsQuery = await db
        .select({
          card: cards,
          rule: featuredRules,
          imageMedia: mediaAssets,
        })
        .from(featuredRules)
        .innerJoin(cards, eq(featuredRules.cardId, cards.id))
        .leftJoin(mediaAssets, eq(cards.imageMediaId, mediaAssets.id))
        .where(
          and(
            eq(featuredRules.context, 'before'),
            eq(featuredRules.isActive, true), // Only active rules
            eq(cards.isActive, true),
            eq(cards.publishStatus, 'published')
          )
        )
        .orderBy(desc(featuredRules.priority));

      // Fetch conditions for each rule
      const ruleIds = featuredCardsQuery.map(r => r.rule.id);
      const conditions = ruleIds.length > 0 
        ? await db
            .select()
            .from(featuredRuleConditions)
            .where(inArray(featuredRuleConditions.ruleId, ruleIds))
        : [];

      const conditionsByRule = new Map();
      conditions.forEach(c => {
        if (!conditionsByRule.has(c.ruleId)) {
          conditionsByRule.set(c.ruleId, []);
        }
        conditionsByRule.get(c.ruleId).push(c);
      });

      // Evaluate each featured rule
      const validFeatured = [];
      for (const row of featuredCardsQuery) {
        const rule = row.rule;
        
        // Check time window
        if (rule.startsAt && new Date(rule.startsAt) > now) continue;
        if (rule.endsAt && new Date(rule.endsAt) < now) continue;
        
        // Check if rule applies to this user context
        const ruleConditions = conditionsByRule.get(rule.id) || [];
        let conditionsMet = true;
        
        for (const condition of ruleConditions) {
          if (condition.conditionType === 'tier') {
            const requiredTier = condition.conditionData?.tier;
            if (requiredTier && requiredTier !== 'any' && requiredTier !== tier) {
              conditionsMet = false;
              break;
            }
          }
          
          if (condition.conditionType === 'zone') {
            const requiredZone = condition.conditionData?.zone;
            if (requiredZone && requiredZone !== 'any') {
              conditionsMet = false;
              break;
            }
          }
          
          if (condition.conditionType === 'time_window') {
            const windowData = condition.conditionData;
            if (windowData?.startTime && new Date(windowData.startTime) > now) {
              conditionsMet = false;
              break;
            }
            if (windowData?.endTime && new Date(windowData.endTime) < now) {
              conditionsMet = false;
              break;
            }
          }
        }
        
        if (!conditionsMet) continue;
        
        // Check card-level targeting rules
        if (!evaluateTargetingRules(row.card, userContext)) continue;
        
        validFeatured.push({
          ...row.card,
          imageMedia: row.imageMedia,
          imageUrl: row.imageMedia?.cloudUrl || null,
          isFeatured: true,
          priority: rule.priority,
          isPinned: rule.pinned || false,
        });
        
        // Limit to 3 featured cards
        if (validFeatured.length >= 3) break;
      }

      return NextResponse.json({
        cards: validFeatured,
        count: validFeatured.length,
        type: 'featured',
      });
    }

    // Filter by lane if specified - look up lane by laneKey first
    if (lane) {
      // Find the lane record by laneKey
      const [laneRecord] = await db
        .select()
        .from(beforeLanes)
        .where(
          and(
            eq(beforeLanes.laneKey, lane),
            eq(beforeLanes.isActive, true)
          )
        )
        .limit(1);
      
      if (laneRecord) {
        conditions.push(
          and(
            eq(cardAssignments.parentType, 'before_lane'),
            eq(cardAssignments.parentId, laneRecord.id)
          )
        );
      } else {
        // Lane not found, return empty results
        return NextResponse.json({
          cards: [],
          count: 0,
          type: `lane:${lane}`,
          message: `Lane '${lane}' not found or inactive`,
        });
      }
    }

    query = query.where(and(...conditions));
    const results = await query.orderBy(
      cardAssignments.order ? cardAssignments.order : desc(cards.createdAt)
    );

    // Group cards and deduplicate (since left join can create duplicates)
    const cardsMap = new Map();
    for (const row of results) {
      if (!cardsMap.has(row.card.id)) {
        cardsMap.set(row.card.id, {
          ...row.card,
          imageMedia: row.imageMedia,
          imageUrl: row.imageMedia?.cloudUrl || null,
          assignments: [],
          order: row.assignment?.order || 0,
        });
      }
      if (row.assignment) {
        cardsMap.get(row.card.id).assignments.push(row.assignment);
      }
    }

    let cardsList = Array.from(cardsMap.values());

    // Apply targeting rules filtering
    cardsList = cardsList.filter(card => evaluateTargetingRules(card, userContext));

    // Sort by order if available
    cardsList.sort((a, b) => (a.order || 0) - (b.order || 0));

    return NextResponse.json({
      cards: cardsList,
      count: cardsList.length,
      type: lane ? `lane:${lane}` : 'all',
    });
  } catch (error) {
    console.error('Error fetching before cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch before cards' },
      { status: 500 }
    );
  }
}
