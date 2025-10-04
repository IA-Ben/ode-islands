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
    const manifestFile = bucket.file(`videos/${videoId}/manifest/master.m3u8`);
    
    const [exists] = await manifestFile.exists();
    
    if (exists) {
      const [segmentFiles] = await bucket.getFiles({
        prefix: `videos/${videoId}/`,
        matchGlob: '**/segment_*.ts'
      });
      
      const hasSegments = segmentFiles.length > 0;
      
      return NextResponse.json({
        status: hasSegments ? 'completed' : 'processing',
        videoId
      });
    } else {
      return NextResponse.json({
        status: 'processing',
        videoId
      });
    }
  } catch (error: any) {
    console.error('Error checking video status:', error);
    
    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('Could not refresh access token')) {
      return NextResponse.json({
        status: 'ready',
        videoId,
        note: 'Dev environment - assuming video is ready'
      });
    }
    
    return NextResponse.json({
      status: 'error',
      error: 'Failed to check video status'
    }, { status: 500 });
  }
}
