import { Suspense } from 'react';
import EventPageClient from './EventPageClient';
import EventLoadingSkeleton from './EventLoadingSkeleton';
import { db } from '../../../server/db';
import { liveEvents } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

// Mock admin user with full permissions (authentication bypassed per project requirements)
const mockAdminUser = {
  id: 'mock-admin-user',
  email: 'dev@odeislands.com',
  firstName: 'Dev',
  lastName: 'User',
  isAdmin: true
};

// Server component that fetches initial data
async function getInitialEventData() {
  try {
    const sessionData = { 
      isAuthenticated: true, 
      isAdmin: true,
      userId: mockAdminUser.id,
      user: mockAdminUser
    };
    
    // Fetch active event for all users (both admin and audience)
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
  } catch (error) {
    console.error('Failed to fetch initial event data:', error);
    return {
      session: { isAuthenticated: true, isAdmin: true, userId: mockAdminUser.id, user: mockAdminUser },
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