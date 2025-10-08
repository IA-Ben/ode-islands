import { NextResponse } from 'next/server';
import { db } from '../../../../../../server/db';
import { users, chapters, storyCards, cards, liveEvents } from '../../../../../../shared/schema';
import { count, sql, desc, gte } from 'drizzle-orm';
import { getServerUser } from '../../../../../../server/auth';

export async function GET(request: Request) {
  try {
    // Check authentication
    const user = await getServerUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total users count
    const [totalUsersResult] = await db.select({ count: count() }).from(users);
    const totalUsers = totalUsersResult.count;

    // Get users from last 30 days (growth)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [recentUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo));
    const recentUsers = recentUsersResult.count;

    // Calculate user growth percentage
    const previousUsers = totalUsers - recentUsers;
    const userGrowthPercent = previousUsers > 0
      ? Math.round((recentUsers / previousUsers) * 100)
      : 100;

    // Get total chapters
    const [totalChaptersResult] = await db.select({ count: count() }).from(chapters);
    const totalChapters = totalChaptersResult.count;

    // Get published chapters
    const [publishedChaptersResult] = await db
      .select({ count: count() })
      .from(chapters)
      .where(sql`${chapters.publishStatus} = 'published'`);
    const publishedChapters = publishedChaptersResult.count;

    // Get total story cards
    const [totalStoryCardsResult] = await db.select({ count: count() }).from(storyCards);
    const totalStoryCards = totalStoryCardsResult.count;

    // Get total unified cards
    const [totalCardsResult] = await db.select({ count: count() }).from(cards);
    const totalCards = totalCardsResult.count;

    // Get active cards
    const [activeCardsResult] = await db
      .select({ count: count() })
      .from(cards)
      .where(sql`${cards.isActive} = true AND ${cards.publishStatus} = 'published'`);
    const activeCards = activeCardsResult.count;

    // Get total events
    const [totalEventsResult] = await db.select({ count: count() }).from(liveEvents);
    const totalEvents = totalEventsResult.count;

    // Get active events
    const [activeEventsResult] = await db
      .select({ count: count() })
      .from(liveEvents)
      .where(sql`${liveEvents.isActive} = true`);
    const activeEvents = activeEventsResult.count;

    // Get recent content activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentChaptersResult] = await db
      .select({ count: count() })
      .from(chapters)
      .where(gte(chapters.updatedAt, sevenDaysAgo));
    const recentChapters = recentChaptersResult.count;

    const [recentCardsResult] = await db
      .select({ count: count() })
      .from(cards)
      .where(gte(cards.updatedAt, sevenDaysAgo));
    const recentCards = recentCardsResult.count;

    // Get content by status
    const [draftChaptersResult] = await db
      .select({ count: count() })
      .from(chapters)
      .where(sql`${chapters.publishStatus} = 'draft'`);
    const draftChapters = draftChaptersResult.count;

    const [draftCardsResult] = await db
      .select({ count: count() })
      .from(cards)
      .where(sql`${cards.publishStatus} = 'draft'`);
    const draftCards = draftCardsResult.count;

    return NextResponse.json({
      users: {
        total: totalUsers,
        recent: recentUsers,
        growthPercent: userGrowthPercent,
        change: recentUsers > 0 ? `+${recentUsers}` : '0'
      },
      chapters: {
        total: totalChapters,
        published: publishedChapters,
        draft: draftChapters,
        publishRate: totalChapters > 0
          ? Math.round((publishedChapters / totalChapters) * 100)
          : 0
      },
      cards: {
        total: totalCards + totalStoryCards,
        active: activeCards,
        draft: draftCards,
        recentlyUpdated: recentCards
      },
      events: {
        total: totalEvents,
        active: activeEvents,
        inactiveCount: totalEvents - activeEvents
      },
      activity: {
        recentChapters,
        recentCards,
        weeklyActivity: recentChapters + recentCards
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
