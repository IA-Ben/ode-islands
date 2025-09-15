import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../../../server/auth';

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  return withAuth(async (session: any) => {
    try {
      const { jobId } = params;
      
      global.messageJobs = global.messageJobs || new Map();
      const job = global.messageJobs.get(jobId);

      if (!job || job.userId !== session.user.id) {
        return NextResponse.json(
          { success: false, message: 'Job not found or unauthorized' },
          { status: 404 }
        );
      }

      if (job.status !== 'completed') {
        return NextResponse.json(
          { success: false, message: 'Video not ready yet' },
          { status: 202 }
        );
      }

      // In production, this would serve the actual video file from cloud storage
      // For demo purposes, return a mock video URL or redirect to a sample video
      const videoContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Personalized Journey Message</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #1e293b; color: white; }
            .container { max-width: 800px; margin: 0 auto; text-align: center; }
            .video-placeholder { 
              width: 100%; 
              height: 400px; 
              background: linear-gradient(45deg, #3b82f6, #1e40af); 
              border-radius: 12px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 24px; 
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Your Personalized Journey Message</h1>
            <div class="video-placeholder">
              🎬 Your Custom Video Message<br/>
              <small style="font-size: 16px; opacity: 0.8;">Generated from your unique journey</small>
            </div>
            <p>This personalized message was crafted based on your chapters completed, memories collected, and choices made during your journey through The Ode Islands.</p>
            <p><small>Job ID: ${jobId}</small></p>
          </div>
        </body>
        </html>
      `;

      return new NextResponse(videoContent, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'private, max-age=2592000' // 30 days
        },
      });

    } catch (error) {
      console.error('Video serving error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to serve video' },
        { status: 500 }
      );
    }
  })(request);
}