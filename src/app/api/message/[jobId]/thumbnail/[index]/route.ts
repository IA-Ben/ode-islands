import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../../../server/auth';

export async function GET(request: NextRequest, { params }: { params: { jobId: string; index: string } }) {
  return withAuth(async (req: NextRequest, context: { params?: any }) => {
    const session = (req as any).session;
    try {
      const { jobId, index } = params;
      
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
          { success: false, message: 'Thumbnails not ready yet' },
          { status: 202 }
        );
      }

      const thumbnailIndex = parseInt(index);
      if (thumbnailIndex < 1 || thumbnailIndex > 3) {
        return NextResponse.json(
          { success: false, message: 'Invalid thumbnail index' },
          { status: 400 }
        );
      }

      // Generate thumbnail SVG based on index
      const thumbnailTitles = [
        'Journey Beginning',
        'Memories Collected', 
        'Achievement Unlocked'
      ];

      const thumbnailColors = [
        '#3b82f6', // blue
        '#10b981', // emerald  
        '#f59e0b'  // amber
      ];

      function escapeXml(unsafe: string): string {
        return unsafe.replace(/[<>&'"]/g, function (c) {
          switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
            default: return c;
          }
        });
      }

      const svgContent = `
        <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${thumbnailColors[thumbnailIndex - 1]};stop-opacity:0.8" />
              <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
            </linearGradient>
          </defs>
          
          <rect width="320" height="180" fill="url(#bg)"/>
          
          <text x="160" y="90" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">
            ${escapeXml(thumbnailTitles[thumbnailIndex - 1])}
          </text>
          
          <text x="160" y="120" text-anchor="middle" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="12">
            Frame ${thumbnailIndex} of 3
          </text>
          
          <circle cx="160" cy="140" r="8" fill="white" opacity="0.6"/>
        </svg>
      `;

      const svgBuffer = Buffer.from(svgContent, 'utf-8');

      return new NextResponse(svgBuffer, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'private, max-age=2592000', // 30 days
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'"
        },
      });

    } catch (error) {
      console.error('Thumbnail serving error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to serve thumbnail' },
        { status: 500 }
      );
    }
  })(request, { params });
}