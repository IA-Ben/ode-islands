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

    const media = await storage.getMedia(params.id);

    if (!media) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: media.id,
      title: media.title || media.storageKey,
      fileName: media.storageKey.split('/').pop() || media.storageKey,
      fileType: media.fileType,
      fileSize: media.fileSize,
      url: media.cloudUrl,
      thumbnailUrl: media.cloudUrl,
      altText: media.altText || '',
      description: media.description || '',
      tags: Array.isArray(media.tags) ? media.tags : [],
      uploadedBy: media.uploadedBy || 'system',
      uploaderName: session?.user?.firstName || 'System',
      createdAt: media.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: media.updatedAt?.toISOString() || new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to get media:', error);
    return NextResponse.json(
      { error: 'Failed to get media', details: error.message },
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
    if (body.title !== undefined) updates.title = body.title;
    if (body.altText !== undefined) updates.altText = body.altText;
    if (body.description !== undefined) updates.description = body.description;
    if (body.tags !== undefined) updates.tags = body.tags;

    const updated = await storage.updateMediaMetadata(params.id, updates);

    return NextResponse.json({
      id: updated.id,
      title: updated.title || updated.storageKey,
      fileName: updated.storageKey.split('/').pop() || updated.storageKey,
      fileType: updated.fileType,
      fileSize: updated.fileSize,
      url: updated.cloudUrl,
      thumbnailUrl: updated.cloudUrl,
      altText: updated.altText || '',
      description: updated.description || '',
      tags: Array.isArray(updated.tags) ? updated.tags : [],
      uploadedBy: updated.uploadedBy || 'system',
      uploaderName: session?.user?.firstName || 'System',
      createdAt: updated.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: updated.updatedAt?.toISOString() || new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to update media:', error);
    return NextResponse.json(
      { error: 'Failed to update media', details: error.message },
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

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const result = await storage.deleteMedia(params.id, force);

    if (!result.success && result.inUse) {
      return NextResponse.json(
        { 
          error: 'Media is currently in use and cannot be deleted',
          message: 'This media is currently in use and cannot be deleted. Use force=true to delete anyway.',
          inUse: true,
          usage: result.usage 
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete media:', error);
    return NextResponse.json(
      { error: 'Failed to delete media', details: error.message },
      { status: 500 }
    );
  }
});
