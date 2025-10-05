import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../server/auth';
import { storage } from '../../../../../server/storage';

export const GET = withAuth(async (request: NextRequest, session: any) => {
  try {
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    const filters: any = {};
    
    if (searchParams.get('eventId')) {
      filters.eventId = searchParams.get('eventId');
    }
    if (searchParams.get('type')) {
      filters.type = searchParams.get('type');
    }
    if (searchParams.get('memoryTemplateId')) {
      filters.memoryTemplateId = searchParams.get('memoryTemplateId');
    }
    if (searchParams.get('isActive') !== null) {
      filters.isActive = searchParams.get('isActive') === 'true';
    }

    const rules = await storage.getAllRewardRules(filters);

    return NextResponse.json(rules);
  } catch (error: any) {
    console.error('Failed to list reward rules:', error);
    return NextResponse.json(
      { error: 'Failed to list reward rules', details: error.message },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, session: any) => {
  try {
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.eventId || !body.type || !body.name || !body.memoryTemplateId) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, type, name, and memoryTemplateId are required' },
        { status: 400 }
      );
    }

    if (!['qr', 'location', 'action'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: qr, location, action' },
        { status: 400 }
      );
    }

    const ruleData = {
      eventId: body.eventId,
      type: body.type,
      name: body.name,
      description: body.description || null,
      memoryTemplateId: body.memoryTemplateId,
      matchConfig: body.matchConfig || null,
      constraints: body.constraints || null,
      antiAbuse: body.antiAbuse || null,
      validityStart: body.validityStart ? new Date(body.validityStart) : null,
      validityEnd: body.validityEnd ? new Date(body.validityEnd) : null,
      maxRedemptions: body.maxRedemptions !== undefined ? body.maxRedemptions : null,
      isActive: body.isActive !== undefined ? body.isActive : true,
      createdBy: session.user.id,
    };

    const rule = await storage.createRewardRule(ruleData);

    return NextResponse.json(rule, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create reward rule:', error);
    return NextResponse.json(
      { error: 'Failed to create reward rule', details: error.message },
      { status: 500 }
    );
  }
});
