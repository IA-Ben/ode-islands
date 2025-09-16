import { NextRequest, NextResponse } from 'next/server';
import { ObjectStorageService } from '../../../../../server/objectStorage';
import { withUserAuthAndCSRF } from '../../../../../server/auth';

// Supported file types for memories
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_VIDEO_TYPES = [
  'video/mp4', 
  'video/mov', 'video/quicktime',  // Both common and standard MIME types for .mov files
  'video/avi', 'video/x-msvideo',  // Both common and standard MIME types for .avi files
  'video/webm'
];
const SUPPORTED_AUDIO_TYPES = [
  'audio/mp3', 'audio/mpeg',       // Both common and standard MIME types for .mp3 files
  'audio/wav', 
  'audio/ogg', 
  'audio/m4a', 'audio/mp4', 'audio/x-m4a'  // Various MIME types for .m4a files
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB for audio

async function handlePOST(request: NextRequest) {
  try {
    const session = (request as any).session;
    
    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fileName, fileType, fileSize } = body;

    // Validate required fields
    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { success: false, message: 'fileName, fileType, and fileSize are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allSupportedTypes = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES, ...SUPPORTED_AUDIO_TYPES];
    if (!allSupportedTypes.includes(fileType)) {
      return NextResponse.json(
        { success: false, message: 'Unsupported file type. Supported types: images, videos, and audio files' },
        { status: 400 }
      );
    }

    // Validate file size based on type
    let maxSize = MAX_FILE_SIZE;
    let mediaType = 'file';
    
    if (SUPPORTED_IMAGE_TYPES.includes(fileType)) {
      maxSize = MAX_IMAGE_SIZE;
      mediaType = 'image';
    } else if (SUPPORTED_VIDEO_TYPES.includes(fileType)) {
      maxSize = MAX_FILE_SIZE;
      mediaType = 'video';
    } else if (SUPPORTED_AUDIO_TYPES.includes(fileType)) {
      maxSize = MAX_AUDIO_SIZE;
      mediaType = 'audio';
    }

    if (fileSize > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json(
        { success: false, message: `File size exceeds ${maxSizeMB}MB limit for ${mediaType} files` },
        { status: 400 }
      );
    }

    // Generate upload URL using object storage service with content constraints
    const objectStorageService = new ObjectStorageService();
    const uploadUrl = await objectStorageService.getObjectEntityUploadURL({
      contentType: fileType,
      maxSize: maxSize,
      fileName: fileName
    });
    
    // Extract object ID from the upload URL for later reference
    const objectId = uploadUrl.split('/').pop()?.split('?')[0];

    return NextResponse.json({
      success: true,
      uploadUrl,
      objectId,
      mediaType,
      message: 'Upload URL generated successfully'
    });

  } catch (error) {
    console.error('Upload URL generation error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}

// Apply authentication and CSRF protection
export const POST = withUserAuthAndCSRF(handlePOST);