// Notification service for creating and sending notifications
import { apiCallWithCSRF } from './csrfUtils';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: 'event' | 'content' | 'achievement' | 'reminder' | 'certificate' | 'poll' | 'chat' | 'progress';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Create and send a notification to a specific user
   */
  static async createNotification(params: CreateNotificationParams): Promise<boolean> {
    try {
      const response = await apiCallWithCSRF('/api/notifications', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Notification sent successfully:', params.title);
        return true;
      } else {
        console.error('Failed to send notification:', data.message);
        return false;
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  /**
   * Send certificate awarded notification
   */
  static async notifyCertificateAwarded(userId: string, certificateTitle: string, certificateId: string): Promise<boolean> {
    return this.createNotification({
      userId,
      title: '🏆 Certificate Awarded!',
      message: `Congratulations! You've earned the "${certificateTitle}" certificate.`,
      type: 'certificate',
      actionUrl: `/certificates/${certificateId}`,
      metadata: {
        certificateId,
        certificateTitle,
      }
    });
  }

  /**
   * Send progress completion notification
   */
  static async notifyChapterCompleted(userId: string, chapterTitle: string, chapterId: string): Promise<boolean> {
    return this.createNotification({
      userId,
      title: '📈 Chapter Completed!',
      message: `Great work! You've completed "${chapterTitle}". Keep up the momentum!`,
      type: 'progress',
      actionUrl: `/progress`,
      metadata: {
        chapterId,
        chapterTitle,
      }
    });
  }

  /**
   * Send new poll notification
   */
  static async notifyNewPoll(userId: string, pollQuestion: string, eventId?: string): Promise<boolean> {
    return this.createNotification({
      userId,
      title: '📊 New Poll Available',
      message: `A new poll is live: "${pollQuestion}". Share your voice!`,
      type: 'poll',
      actionUrl: eventId ? `/event` : undefined,
      metadata: {
        pollQuestion,
        eventId,
      }
    });
  }

  /**
   * Send chat mention notification
   */
  static async notifyChatMention(userId: string, mentionerName: string, eventId: string): Promise<boolean> {
    return this.createNotification({
      userId,
      title: '💬 You were mentioned in chat',
      message: `${mentionerName} mentioned you in the live chat. Check it out!`,
      type: 'chat',
      actionUrl: `/event`,
      metadata: {
        mentionerName,
        eventId,
      }
    });
  }

  /**
   * Send event starting notification
   */
  static async notifyEventStarting(userId: string, eventTitle: string, eventId: string): Promise<boolean> {
    return this.createNotification({
      userId,
      title: '🎪 Event Starting Soon!',
      message: `"${eventTitle}" is starting in 10 minutes. Don't miss it!`,
      type: 'event',
      actionUrl: `/event`,
      metadata: {
        eventId,
        eventTitle,
      }
    });
  }

  /**
   * Send achievement unlocked notification
   */
  static async notifyAchievementUnlocked(userId: string, achievementTitle: string, description: string): Promise<boolean> {
    return this.createNotification({
      userId,
      title: '🏆 Achievement Unlocked!',
      message: `You've unlocked "${achievementTitle}": ${description}`,
      type: 'achievement',
      actionUrl: `/progress`,
      metadata: {
        achievementTitle,
        description,
      }
    });
  }

  /**
   * Send new content available notification
   */
  static async notifyNewContent(userId: string, contentTitle: string, chapterId: string): Promise<boolean> {
    return this.createNotification({
      userId,
      title: '📖 New Content Available',
      message: `New content "${contentTitle}" is now available. Explore it now!`,
      type: 'content',
      actionUrl: `/before/${chapterId}`,
      metadata: {
        contentTitle,
        chapterId,
      }
    });
  }

  /**
   * Send reminder notification
   */
  static async sendReminder(userId: string, title: string, message: string, actionUrl?: string): Promise<boolean> {
    return this.createNotification({
      userId,
      title,
      message,
      type: 'reminder',
      actionUrl,
    });
  }

  /**
   * Batch create notifications for multiple users
   */
  static async createNotificationForUsers(userIds: string[], params: Omit<CreateNotificationParams, 'userId'>): Promise<number> {
    let successCount = 0;
    
    const promises = userIds.map(async (userId) => {
      const success = await this.createNotification({ ...params, userId });
      if (success) successCount++;
      return success;
    });

    await Promise.allSettled(promises);
    return successCount;
  }
}

export default NotificationService;