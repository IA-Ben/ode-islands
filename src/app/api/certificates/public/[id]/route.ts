import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../server/db';
import { certificates, users } from '../../../../../../shared/schema';
import { eq } from 'drizzle-orm';

// Public certificate viewing endpoint - no authentication required for sharing
export async function GET(
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

    // Fetch certificate with user information for display
    const certificateResult = await db
      .select({
        id: certificates.id,
        userId: certificates.userId,
        eventId: certificates.eventId,
        chapterId: certificates.chapterId,
        certificateType: certificates.certificateType,
        title: certificates.title,
        description: certificates.description,
        certificateUrl: certificates.certificateUrl,
        issuedAt: certificates.issuedAt,
        // Include basic user info for display
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email
      })
      .from(certificates)
      .leftJoin(users, eq(certificates.userId, users.id))
      .where(eq(certificates.id, certificateId))
      .limit(1);

    if (certificateResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Certificate not found' },
        { status: 404 }
      );
    }

    const certificate = certificateResult[0];

    // Format the response with recipient name for display
    const recipientName = certificate.userFirstName && certificate.userLastName
      ? `${certificate.userFirstName} ${certificate.userLastName}`
      : certificate.userEmail || 'Ode Islands Explorer';

    const response = {
      id: certificate.id,
      userId: certificate.userId,
      eventId: certificate.eventId,
      chapterId: certificate.chapterId,
      certificateType: certificate.certificateType,
      title: certificate.title,
      description: certificate.description,
      certificateUrl: certificate.certificateUrl,
      issuedAt: certificate.issuedAt,
      recipientName
    };

    return NextResponse.json({
      success: true,
      certificate: response
    });

  } catch (error) {
    console.error('Public certificate fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch certificate' },
      { status: 500 }
    );
  }
}