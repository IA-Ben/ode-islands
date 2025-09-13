import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { certificates, users } from '../../../../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { withAuth } from '../../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    // Fetch all certificates with user information for admin view
    const allCertificates = await db
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
        // Include user info for admin display
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email
      })
      .from(certificates)
      .leftJoin(users, eq(certificates.userId, users.id))
      .orderBy(desc(certificates.issuedAt));

    // Format certificates with recipient names
    const formattedCertificates = allCertificates.map(cert => ({
      ...cert,
      recipientName: cert.userFirstName && cert.userLastName
        ? `${cert.userFirstName} ${cert.userLastName}`
        : cert.userEmail || 'Unknown User'
    }));

    return NextResponse.json({
      success: true,
      certificates: formattedCertificates
    });

  } catch (error) {
    console.error('Admin certificates fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}

// Apply admin authentication middleware
export const GET = withAuth(handleGET, { requireAdmin: true });