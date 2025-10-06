import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../../server/db';
import { featuredRules, featuredRuleConditions } from '../../../../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { withAuth } from '../../../../../../../server/auth';
import { requirePermission } from '../../../../../../../server/rbac';

const VALID_CONTEXTS = ['event_hub', 'story_chapter', 'before', 'after', 'rewards'];

async function handlePUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const { name, description, context, cardId, priority, pinned, popularityBoost, startsAt, endsAt, isActive, conditions } = body;

    const existingRule = await db
      .select()
      .from(featuredRules)
      .where(eq(featuredRules.id, id))
      .limit(1);

    if (existingRule.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rule not found' },
        { status: 404 }
      );
    }

    if (context && !VALID_CONTEXTS.includes(context)) {
      return NextResponse.json(
        { success: false, error: `Invalid context. Must be one of: ${VALID_CONTEXTS.join(', ')}` },
        { status: 400 }
      );
    }

    if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
      return NextResponse.json(
        { success: false, error: 'Start time must be before end time' },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (context !== undefined) updateData.context = context;
      if (cardId !== undefined) updateData.cardId = cardId;
      if (priority !== undefined) updateData.priority = priority;
      if (pinned !== undefined) updateData.pinned = pinned;
      if (popularityBoost !== undefined) updateData.popularityBoost = popularityBoost;
      if (startsAt !== undefined) updateData.startsAt = startsAt ? new Date(startsAt) : null;
      if (endsAt !== undefined) updateData.endsAt = endsAt ? new Date(endsAt) : null;
      if (isActive !== undefined) updateData.isActive = isActive;
      updateData.updatedAt = new Date();

      const [updatedRule] = await tx
        .update(featuredRules)
        .set(updateData)
        .where(eq(featuredRules.id, id))
        .returning();

      if (conditions !== undefined) {
        await tx.delete(featuredRuleConditions).where(eq(featuredRuleConditions.ruleId, id));

        if (Array.isArray(conditions) && conditions.length > 0) {
          for (const condition of conditions) {
            await tx.insert(featuredRuleConditions).values({
              ruleId: id,
              conditionType: condition.conditionType,
              conditionData: condition.conditionData,
            });
          }
        }
      }

      const conditionsResult = await tx
        .select()
        .from(featuredRuleConditions)
        .where(eq(featuredRuleConditions.ruleId, id));

      return { ...updatedRule, conditions: conditionsResult };
    });

    return NextResponse.json({
      success: true,
      rule: result,
    });
  } catch (error) {
    console.error('Error updating featured rule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update featured rule' },
      { status: 500 }
    );
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try{
    const id = params.id;

    const existingRule = await db
      .select()
      .from(featuredRules)
      .where(eq(featuredRules.id, id))
      .limit(1);

    if (existingRule.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rule not found' },
        { status: 404 }
      );
    }

    await db.transaction(async (tx) => {
      await tx.delete(featuredRuleConditions).where(eq(featuredRuleConditions.ruleId, id));
      await tx.delete(featuredRules).where(eq(featuredRules.id, id));
    });

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting featured rule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete featured rule' },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(requirePermission('featured:edit')(handlePUT));
export const DELETE = withAuth(requirePermission('featured:delete')(handleDELETE));
