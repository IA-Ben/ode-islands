import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: process.env.GCS_CREDENTIALS ? JSON.parse(process.env.GCS_CREDENTIALS) : undefined,
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || '');

interface VideoStatus {
  videoId: string;
  status: 'completed' | 'ready' | 'processing' | 'error';
  has_portrait?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { videoIds } = await req.json();

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json(
        { error: 'videoIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    if (videoIds.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 videos per batch request' },
        { status: 400 }
      );
    }

    // Check all video statuses in parallel
    const statusPromises = videoIds.map(async (videoId: string): Promise<VideoStatus> => {
      try {
        const landscapeFile = bucket.file(`hls/${videoId}/master.m3u8`);
        const portraitFile = bucket.file(`hls/${videoId}/portrait/master.m3u8`);

        const [landscapeExists, portraitExists] = await Promise.all([
          landscapeFile.exists().then(([exists]) => exists),
          portraitFile.exists().then(([exists]) => exists),
        ]);

        if (landscapeExists) {
          return {
            videoId,
            status: 'completed',
            has_portrait: portraitExists,
          };
        } else {
          // Check if video is processing
          const processingFile = bucket.file(`processing/${videoId}.lock`);
          const [processing] = await processingFile.exists();

          return {
            videoId,
            status: processing ? 'processing' : 'error',
            has_portrait: false,
          };
        }
      } catch (error) {
        console.error(`Error checking status for ${videoId}:`, error);
        return {
          videoId,
          status: 'error',
          has_portrait: false,
        };
      }
    });

    const results = await Promise.all(statusPromises);

    // Return results as a map for easy lookup
    const statusMap: Record<string, VideoStatus> = {};
    results.forEach((result) => {
      statusMap[result.videoId] = result;
    });

    return NextResponse.json({
      success: true,
      statuses: statusMap,
    });
  } catch (error) {
    console.error('Batch video status error:', error);
    return NextResponse.json(
      { error: 'Failed to check video statuses' },
      { status: 500 }
    );
  }
}
