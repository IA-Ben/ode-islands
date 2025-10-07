import { NextRequest, NextResponse } from 'next/server';
import { storage } from '../../../../../server/storage';
import { ObjectStorageService } from '../../../../../server/objectStorage';
import { randomUUID, createHash } from 'crypto';

export async function POST(request: NextRequest) {
  try {

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (100MB max for general media)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Determine file type category
    const fileType = file.type.startsWith('image/') ? 'image' :
                     file.type.startsWith('video/') ? 'video' :
                     file.type.startsWith('audio/') ? 'audio' :
                     'document';

    // Upload to Replit Object Storage
    const objectStorageService = new ObjectStorageService();
    const fileId = randomUUID();
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Use the object storage service to upload
    const { objectStorageClient } = await import('../../../../../server/objectStorage');
    const privateDir = objectStorageService.getPrivateObjectDir();
    const storageKey = `${privateDir}/media/${fileId}/${file.name}`;
    
    // Parse the path: /bucketName/objectPath -> bucketName is first segment
    const pathParts = storageKey.split("/").filter(Boolean);
    const bucketName = pathParts[0];
    const objectName = pathParts.slice(1).join("/");
    
    const bucket = objectStorageClient.bucket(bucketName);
    const blob = bucket.file(objectName);
    
    await blob.save(buffer, {
      metadata: { contentType: file.type }
    });
    
    const publicUrl = `/api/media${storageKey}`;
    const checksum = createHash('md5').update(buffer).digest('hex');

    // Save to media assets table
    const mediaAsset = await storage.createMediaAsset({
      storageKey: storageKey,
      cloudUrl: publicUrl,
      checksum: checksum,
      fileType: fileType,
      mimeType: file.type,
      fileSize: file.size,
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
    });

    return NextResponse.json({
      success: true,
      media: {
        id: mediaAsset.id,
        title: mediaAsset.title,
        fileName: file.name,
        fileType: mediaAsset.fileType,
        fileSize: mediaAsset.fileSize,
        url: mediaAsset.cloudUrl,
        thumbnailUrl: mediaAsset.cloudUrl,
        uploadedBy: null,
        createdAt: mediaAsset.createdAt,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload media', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {

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
      uploaderName: 'System',
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
}
