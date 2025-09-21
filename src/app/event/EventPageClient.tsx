"use client";

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import HelpSystem from '@/components/HelpSystem';
import dynamic from 'next/dynamic';

// Dynamic imports for heavy modules (loaded only when needed)
const EventDashboard = dynamic(() => import('@/components/EventDashboard'), {
  loading: () => <div className="p-8 text-white/60">Loading dashboard...</div>
});

const EventAudienceInterface = dynamic(() => import('@/components/EventAudienceInterface'), {
  loading: () => <div className="p-8 text-white/60">Loading event interface...</div>
});

const EventInteractiveHub = dynamic(() => import('@/components/EventInteractiveHub'), {
  loading: () => <div className="p-8 text-white/60">Loading interactive features...</div>
});

// Types
interface LiveEvent {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  isActive: boolean | null;
  settings?: string | null;
  createdBy?: string | null;
  createdAt: string | null;
}

interface SessionData {
  isAuthenticated: boolean;
  userId?: string;
  isAdmin?: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
  };
}

interface InitialData {
  session: SessionData;
  events: LiveEvent[];
  activeEvent: LiveEvent | null;
  userType: 'admin' | 'audience';
  error?: string;
}

interface EventPageClientProps {
  initialData: InitialData;
}

export default function EventPageClient({ initialData }: EventPageClientProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialData.error || null);
  const [events, setEvents] = useState<LiveEvent[]>(initialData.events);
  const [session] = useState<SessionData>(initialData.session);
  const [activeEvent, setActiveEvent] = useState<LiveEvent | null>(initialData.activeEvent);
  
  // Determine initial view based on server data
  const [activeView, setActiveView] = useState<'audience' | 'dashboard' | 'interactive'>(() => {
    if (initialData.userType === 'admin') {
      return 'dashboard';
    }
    return 'audience';
  });

  // Optimized CSRF token fetching (only when needed)
  const fetchCSRFToken = async () => {
    if (!session.isAuthenticated) return;
    
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.csrfToken) {
          console.log('CSRF token refreshed successfully');
        }
      }
    } catch (err) {
      console.error('Failed to fetch CSRF token:', err);
    }
  };

  // Optimized events fetching (only for admins when needed)
  const fetchEvents = async () => {
    if (!session.isAdmin) return;
    
    try {
      const response = await fetch('/api/events', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        throw new Error('Failed to fetch events');
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError('Failed to load events');
    }
  };

  // Optimized active event finding (cached and efficient)
  const findActiveEvent = async (): Promise<LiveEvent | null> => {
    try {
      const response = await fetch('/api/events?isActive=true', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const activeEvents = data.events || [];
        
        const now = new Date();
        const currentEvent = activeEvents.find((event: LiveEvent) => {
          const startTime = new Date(event.startTime);
          const endTime = new Date(event.endTime);
          return startTime <= now && now <= endTime && event.isActive;
        });
        
        return currentEvent || (activeEvents.length > 0 ? activeEvents[0] : null);
      } else {
        console.warn('Failed to fetch active events');
        return null;
      }
    } catch (err) {
      console.error('Failed to find active event:', err);
      return null;
    }
  };

  // Lazy initialization for admin features
  useEffect(() => {
    if (session.isAuthenticated && session.isAdmin && activeView === 'dashboard') {
      fetchCSRFToken();
    }
  }, [session.isAuthenticated, session.isAdmin, activeView]);

  // Refresh active event periodically (only for audience view)
  useEffect(() => {
    if (activeView === 'audience') {
      const interval = setInterval(async () => {
        const currentEvent = await findActiveEvent();
        setActiveEvent(currentEvent);
      }, 30000); // 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [activeView]);

  // Memoized theme gradient for performance
  const backgroundGradient = useMemo(() => 
    `radial-gradient(ellipse at center, ${theme.colors.primary}40 0%, transparent 50%)`,
    [theme.colors.primary]
  );

  // Error state with retry functionality
  if (error) {
    return (
      <div className="h-full pt-20 flex flex-col items-center justify-center text-center px-8">
        <Card className="bg-red-500/10 border-red-500/20 max-w-md">
          <CardHeader>
            <CardTitle className="text-red-400">Error Loading Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-300 mb-4">{error}</p>
            <Button 
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchEvents().then(() => {
                  setLoading(false);
                  setActiveView('dashboard');
                });
              }}
              variant="outline"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Audience view
  if (activeView === 'audience') {
    if (!activeEvent) {
      return (
        <div className="h-full pt-20 flex flex-col items-center justify-center text-center px-8">
          <div 
            className="absolute inset-0 opacity-20"
            style={{ background: backgroundGradient }}
          />
          
          <div className="relative z-10 max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">No Live Event</h2>
            <p className="text-white/60 text-lg mb-8 leading-relaxed">
              There's currently no active event happening. Check back when an event is live to join the interactive experience.
            </p>
            <Button
              onClick={async () => {
                setLoading(true);
                const currentEvent = await findActiveEvent();
                setActiveEvent(currentEvent);
                setLoading(false);
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Check Again
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <>
        <EventAudienceInterface
          eventId={activeEvent.id}
          userId={session?.userId || 'anonymous'}
          theme={theme}
        />
        
        <HelpSystem userRole="audience" />
        
        {/* Navigation buttons */}
        <div className="fixed top-20 right-4 z-50 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView('interactive')}
            className="bg-black/50 text-white/60 hover:text-white hover:bg-black/70 text-xs block"
          >
            🎯 Interactive Choices
          </Button>
          
          {session?.isAuthenticated && session?.isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetchEvents().then(() => setActiveView('dashboard'));
              }}
              className="bg-black/50 text-white/60 hover:text-white hover:bg-black/70 text-xs block"
            >
              ⚙️ Operator Console
            </Button>
          )}
        </div>
        
        {/* Event info indicator */}
        <div className="fixed bottom-20 left-4 z-40">
          <div className="bg-black/70 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2">
            <p className="text-white/60 text-xs">
              Connected to: <span className="text-white font-medium">{activeEvent.title}</span>
            </p>
          </div>
        </div>
      </>
    );
  }

  // Admin dashboard view
  if (activeView === 'dashboard') {
    return (
      <>
        <EventDashboard 
          events={events}
          session={session!}
          onEventsUpdate={fetchEvents}
          theme={theme}
        />
        
        <HelpSystem userRole="admin" />
        
        {/* Navigation buttons */}
        <div className="fixed top-20 right-4 z-50 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView('audience')}
            className="bg-black/50 text-white/60 hover:text-white hover:bg-black/70 text-xs block"
          >
            👥 Audience View
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView('interactive')}
            className="bg-black/50 text-white/60 hover:text-white hover:bg-black/70 text-xs block"
          >
            🎯 Interactive Choices
          </Button>
        </div>
      </>
    );
  }

  // Interactive view
  if (activeView === 'interactive') {
    if (!activeEvent) {
      return (
        <div className="h-full pt-20 flex flex-col items-center justify-center text-center px-8">
          <div 
            className="absolute inset-0 opacity-20"
            style={{ background: backgroundGradient }}
          />
          
          <div className="relative z-10 max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">No Active Event</h2>
            <p className="text-white/60 text-lg mb-8 leading-relaxed">
              Interactive choices require an active event. Please wait for an event to start.
            </p>
            <Button
              onClick={() => setActiveView('audience')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Back to Event Hub
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <>
        <EventInteractiveHub
          event={activeEvent}
          session={session!}
          theme={theme}
        />
        
        {/* Navigation buttons */}
        <div className="fixed top-20 right-4 z-50 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView('audience')}
            className="bg-black/50 text-white/60 hover:text-white hover:bg-black/70 text-xs block"
          >
            👥 Audience View
          </Button>
          
          {session?.isAuthenticated && session?.isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetchEvents().then(() => setActiveView('dashboard'));
              }}
              className="bg-black/50 text-white/60 hover:text-white hover:bg-black/70 text-xs block"
            >
              ⚙️ Operator Console
            </Button>
          )}
        </div>
      </>
    );
  }

  return null;
}