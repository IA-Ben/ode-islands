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
    
    const filters = {
      type: searchParams.get('type') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      uploadedBy: searchParams.get('uploadedBy') || undefined,
      createdFrom: searchParams.get('createdFrom') ? new Date(searchParams.get('createdFrom')!) : undefined,
      createdTo: searchParams.get('createdTo') ? new Date(searchParams.get('createdTo')!) : undefined,
      search: searchParams.get('search') || undefined,
    };

    const pagination = {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
    };

    const result = await storage.listMedia(filters, pagination);

    const items = result.items.map((item: any) => ({
      id: item.id,
      title: item.title || item.storageKey,
      fileName: item.storageKey.split('/').pop() || item.storageKey,
      fileType: item.fileType,
      fileSize: item.fileSize,
      url: item.cloudUrl,
      thumbnailUrl: item.cloudUrl,
      altText: item.altText || '',
      description: item.description || '',
      tags: Array.isArray(item.tags) ? item.tags : [],
      uploadedBy: item.uploadedBy || 'system',
      uploaderName: session?.user?.firstName || 'System',
      createdAt: item.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: item.updatedAt?.toISOString() || new Date().toISOString(),
    }));

    return NextResponse.json({
      items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        totalPages: Math.ceil(result.totalCount / result.pageSize),
        totalItems: result.totalCount,
      },
    });
  } catch (error: any) {
    console.error('Failed to list media:', error);
    return NextResponse.json(
      { error: 'Failed to list media', details: error.message },
      { status: 500 }
    );
  }
});
