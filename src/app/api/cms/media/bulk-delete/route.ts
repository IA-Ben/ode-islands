import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../../server/auth';
import { storage } from '../../../../../../server/storage';

export const POST = withAuth(async (request: NextRequest, session: any) => {
  try {
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ids, force = false } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. ids array is required' },
        { status: 400 }
      );
    }

    const result = await storage.bulkDeleteMedia(ids, force);

    if (result.failed.length > 0) {
      const inUseItems = result.failed.filter((f: any) => f.reason?.includes('in use'));
      
      if (inUseItems.length > 0) {
        return NextResponse.json(
          { 
            error: 'Some items are in use and cannot be deleted',
            message: `${inUseItems.length} items are in use. Use force=true to delete anyway.`,
            deleted: result.deleted,
            failed: result.failed 
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      failed: result.failed,
    });
  } catch (error: any) {
    console.error('Failed to bulk delete media:', error);
    return NextResponse.json(
      { error: 'Failed to bulk delete media', details: error.message },
      { status: 500 }
    );
  }
});
