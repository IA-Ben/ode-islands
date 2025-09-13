import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { liveChatMessages } from '../../../../shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { withAuth, withUserAuth, withUserAuthAndCSRF } from '../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const since = searchParams.get('since'); // ISO timestamp for real-time updates

    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Build query conditions
    const conditions = [eq(liveChatMessages.eventId, eventId)];
    if (since) {
      conditions.push(gte(liveChatMessages.sentAt, new Date(since)));
    }

    // Get chat messages
    const messages = await db
      .select()
      .from(liveChatMessages)
      .where(and(...conditions))
      .orderBy(desc(liveChatMessages.sentAt))
      .limit(limit);

    // Reverse to show chronological order (oldest first)
    const chronologicalMessages = messages.reverse();

    return NextResponse.json({
      success: true,
      messages: chronologicalMessages,
    });

  } catch (error) {
    console.error('Chat fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = (request as any).parsedBody || await request.json();
    const { eventId, message, messageType } = body;

    // Get authenticated user ID from session (prevents spoofing)
    const session = (request as any).session;
    const userId = session.userId;

    // Validate required fields
    if (!eventId || !message) {
      return NextResponse.json(
        { success: false, message: 'Event ID and message are required' },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length > 500) {
      return NextResponse.json(
        { success: false, message: 'Message must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Create new chat message
    const newMessage = await db
      .insert(liveChatMessages)
      .values({
        eventId,
        userId,
        message,
        messageType: messageType || 'text',
        isModerated: false,
        sentAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      chatMessage: newMessage[0],
    });

  } catch (error) {
    console.error('Chat message error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to send message' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const GET = withAuth(handleGET);
export const POST = withUserAuthAndCSRF(handlePOST); // Users can only send messages as themselves + CSRF protection