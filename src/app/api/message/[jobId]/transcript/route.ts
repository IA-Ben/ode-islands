import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../../../server/auth';

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
          { success: false, message: 'Transcript not ready yet' },
          { status: 202 }
        );
      }

      // Generate transcript based on user's journey
      const transcript = {
        jobId: jobId,
        createdAt: job.completedAt,
        duration: "00:02:30",
        language: "en",
        content: [
          {
            timestamp: "00:00:00",
            speaker: "Narrator",
            text: "Welcome to your personalized journey recap from The Ode Islands."
          },
          {
            timestamp: "00:00:05",
            speaker: "Narrator", 
            text: `You successfully completed ${job.customization?.chapters || 4} chapters of this immersive experience.`
          },
          {
            timestamp: "00:00:12",
            speaker: "Narrator",
            text: "Your adventure began with the prologue, where you first discovered the mysterious islands."
          },
          {
            timestamp: "00:00:20",
            speaker: "Narrator",
            text: "Through each chapter, you collected memories, made choices, and shaped your unique story."
          },
          {
            timestamp: "00:00:30",
            speaker: "Narrator",
            text: "Your journey represents not just completion, but transformation and growth."
          },
          {
            timestamp: "00:00:40",
            speaker: "Narrator",
            text: "The memories you've gathered will stay with you, becoming part of your own story."
          },
          {
            timestamp: "00:00:50",
            speaker: "Narrator",
            text: "Thank you for being part of The Ode Islands community."
          },
          {
            timestamp: "00:01:00",
            speaker: "Narrator",
            text: "Your experience continues beyond completion - in the connections you make and the meaning you carry forward."
          }
        ],
        metadata: {
          eventTitle: "The Ode Islands",
          completionDate: job.completedAt,
          userId: session.user.id
        }
      };

      return NextResponse.json(transcript, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=2592000' // 30 days
        },
      });

    } catch (error) {
      console.error('Transcript serving error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to serve transcript' },
        { status: 500 }
      );
    }
  })(request);
}