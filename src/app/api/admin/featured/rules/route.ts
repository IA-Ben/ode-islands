import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../server/db';
import { featuredRules, featuredRuleConditions, cards, mediaAssets } from '../../../../../../shared/schema';
import { eq, and, desc, asc, sql, or, like, inArray } from 'drizzle-orm';
import { withAuth } from '../../../../../../server/auth';
import { requirePermission } from '../../../../../../server/rbac';

const VALID_CONTEXTS = ['event_hub', 'story_chapter', 'before', 'after', 'rewards'];

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const context = searchParams.get('context');
    const active = searchParams.get('active');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let whereConditions: any[] = [];

    if (context && VALID_CONTEXTS.includes(context)) {
      whereConditions.push(eq(featuredRules.context, context as any));
    }

    if (active !== null && active !== undefined && active !== '') {
      whereConditions.push(eq(featuredRules.isActive, active === 'true'));
    }

    if (search && search.trim()) {
      whereConditions.push(
        or(
          like(featuredRules.name, `%${search}%`),
          like(featuredRules.description, `%${search}%`)
        )
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [rulesData, totalCountResult] = await Promise.all([
      db
        .select({
          id: featuredRules.id,
          name: featuredRules.name,
          description: featuredRules.description,
          context: featuredRules.context,
          priority: featuredRules.priority,
          pinned: featuredRules.pinned,
          popularityBoost: featuredRules.popularityBoost,
          startsAt: featuredRules.startsAt,
          endsAt: featuredRules.endsAt,
          isActive: featuredRules.isActive,
          createdAt: featuredRules.createdAt,
          updatedAt: featuredRules.updatedAt,
          cardId: featuredRules.cardId,
          cardTitle: cards.title,
          cardSubtitle: cards.subtitle,
          imageUrl: mediaAssets.cloudUrl,
        })
        .from(featuredRules)
        .leftJoin(cards, eq(featuredRules.cardId, cards.id))
        .leftJoin(mediaAssets, eq(cards.imageMediaId, mediaAssets.id))
        .where(whereClause)
        .orderBy(desc(featuredRules.priority), desc(featuredRules.createdAt))
        .limit(limit)
        .offset(offset),
      
      db
        .select({ count: sql<number>`count(*)` })
        .from(featuredRules)
        .where(whereClause)
    ]);

    const ruleIds = rulesData.map(r => r.id);
    let conditionsData: any[] = [];

    if (ruleIds.length > 0) {
      conditionsData = await db
        .select()
        .from(featuredRuleConditions)
        .where(inArray(featuredRuleConditions.ruleId, ruleIds));
    }

    const conditionsByRuleId = conditionsData.reduce((acc, condition) => {
      if (!acc[condition.ruleId]) {
        acc[condition.ruleId] = [];
      }
      acc[condition.ruleId].push(condition);
      return acc;
    }, {} as Record<string, typeof conditionsData>);

    const rules = rulesData.map(rule => ({
      ...rule,
      conditions: conditionsByRuleId[rule.id] || [],
    }));

    const total = totalCountResult[0]?.count || 0;

    return NextResponse.json({
      success: true,
      rules,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching featured rules:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch featured rules' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, context, cardId, priority, pinned, popularityBoost, startsAt, endsAt, isActive, conditions } = body;

    if (!name || !context || !cardId) {
      return NextResponse.json(
        { success: false, error: 'Name, context, and cardId are required' },
        { status: 400 }
      );
    }

    if (!VALID_CONTEXTS.includes(context)) {
      return NextResponse.json(
        { success: false, error: `Invalid context. Must be one of: ${VALID_CONTEXTS.join(', ')}` },
        { status: 400 }
      );
    }

    const existingRule = await db
      .select()
      .from(featuredRules)
      .where(and(eq(featuredRules.name, name), eq(featuredRules.context, context)))
      .limit(1);

    if (existingRule.length > 0) {
      return NextResponse.json(
        { success: false, error: 'A rule with this name already exists in this context' },
        { status: 409 }
      );
    }

    if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
      return NextResponse.json(
        { success: false, error: 'Start time must be before end time' },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const [newRule] = await tx
        .insert(featuredRules)
        .values({
          name,
          description: description || null,
          context,
          cardId,
          priority: priority || 0,
          pinned: pinned || false,
          popularityBoost: popularityBoost || 0,
          startsAt: startsAt ? new Date(startsAt) : null,
          endsAt: endsAt ? new Date(endsAt) : null,
          isActive: isActive !== undefined ? isActive : true,
        })
        .returning();

      if (conditions && Array.isArray(conditions) && conditions.length > 0) {
        for (const condition of conditions) {
          await tx.insert(featuredRuleConditions).values({
            ruleId: newRule.id,
            conditionType: condition.conditionType,
            conditionData: condition.conditionData,
          });
        }
      }

      const conditionsResult = await tx
        .select()
        .from(featuredRuleConditions)
        .where(eq(featuredRuleConditions.ruleId, newRule.id));

      return { ...newRule, conditions: conditionsResult };
    });

    return NextResponse.json({
      success: true,
      rule: result,
    });
  } catch (error) {
    console.error('Error creating featured rule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create featured rule' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(requirePermission('featured:view')(handleGET));
export const POST = withAuth(requirePermission('featured:create')(handlePOST));
