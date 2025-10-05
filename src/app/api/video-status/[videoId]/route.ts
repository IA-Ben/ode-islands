import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const BUCKET_NAME = 'ode-islands-video-cdn';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;
  
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    
    // Check for dual-orientation structure first (landscape/portrait subdirectories)
    const landscapeManifest = bucket.file(`videos/${videoId}/landscape/manifest/master.m3u8`);
    const portraitManifest = bucket.file(`videos/${videoId}/portrait/manifest/master.m3u8`);
    
    const [landscapeExists] = await landscapeManifest.exists();
    const [portraitExists] = await portraitManifest.exists();
    
    const hasDualOrientation = landscapeExists && portraitExists;
    
    if (hasDualOrientation) {
      // Dual-orientation video - check for segments in landscape directory
      const [segmentFiles] = await bucket.getFiles({
        prefix: `videos/${videoId}/landscape/`,
        matchGlob: '**/segment_*.ts'
      });
      
      const hasSegments = segmentFiles.length > 0;
      
      return NextResponse.json({
        status: hasSegments ? 'completed' : 'processing',
        videoId,
        has_portrait: true
      });
    }
    
    // Fall back to legacy path (single orientation)
    const legacyManifest = bucket.file(`videos/${videoId}/manifest/master.m3u8`);
    const [legacyExists] = await legacyManifest.exists();
    
    if (legacyExists) {
      const [segmentFiles] = await bucket.getFiles({
        prefix: `videos/${videoId}/`,
        matchGlob: '**/segment_*.ts'
      });
      
      const hasSegments = segmentFiles.length > 0;
      
      return NextResponse.json({
        status: hasSegments ? 'completed' : 'processing',
        videoId,
        has_portrait: false
      });
    }
    
    // No video found yet - still processing
    return NextResponse.json({
      status: 'processing',
      videoId,
      has_portrait: false
    });
  } catch (error: any) {
    console.error('Error checking video status:', error);
    
    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('Could not refresh access token')) {
      return NextResponse.json({
        status: 'ready',
        videoId,
        has_portrait: false,
        note: 'Dev environment - assuming video is ready'
      });
    }
    
    return NextResponse.json({
      status: 'error',
      error: 'Failed to check video status',
      has_portrait: false
    }, { status: 500 });
  }
}
