import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { liveChatMessages } from '../../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { withAdminAuthAndCSRF } from '../../../../../server/auth';

async function handlePATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const messageId = params.id;
    const body = (request as any).parsedBody || await request.json();
    const { isModerated } = body;

    // Validate input
    if (typeof isModerated !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'isModerated field must be a boolean value' },
        { status: 400 }
      );
    }

    if (!messageId) {
      return NextResponse.json(
        { success: false, message: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Check if message exists
    const existingMessage = await db
      .select({ id: liveChatMessages.id })
      .from(liveChatMessages)
      .where(eq(liveChatMessages.id, messageId))
      .limit(1);

    if (existingMessage.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Message not found' },
        { status: 404 }
      );
    }

    // Update moderation status
    const updatedMessage = await db
      .update(liveChatMessages)
      .set({ 
        isModerated,
        // Note: We could add moderatedBy and moderatedAt fields in future schema updates
      })
      .where(eq(liveChatMessages.id, messageId))
      .returning();

    if (updatedMessage.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Failed to update message moderation status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Message ${isModerated ? 'moderated' : 'unmoderated'} successfully`,
      chatMessage: updatedMessage[0],
    });

  } catch (error) {
    console.error('Chat moderation error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to moderate message' },
      { status: 500 }
    );
  }
}

// Apply admin authentication and CSRF protection
export const PATCH = withAdminAuthAndCSRF(handlePATCH);