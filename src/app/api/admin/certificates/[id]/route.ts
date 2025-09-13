import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../server/db';
import { certificates } from '../../../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { withAuth } from '../../../../../../server/auth';

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: certificateId } = await params;

    if (!certificateId) {
      return NextResponse.json(
        { success: false, message: 'Certificate ID is required' },
        { status: 400 }
      );
    }

    // Check if certificate exists
    const existingCertificate = await db
      .select()
      .from(certificates)
      .where(eq(certificates.id, certificateId))
      .limit(1);

    if (existingCertificate.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Certificate not found' },
        { status: 404 }
      );
    }

    // Delete the certificate
    await db
      .delete(certificates)
      .where(eq(certificates.id, certificateId));

    return NextResponse.json({
      success: true,
      message: 'Certificate deleted successfully'
    });

  } catch (error) {
    console.error('Certificate deletion error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to delete certificate' },
      { status: 500 }
    );
  }
}

// Apply admin authentication middleware
export const DELETE = withAuth(handleDELETE, { requireAdmin: true });