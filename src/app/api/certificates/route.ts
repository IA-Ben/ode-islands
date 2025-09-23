import { NextRequest } from 'next/server';
import { db } from '../../../../server/db';
import { certificates, users } from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth, withUserAuth, withAuthAndCSRF } from '../../../../server/auth';
import { respondOk, respondError, respondUnauthorized, respondBadRequest, respondCreated, respondConflict, respondOkCompat } from '../../../lib/apiHelpers';
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
      return respondUnauthorized('User session not found');
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

    return respondOkCompat(userCertificates, {
      legacyKey: 'certificates',
      message: `Retrieved ${userCertificates.length} certificate${userCertificates.length !== 1 ? 's' : ''}`
    });

  } catch (error) {
    return respondError(error instanceof Error ? error : 'Failed to fetch certificates');
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = (request as any).parsedBody || await request.json();
    const { userId, eventId, chapterId, certificateType, title, description } = body;

    // Validate required fields
    if (!userId || !certificateType || !title) {
      return respondBadRequest('Missing required fields', {
        message: 'User ID, certificate type, and title are required'
      });
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
      return respondConflict(
        'Duplicate certificate',
        'Certificate already exists for this user and type'
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

    // Send notification about new certificate (non-blocking)
    try {
      const { NotificationService } = await import('../../../lib/notificationService');
      await NotificationService.notifyCertificateAwarded(
        userId,
        title,
        newCertificate[0].id
      );
    } catch (notificationError) {
      console.warn('Failed to send certificate notification:', notificationError);
      // Continue even if notification fails
    }

    // Use helper for consistent response format with backward compatibility
    return respondOkCompat(newCertificate[0], {
      legacyKey: 'certificate',
      message: 'Certificate issued successfully',
      status: 201
    });

  } catch (error) {
    return respondError(error instanceof Error ? error : 'Failed to issue certificate');
  }
}

// Apply authentication middleware
export const GET = withUserAuth(handleGET); // Users can only access their own certificates
export const POST = withAuthAndCSRF(handlePOST, { requireAdmin: true }); // Only admins can issue certificates + CSRF protection