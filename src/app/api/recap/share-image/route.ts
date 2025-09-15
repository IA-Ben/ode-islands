import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../server/auth';

export async function POST(request: NextRequest) {
  return withAuth(async (session: any) => {
    try {
      const body = await request.json();
      const { eventTitle, venue, date, completedChapters, totalChapters, userInitials } = body;

      // For now, generate a simple text-based image using canvas-like approach
      // In production, this would use a proper image generation service
      const shareData = {
        eventTitle: eventTitle || 'The Ode Islands',
        venue: venue || 'Digital Experience',
        date: new Date(date).toLocaleDateString(),
        completedChapters: completedChapters || 0,
        totalChapters: totalChapters || 4,
        userInitials: userInitials || 'Anonymous',
        completionPercentage: Math.round((completedChapters / totalChapters) * 100)
      };

      // Create SVG-based shareable image (1080x1920 portrait format as per spec)
      const svgContent = `
        <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#334155;stop-opacity:1" />
            </linearGradient>
            <filter id="blur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10"/>
            </filter>
          </defs>
          
          <!-- Background -->
          <rect width="1080" height="1920" fill="url(#bg)"/>
          
          <!-- Header -->
          <text x="540" y="200" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="72" font-weight="bold">
            Journey Complete
          </text>
          
          <!-- Event Title -->
          <text x="540" y="320" text-anchor="middle" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="48" font-weight="600">
            ${shareData.eventTitle}
          </text>
          
          <!-- Venue and Date -->
          <text x="540" y="400" text-anchor="middle" fill="#cbd5e0" font-family="Arial, sans-serif" font-size="36">
            ${shareData.venue} • ${shareData.date}
          </text>
          
          <!-- Progress Circle -->
          <circle cx="540" cy="600" r="150" fill="none" stroke="#374151" stroke-width="20"/>
          <circle cx="540" cy="600" r="150" fill="none" stroke="#3b82f6" stroke-width="20" 
                  stroke-dasharray="${2 * Math.PI * 150}" 
                  stroke-dashoffset="${2 * Math.PI * 150 * (1 - shareData.completionPercentage / 100)}"
                  transform="rotate(-90 540 600)"/>
          
          <!-- Progress Text -->
          <text x="540" y="600" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="72" font-weight="bold">
            ${shareData.completionPercentage}%
          </text>
          <text x="540" y="650" text-anchor="middle" fill="#cbd5e0" font-family="Arial, sans-serif" font-size="32">
            Complete
          </text>
          
          <!-- Chapters -->
          <text x="540" y="850" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="600">
            ${shareData.completedChapters} of ${shareData.totalChapters} Chapters
          </text>
          
          <!-- User Initials -->
          <circle cx="540" cy="1200" r="80" fill="#3b82f6" opacity="0.8"/>
          <text x="540" y="1220" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">
            ${shareData.userInitials}
          </text>
          
          <!-- Footer -->
          <text x="540" y="1500" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif" font-size="32">
            My journey through The Ode Islands
          </text>
          
          <!-- Branding -->
          <text x="540" y="1700" text-anchor="middle" fill="#4b5563" font-family="Arial, sans-serif" font-size="28">
            theodeislands.com
          </text>
        </svg>
      `;

      // Convert SVG to PNG buffer (simplified for demo)
      // In production, use sharp, canvas, or similar for proper image generation
      const svgBuffer = Buffer.from(svgContent, 'utf-8');

      return new NextResponse(svgBuffer, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `attachment; filename="recap-${shareData.eventTitle.replace(/\s+/g, '-').toLowerCase()}.svg"`,
          'Cache-Control': 'private, max-age=3600'
        },
      });

    } catch (error) {
      console.error('Share image generation error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to generate shareable image' },
        { status: 500 }
      );
    }
  })(request);
}