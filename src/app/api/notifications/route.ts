import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { notifications } from '../../../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { withSessionAuth, withUserSessionAuth, withAdminSessionAuth } from '../../../../server/sessionAuth';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isRead = searchParams.get('isRead');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');

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
    const conditions = [eq(notifications.userId, userId)];
    if (isRead) conditions.push(eq(notifications.isRead, isRead === 'true'));
    if (type) conditions.push(eq(notifications.type, type));

    // Get user notifications
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      notifications: userNotifications,
    });

  } catch (error) {
    console.error('Notifications fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = (request as any).parsedBody || await request.json();
    const { userId, title, message, type, actionUrl, metadata } = body;

    // Validate required fields
    if (!userId || !title || !message || !type) {
      return NextResponse.json(
        { success: false, message: 'User ID, title, message, and type are required' },
        { status: 400 }
      );
    }

    // Create new notification
    const newNotification = await db
      .insert(notifications)
      .values({
        userId,
        title,
        message,
        type,
        actionUrl,
        metadata: metadata ? JSON.stringify(metadata) : null,
        isRead: false,
      })
      .returning();

    // Send real-time notification via WebSocket
    try {
      const { webSocketManager } = await import('../../../../server/websocket');
      webSocketManager.sendNotificationToUser(userId, newNotification[0]);
    } catch (wsError) {
      console.warn('Failed to send WebSocket notification:', wsError);
      // Continue even if WebSocket fails
    }

    return NextResponse.json({
      success: true,
      message: 'Notification created successfully',
      notification: newNotification[0],
    });

  } catch (error) {
    console.error('Notification creation error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

async function handlePATCH(request: NextRequest) {
  try {
    const body = (request as any).parsedBody || await request.json();
    const { notificationId, isRead } = body;

    // Get authenticated user ID from session (prevents IDOR vulnerability)
    const session = (request as any).session;
    const userId = session.userId;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, message: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Update notification - only if it belongs to the authenticated user
    const updatedNotification = await db
      .update(notifications)
      .set({
        isRead: isRead,
        readAt: isRead ? new Date() : null,
      })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ))
      .returning();

    if (updatedNotification.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification updated successfully',
      notification: updatedNotification[0],
    });

  } catch (error) {
    console.error('Notification update error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const GET = withUserSessionAuth(handleGET); // Users can only access their own notifications
export const POST = withAdminSessionAuth(handlePOST); // Only admins can create notifications
export const PATCH = withUserSessionAuth(handlePATCH); // Users can only update their own notifications