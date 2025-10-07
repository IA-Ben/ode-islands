import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';

const INPUT_BUCKET = process.env.GCS_INPUT_BUCKET || 'ode-islands-video-input';
const OUTPUT_BUCKET = process.env.GCS_OUTPUT_BUCKET || 'ode-islands-video-cdn';
const CLOUD_RUN_TRANSCODER_URL = process.env.CLOUD_RUN_TRANSCODER_URL || '';
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

// Initialize storage lazily to avoid build-time errors
function getStorage() {
  return new Storage();
}

export async function POST(request: NextRequest) {
  try {
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const videoId = formData.get('videoId') as string || randomUUID();
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024 * 1024)}GB` },
        { status: 400 }
      );
    }
    
    // Upload to GCS input bucket
    const storage = getStorage();
    const bucket = storage.bucket(INPUT_BUCKET);
    const fileName = `pending/${videoId}/${file.name}`;
    const blob = bucket.file(fileName);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await blob.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          videoId: videoId
        }
      }
    });
    
    console.log(`Uploaded file to gs://${INPUT_BUCKET}/${fileName}`);
    
    // Initialize status in output bucket
    const statusBucket = storage.bucket(OUTPUT_BUCKET);
    const statusBlob = statusBucket.file(`videos/${videoId}/status.json`);
    
    await statusBlob.save(JSON.stringify({
      status: 'uploaded',
      videoId: videoId,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      percentage: 0
    }), {
      contentType: 'application/json'
    });
    
    // Trigger Cloud Run transcoder (if configured)
    if (CLOUD_RUN_TRANSCODER_URL) {
      try {
        const transcoderResponse = await fetch(`${CLOUD_RUN_TRANSCODER_URL}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input_uri: `gs://${INPUT_BUCKET}/${fileName}`,
            video_id: videoId
          })
        });
        
        if (!transcoderResponse.ok) {
          const errorText = await transcoderResponse.text();
          console.error('Transcoder trigger failed:', errorText);
          
          // Update status to reflect transcoder failure
          await statusBlob.save(JSON.stringify({
            status: 'error',
            videoId: videoId,
            fileName: file.name,
            error: 'Failed to start transcoding',
            uploadedAt: new Date().toISOString()
          }), {
            contentType: 'application/json'
          });
          
          return NextResponse.json({
            error: 'Upload successful but transcoding failed to start',
            details: errorText,
            videoId: videoId
          }, { status: 500 });
        } else {
          console.log('Transcoding initiated for:', videoId);
          
          // Update status to processing
          await statusBlob.save(JSON.stringify({
            status: 'processing',
            videoId: videoId,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            percentage: 0
          }), {
            contentType: 'application/json'
          });
        }
      } catch (error: any) {
        console.error('Failed to trigger transcoder:', error);
        
        // Update status to reflect error
        await statusBlob.save(JSON.stringify({
          status: 'error',
          videoId: videoId,
          fileName: file.name,
          error: error.message || 'Transcoder connection failed',
          uploadedAt: new Date().toISOString()
        }), {
          contentType: 'application/json'
        });
        
        return NextResponse.json({
          error: 'Upload successful but transcoding failed to start',
          details: error.message,
          videoId: videoId
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: true,
      videoId: videoId,
      fileName: file.name,
      size: file.size,
      inputUri: `gs://${INPUT_BUCKET}/${fileName}`,
      outputUri: `gs://${OUTPUT_BUCKET}/videos/${videoId}/`,
      status: CLOUD_RUN_TRANSCODER_URL ? 'processing' : 'uploaded',
      message: CLOUD_RUN_TRANSCODER_URL 
        ? 'Video uploaded and transcoding started' 
        : 'Video uploaded. Manual transcoding required.'
    });
    
  } catch (error: any) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload media', details: error.message },
      { status: 500 }
    );
  }
}

// Get upload status
export async function GET(request: NextRequest) {
  try {
    
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId required' },
        { status: 400 }
      );
    }
    
    const storage = getStorage();
    const bucket = storage.bucket(OUTPUT_BUCKET);
    const statusBlob = bucket.file(`videos/${videoId}/status.json`);
    
    const [exists] = await statusBlob.exists();
    
    if (!exists) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
    
    const [content] = await statusBlob.download();
    const status = JSON.parse(content.toString());
    
    return NextResponse.json(status);
    
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status', details: error.message },
      { status: 500 }
    );
  }
}
