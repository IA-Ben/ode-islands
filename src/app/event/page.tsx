import { Suspense } from 'react';
import { headers } from 'next/headers';
import PhaseNavigation from "@/components/PhaseNavigation";
import EventPageClient from './EventPageClient';
import EventLoadingSkeleton from './EventLoadingSkeleton';
import { getSessionFromHeaders } from '../../../server/auth';
import { db } from '../../../server/db';
import { liveEvents } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Server component that fetches initial data
async function getInitialEventData() {
  try {
    // Get session data on server side
    const headersList = await headers();
    const sessionData = await getSessionFromHeaders({ headers: headersList } as any);
    
    // Parallel data fetching based on user role
    if (sessionData.isAuthenticated && sessionData.isAdmin) {
      // Admin users need events list
      const [events] = await Promise.all([
        db.select().from(liveEvents).orderBy(liveEvents.createdAt),
      ]);
      
      return {
        session: sessionData,
        events,
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
        activeEvent,
        userType: 'audience' as const
      };
    }
  } catch (error) {
    console.error('Failed to fetch initial event data:', error);
    return {
      session: { isAuthenticated: false },
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
      <PhaseNavigation currentPhase="event" />
      
      <Suspense fallback={<EventLoadingSkeleton />}>
        <EventPageClient initialData={initialData} />
      </Suspense>
    </div>
  );
}