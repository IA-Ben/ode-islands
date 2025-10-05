import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../../server/auth';
import { storage } from '../../../../../../server/storage';

export const GET = withAuth(async (request: NextRequest, session: any, { params }: { params: { id: string } }) => {
  try {
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const rule = await storage.getRewardRule(params.id);

    if (!rule) {
      return NextResponse.json(
        { error: 'Reward rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(rule);
  } catch (error: any) {
    console.error('Failed to get reward rule:', error);
    return NextResponse.json(
      { error: 'Failed to get reward rule', details: error.message },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(async (request: NextRequest, session: any, { params }: { params: { id: string } }) => {
  try {
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    if (body.type && !['qr', 'location', 'action'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: qr, location, action' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (body.eventId !== undefined) updates.eventId = body.eventId;
    if (body.type !== undefined) updates.type = body.type;
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.memoryTemplateId !== undefined) updates.memoryTemplateId = body.memoryTemplateId;
    if (body.matchConfig !== undefined) updates.matchConfig = body.matchConfig;
    if (body.constraints !== undefined) updates.constraints = body.constraints;
    if (body.antiAbuse !== undefined) updates.antiAbuse = body.antiAbuse;
    if (body.validityStart !== undefined) updates.validityStart = body.validityStart ? new Date(body.validityStart) : null;
    if (body.validityEnd !== undefined) updates.validityEnd = body.validityEnd ? new Date(body.validityEnd) : null;
    if (body.maxRedemptions !== undefined) updates.maxRedemptions = body.maxRedemptions;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    const updated = await storage.updateRewardRule(params.id, updates);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Failed to update reward rule:', error);
    return NextResponse.json(
      { error: 'Failed to update reward rule', details: error.message },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request: NextRequest, session: any, { params }: { params: { id: string } }) => {
  try {
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    await storage.deleteRewardRule(params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete reward rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete reward rule', details: error.message },
      { status: 500 }
    );
  }
});
