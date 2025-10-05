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
    if (searchParams.get('mediaType')) {
      filters.mediaType = searchParams.get('mediaType');
    }
    if (searchParams.get('rarity')) {
      filters.rarity = searchParams.get('rarity');
    }
    if (searchParams.get('isActive') !== null) {
      filters.isActive = searchParams.get('isActive') === 'true';
    }

    const templates = await storage.getAllMemoryTemplates(filters);

    return NextResponse.json(templates);
  } catch (error: any) {
    console.error('Failed to list memory templates:', error);
    return NextResponse.json(
      { error: 'Failed to list memory templates', details: error.message },
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

    if (!body.title || !body.mediaType) {
      return NextResponse.json(
        { error: 'Missing required fields: title and mediaType are required' },
        { status: 400 }
      );
    }

    const templateData = {
      eventId: body.eventId || null,
      title: body.title,
      description: body.description || null,
      mediaType: body.mediaType,
      mediaAsset: body.mediaAsset || null,
      points: body.points !== undefined ? body.points : 0,
      rarity: body.rarity || 'common',
      setId: body.setId || null,
      setName: body.setName || null,
      setIndex: body.setIndex !== undefined ? body.setIndex : null,
      setTotal: body.setTotal !== undefined ? body.setTotal : null,
      metadataSchema: body.metadataSchema || null,
      ogShareTitle: body.ogShareTitle || null,
      ogShareDescription: body.ogShareDescription || null,
      ogShareImage: body.ogShareImage || null,
      isActive: body.isActive !== undefined ? body.isActive : true,
      createdBy: session.user.id,
    };

    const template = await storage.createMemoryTemplate(templateData);

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create memory template:', error);
    return NextResponse.json(
      { error: 'Failed to create memory template', details: error.message },
      { status: 500 }
    );
  }
});
