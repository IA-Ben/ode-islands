import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../../server/auth';
import { requirePermission } from '../../../../../../server/rbac';

async function handleGET(request: NextRequest) {
  try {
    const settings = {
      imageMediaId: null,
      videoMediaId: null,
      title: 'Ode Islands',
      subtitle: 'Prepare for your journey',
      showAnimation: true,
    };

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Error fetching hero settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const settings = await request.json();

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Error saving hero settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(requirePermission('content:read')(handleGET));

export const POST = withAuth(requirePermission('content:write')(handlePOST));
