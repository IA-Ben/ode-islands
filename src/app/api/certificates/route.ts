import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { certificates, users } from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth, withUserAuth, withAuthAndCSRF } from '../../../../server/auth';
import crypto from 'crypto';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const certificateType = searchParams.get('certificateType');

    // Get authenticated user ID from session (prevents IDOR vulnerability)
    const session = (request as any).session;
    const userId = session.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Build query conditions
    const conditions = [eq(certificates.userId, userId)];
    if (eventId) conditions.push(eq(certificates.eventId, eventId));
    if (certificateType) conditions.push(eq(certificates.certificateType, certificateType));

    // Get user certificates
    const userCertificates = await db
      .select()
      .from(certificates)
      .where(and(...conditions))
      .orderBy(certificates.issuedAt);

    return NextResponse.json({
      success: true,
      certificates: userCertificates,
    });

  } catch (error) {
    console.error('Certificates fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = (request as any).parsedBody || await request.json();
    const { userId, eventId, chapterId, certificateType, title, description } = body;

    // Validate required fields
    if (!userId || !certificateType || !title) {
      return NextResponse.json(
        { success: false, message: 'User ID, certificate type, and title are required' },
        { status: 400 }
      );
    }

    // Check if certificate already exists for this combination
    const existingCertificate = await db
      .select()
      .from(certificates)
      .where(
and(
          eq(certificates.userId, userId),
          eq(certificates.certificateType, certificateType),
          ...(eventId ? [eq(certificates.eventId, eventId)] : []),
          ...(chapterId ? [eq(certificates.chapterId, chapterId)] : [])
        )
      )
      .limit(1);

    if (existingCertificate.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Certificate already exists for this user and type' },
        { status: 400 }
      );
    }

    // Generate certificate URL (this would integrate with a certificate generation service)
    const certificateId = crypto.randomUUID();
    const certificateUrl = `/certificates/${certificateId}.pdf`;

    // Create new certificate
    const newCertificate = await db
      .insert(certificates)
      .values({
        userId,
        eventId,
        chapterId,
        certificateType,
        title,
        description,
        certificateUrl,
        issuedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Certificate issued successfully',
      certificate: newCertificate[0],
    });

  } catch (error) {
    console.error('Certificate creation error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to issue certificate' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const GET = withUserAuth(handleGET); // Users can only access their own certificates
export const POST = withAuthAndCSRF(handlePOST, { requireAdmin: true }); // Only admins can issue certificates + CSRF protection