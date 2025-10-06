import { Suspense } from 'react';
import { headers } from 'next/headers';
import EventPageClient from './EventPageClient';
import EventLoadingSkeleton from './EventLoadingSkeleton';
import { getServerUser } from '../../../server/auth';
import { db } from '../../../server/db';
import { liveEvents } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Server component that fetches initial data
async function getInitialEventData() {
  try {
    // Fetch user data server-side
    const user = await getServerUser();
    const sessionData = { 
      isAuthenticated: !!user, 
      isAdmin: user?.isAdmin ?? false,
      userId: user?.id,
      user: user ? {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin
      } : undefined
    };
    
    // Parallel data fetching based on user role
    if (sessionData.isAuthenticated && sessionData.isAdmin) {
      // Admin users need events list
      const [events] = await Promise.all([
        db.select().from(liveEvents).orderBy(liveEvents.createdAt),
      ]);
      
      return {
        session: sessionData,
        events: events.map(event => ({
          ...event,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
          createdAt: event.createdAt?.toISOString() || null,
          settings: typeof event.settings === 'string' ? event.settings : JSON.stringify(event.settings)
        })),
        activeEvent: null,
        userType: 'admin' as const
      };
    } else {
      // Audience users need active event
      const now = new Date();
      const activeEvents = await db
        .select()
        .from(liveEvents)
        .where(eq(liveEvents.isActive, true));
      
      // Find currently running event  
      const currentEvent = activeEvents.find((event: any) => {
        const startTime = new Date(event.startTime);
        const endTime = new Date(event.endTime);
        return startTime <= now && now <= endTime;
      });
      
      const activeEvent = currentEvent || (activeEvents.length > 0 ? activeEvents[0] : null);
      
      return {
        session: sessionData,
        events: [],
        activeEvent: activeEvent ? {
          ...activeEvent,
          startTime: activeEvent.startTime.toISOString(),
          endTime: activeEvent.endTime.toISOString(),
          createdAt: activeEvent.createdAt?.toISOString() || null,
          settings: typeof activeEvent.settings === 'string' ? activeEvent.settings : JSON.stringify(activeEvent.settings)
        } : null,
        userType: 'audience' as const
      };
    }
  } catch (error) {
    console.error('Failed to fetch initial event data:', error);
    return {
      session: { isAuthenticated: false, isAdmin: false },
      events: [],
      activeEvent: null,
      userType: 'audience' as const,
      error: 'Failed to load event data'
    };
  }
}

export default async function EventPage() {
  // Fetch initial data on server
  const initialData = await getInitialEventData();
  
  return (
    <div className="w-full min-h-screen bg-black relative">
      <Suspense fallback={<EventLoadingSkeleton />}>
        <EventPageClient initialData={initialData} />
      </Suspense>
    </div>
  );
}