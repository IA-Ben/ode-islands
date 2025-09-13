import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { liveChatMessages, users } from '../../../../shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { withAuth, withUserAuth, withUserAuthAndCSRF } from '../../../../server/auth';

// Helper function to create safe display names
function getDisplayName(user: { firstName?: string | null; lastName?: string | null; email?: string; }): string {
  const firstName = user.firstName?.trim();
  const lastName = user.lastName?.trim();
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  } else if (firstName) {
    return firstName;
  } else if (lastName) {
    return lastName;
  } else if (user.email) {
    // Use the part before @ as fallback, but only if no other name available
    const emailPrefix = user.email.split('@')[0];
    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  } else {
    return 'Anonymous User';
  }
}

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

    // Check if current user is admin (from session)
    const session = (request as any).session;
    const isAdmin = session?.isAdmin || false;

    // Get chat messages with privacy-safe user information
    const messages = await db
      .select({
        id: liveChatMessages.id,
        eventId: liveChatMessages.eventId,
        userId: liveChatMessages.userId,
        message: liveChatMessages.message,
        messageType: liveChatMessages.messageType,
        isModerated: liveChatMessages.isModerated,
        sentAt: liveChatMessages.sentAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          isAdmin: users.isAdmin,
          // Only expose email to admins
          ...(isAdmin && { email: users.email })
        }
      })
      .from(liveChatMessages)
      .leftJoin(users, eq(liveChatMessages.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(liveChatMessages.sentAt))
      .limit(limit);

    // Filter out moderated messages for non-admins and add display names
    const filteredMessages = messages
      .filter(msg => isAdmin || !msg.isModerated)
      .map(msg => ({
        ...msg,
        user: msg.user ? {
          ...msg.user,
          displayName: getDisplayName(msg.user)
        } : null
      }))
      .reverse(); // Show chronological order (oldest first)

    // For real-time updates, track message IDs to prevent duplicates
    const messageIds = filteredMessages.map(m => m.id);
    
    return NextResponse.json({
      success: true,
      messages: filteredMessages,
      messageIds, // Help client detect duplicates
      totalCount: filteredMessages.length,
      isAdmin
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
    const userId = session?.userId;

    // Validate authenticated user exists
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User authentication required' },
        { status: 401 }
      );
    }

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