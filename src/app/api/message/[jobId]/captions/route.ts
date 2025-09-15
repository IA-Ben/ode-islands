import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../../server/auth';

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  return withAuth(async (session: any) => {
    try {
      const { jobId } = params;
      
      (global as any).messageJobs = (global as any).messageJobs || new Map();
      const job = (global as any).messageJobs.get(jobId);

      if (!job || job.userId !== session.user.id) {
        return NextResponse.json(
          { success: false, message: 'Job not found or unauthorized' },
          { status: 404 }
        );
      }

      if (job.status !== 'completed') {
        return NextResponse.json(
          { success: false, message: 'Captions not ready yet' },
          { status: 202 }
        );
      }

      // Mock captions in VTT format
      const vttContent = `WEBVTT

00:00:00.000 --> 00:00:03.000
Welcome to your personalized journey recap.

00:00:03.000 --> 00:00:07.000
You completed ${job.customization?.chapters || 4} chapters of The Ode Islands experience.

00:00:07.000 --> 00:00:11.000
Your unique path through this adventure has been remarkable.

00:00:11.000 --> 00:00:15.000
Thank you for being part of this transformative experience.`;

      return new NextResponse(vttContent, {
        headers: {
          'Content-Type': 'text/vtt',
          'Content-Disposition': `attachment; filename="captions-${jobId}.vtt"`,
          'Cache-Control': 'private, max-age=2592000' // 30 days
        },
      });

    } catch (error) {
      console.error('Captions serving error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to serve captions' },
        { status: 500 }
      );
    }
  })(request);
}