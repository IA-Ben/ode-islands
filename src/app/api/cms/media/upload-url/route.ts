import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSessionFromHeaders } from '../../../../../../server/auth';
import { validateCSRFToken } from '../../../../../../server/csrfProtection';
import { objectStorageClient } from '../../../../../../server/objectStorage';

const INPUT_BUCKET = process.env.GCS_INPUT_BUCKET || 'ode-islands-video-input';

/**
 * Get a signed URL for direct upload to Google Cloud Storage
 * This bypasses Vercel's 4.5MB body size limit
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getSessionFromHeaders(request);
    if (!session.isAuthenticated || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    // Validate CSRF token
    const csrfToken = request.headers.get('X-CSRF-Token');
    if (!csrfToken || !validateCSRFToken(csrfToken)) {
      return NextResponse.json(
        { error: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fileName, fileType, fileSize } = body;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'fileName and fileType are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size (2GB max)
    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: 2GB` },
        { status: 400 }
      );
    }

    // Generate unique video ID
    const videoId = randomUUID();
    const gcsFileName = `pending/${videoId}/${fileName}`;

    // Use the pre-configured storage client with credentials
    const bucket = objectStorageClient.bucket(INPUT_BUCKET);
    const file = bucket.file(gcsFileName);

    // Try to generate signed URL for PUT upload (simpler than POST policy)
    // This requires iam.serviceAccounts.signBlob permission
    try {
      const [putSignedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
        contentType: fileType,
      });

      return NextResponse.json({
        success: true,
        videoId,
        uploadUrl: putSignedUrl,
        uploadMethod: 'PUT',
        contentType: fileType,
        gcsPath: `gs://${INPUT_BUCKET}/${gcsFileName}`,
      });
    } catch (signedUrlError: any) {
      // If signed URL generation fails, fall back to uploading through our API
      console.error('Signed URL generation failed, will use direct upload:', signedUrlError.message);

      return NextResponse.json({
        success: true,
        videoId,
        uploadUrl: '/api/cms/media/upload',
        uploadMethod: 'API',
        gcsPath: `gs://${INPUT_BUCKET}/${gcsFileName}`,
      });
    }

  } catch (error: any) {
    console.error('Error in upload-url endpoint:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify({
      message: error.message,
      code: error.code,
      name: error.name,
    }));

    let errorMessage = 'Failed to generate upload URL';
    let errorDetails = error.message;

    if (error.message?.includes('credentials') || error.message?.includes('authentication')) {
      errorMessage = 'Google Cloud Storage authentication failed';
      errorDetails = 'Please ensure GCP credentials are properly configured.';
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
        debugInfo: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          code: error.code,
          stack: error.stack
        } : undefined,
      },
      { status: 500 }
    );
  }
}
