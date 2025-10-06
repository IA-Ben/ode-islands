import { NextRequest, NextResponse } from 'next/server';
import { removeSampleEventData } from '../../../../../../server/sampleDataGenerator';
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

    console.log('Removing sample data for admin user:', session.userId);

    // Call the sample data remover
    const result = await removeSampleEventData();

    // Check if any data was actually removed
    if (result.removedItems === 0) {
      return NextResponse.json(
        { message: 'No sample data found to remove' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sample data removed successfully',
      result
    });

  } catch (error) {
    console.error('Error removing sample data:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('No sample data')) {
        return NextResponse.json(
          { message: 'No sample data found to remove' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { message: 'Failed to remove sample data' },
      { status: 500 }
    );
  }
}

// Wrap with JWT auth middleware (admin only)
export const POST = withAuth(handlePOST, { requireAdmin: true });
