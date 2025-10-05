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

    const template = await storage.getMemoryTemplate(params.id);

    if (!template) {
      return NextResponse.json(
        { error: 'Memory template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error: any) {
    console.error('Failed to get memory template:', error);
    return NextResponse.json(
      { error: 'Failed to get memory template', details: error.message },
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
    
    const updates: any = {};
    if (body.eventId !== undefined) updates.eventId = body.eventId;
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.mediaType !== undefined) updates.mediaType = body.mediaType;
    if (body.mediaAsset !== undefined) updates.mediaAsset = body.mediaAsset;
    if (body.points !== undefined) updates.points = body.points;
    if (body.rarity !== undefined) updates.rarity = body.rarity;
    if (body.setId !== undefined) updates.setId = body.setId;
    if (body.setName !== undefined) updates.setName = body.setName;
    if (body.setIndex !== undefined) updates.setIndex = body.setIndex;
    if (body.setTotal !== undefined) updates.setTotal = body.setTotal;
    if (body.metadataSchema !== undefined) updates.metadataSchema = body.metadataSchema;
    if (body.ogShareTitle !== undefined) updates.ogShareTitle = body.ogShareTitle;
    if (body.ogShareDescription !== undefined) updates.ogShareDescription = body.ogShareDescription;
    if (body.ogShareImage !== undefined) updates.ogShareImage = body.ogShareImage;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    const updated = await storage.updateMemoryTemplate(params.id, updates);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Failed to update memory template:', error);
    return NextResponse.json(
      { error: 'Failed to update memory template', details: error.message },
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

    const result = await storage.deleteMemoryTemplate(params.id);

    if (!result.success && result.inUse) {
      const messages = [];
      if (result.count && result.count > 0) {
        messages.push(`${result.count} user ${result.count === 1 ? 'memory' : 'memories'}`);
      }
      if (result.rewardRulesCount && result.rewardRulesCount > 0) {
        messages.push(`${result.rewardRulesCount} reward ${result.rewardRulesCount === 1 ? 'rule' : 'rules'}`);
      }
      
      const message = messages.length > 0 
        ? `This template is referenced by ${messages.join(' and ')} and cannot be deleted.`
        : 'This template is currently in use and cannot be deleted.';
      
      return NextResponse.json(
        { 
          error: 'Memory template is currently in use and cannot be deleted',
          message,
          inUse: true,
          count: result.count,
          rewardRulesCount: result.rewardRulesCount
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete memory template:', error);
    return NextResponse.json(
      { error: 'Failed to delete memory template', details: error.message },
      { status: 500 }
    );
  }
});
