import { NextRequest, NextResponse } from 'next/server';
import { generateSampleEventData } from '../../../../../../server/sampleDataGenerator';
import { validateCSRFToken } from '../../../../../../server/auth';
import { validateExpressSession } from '../../../../../../server/sessionValidator';

export async function POST(request: NextRequest) {
  try {
    // Parse cookies from request
    const cookies: { [key: string]: string } = {};
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name && rest.length > 0) {
          cookies[name] = rest.join('=');
        }
      });
    }

    // Validate session directly using sessionValidator
    const session = await validateExpressSession(cookies);
    
    if (!session.isAuthenticated || !session.userId) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!session.isAdmin) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Verify CSRF token properly using the actual session ID
    const csrfToken = request.headers.get('X-CSRF-Token');
    if (!csrfToken) {
      return NextResponse.json(
        { message: 'CSRF token required' },
        { status: 400 }
      );
    }

    // Use the actual session ID for CSRF validation
    if (!session.sessionId || !validateCSRFToken(csrfToken, session.sessionId)) {
      return NextResponse.json(
        { message: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    console.log('Generating sample data for admin user:', session.userId);

    // Call the sample data generator
    const summary = await generateSampleEventData(session.userId);

    return NextResponse.json({
      success: true,
      message: 'Sample data generated successfully',
      summary
    });

  } catch (error) {
    console.error('Error generating sample data:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { message: 'Sample data already exists. Please remove existing sample data first.' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Failed to generate sample data' },
      { status: 500 }
    );
  }
}