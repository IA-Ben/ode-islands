import { NextRequest, NextResponse } from 'next/server';
import { generateSampleEventData } from '../../../../../../server/sampleDataGenerator';
import { validateCSRFToken, withAuth } from '../../../../../../server/auth';

async function handlePOST(request: NextRequest) {
  try {
    // Get session from withAuth middleware
    const session = (request as any).session;

    // Verify CSRF token
    const csrfToken = request.headers.get('X-CSRF-Token');
    if (!csrfToken) {
      return NextResponse.json(
        { message: 'CSRF token required' },
        { status: 400 }
      );
    }

    if (!session.sessionId) {
      return NextResponse.json(
        { message: 'Invalid session' },
        { status: 401 }
      );
    }

    const isValidCSRF = await validateCSRFToken(csrfToken, session.sessionId);
    if (!isValidCSRF) {
      return NextResponse.json(
        { message: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    console.log('Generating sample data for admin user:', session.userId);

    // Call the sample data generator
    const summary = await generateSampleEventData(session.userId!);

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

// Wrap with JWT auth middleware (admin only)
export const POST = withAuth(handlePOST, { requireAdmin: true });
