import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../../server/auth';

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  return withAuth(async (session: any) => {
    try {
      const { jobId } = params;
      
      (global as any).messageJobs = (global as any).messageJobs || new Map();
      const job = (global as any).messageJobs.get(jobId);

      if (!job) {
        return NextResponse.json(
          { success: false, message: 'Job not found' },
          { status: 404 }
        );
      }

      // Verify user owns this job
      if (job.userId !== session.user.id) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Check if job has expired
      if (job.expiresAt && new Date() > new Date(job.expiresAt)) {
        job.status = 'expired';
        (global as any).messageJobs.set(jobId, job);
      }

      return NextResponse.json({
        success: true,
        job: {
          id: job.id,
          status: job.status,
          progress: job.progress,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          estimatedCompletionTime: job.estimatedCompletionTime,
          expiresAt: job.expiresAt,
          artifacts: job.artifacts
        }
      });

    } catch (error) {
      console.error('Message status error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to get message status' },
        { status: 500 }
      );
    }
  })(request);
}