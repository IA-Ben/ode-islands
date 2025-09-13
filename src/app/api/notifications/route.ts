import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { notifications } from '../../../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const isRead = searchParams.get('isRead');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, isRead } = body;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, message: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Update notification
    const updatedNotification = await db
      .update(notifications)
      .set({
        isRead: isRead,
        readAt: isRead ? new Date() : null,
      })
      .where(eq(notifications.id, notificationId))
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