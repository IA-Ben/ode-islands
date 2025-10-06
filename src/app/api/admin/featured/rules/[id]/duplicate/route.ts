import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../../../server/db';
import { featuredRules, featuredRuleConditions } from '../../../../../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { withAuth } from '../../../../../../../../server/auth';
import { requirePermission } from '../../../../../../../../server/rbac';

async function handlePOST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const [existingRule] = await db
      .select()
      .from(featuredRules)
      .where(eq(featuredRules.id, id))
      .limit(1);

    if (!existingRule) {
      return NextResponse.json(
        { success: false, error: 'Rule not found' },
        { status: 404 }
      );
    }

    const existingConditions = await db
      .select()
      .from(featuredRuleConditions)
      .where(eq(featuredRuleConditions.ruleId, id));

    const result = await db.transaction(async (tx) => {
      const [newRule] = await tx
        .insert(featuredRules)
        .values({
          name: `${existingRule.name} (Copy)`,
          description: existingRule.description,
          context: existingRule.context,
          cardId: existingRule.cardId,
          priority: existingRule.priority,
          pinned: false,
          popularityBoost: existingRule.popularityBoost,
          startsAt: existingRule.startsAt,
          endsAt: existingRule.endsAt,
          isActive: false,
        })
        .returning();

      if (existingConditions.length > 0) {
        for (const condition of existingConditions) {
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
    console.error('Error duplicating featured rule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to duplicate featured rule' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(requirePermission('featured:create')(handlePOST));
