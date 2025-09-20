"use client";

import { useState, useEffect } from 'react';
import PhaseNavigation from "@/components/PhaseNavigation";
import { useTheme } from '@/contexts/ThemeContext';
import EventDashboard from '@/components/EventDashboard';
import EventAudienceInterface from '@/components/EventAudienceInterface';
import EventInteractiveHub from '@/components/EventInteractiveHub';
import HelpSystem from '@/components/HelpSystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Type definitions based on our schema
interface LiveEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  settings?: string;
  createdBy?: string;
  createdAt: string;
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

export default function EventPage() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [activeView, setActiveView] = useState<'audience' | 'dashboard' | 'interactive' | 'loading'>('loading');
  const [activeEvent, setActiveEvent] = useState<LiveEvent | null>(null);

  // Fetch user session data
  const fetchSession = async () => {
    try {
      const response = await fetch('/api/auth/user-login', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const sessionData = data.user ? { isAuthenticated: true, ...data } : { isAuthenticated: false };
        setSession(sessionData);
        return sessionData;
      } else {
        setSession({ isAuthenticated: false });
        return { isAuthenticated: false };
      }
    } catch (err) {
      console.error('Failed to fetch session:', err);
      setSession({ isAuthenticated: false });
      return { isAuthenticated: false };
    }
  };

  // Fetch CSRF token for authenticated users
  const fetchCSRFToken = async () => {
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.csrfToken) {
          // CSRF token is automatically set as a cookie by the API
          console.log('CSRF token refreshed successfully');
        }
      }
    } catch (err) {
      console.error('Failed to fetch CSRF token:', err);
    }
  };

  // Fetch events data
  const fetchEvents = async () => {
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

  // Find currently active event
  const findActiveEvent = async (): Promise<LiveEvent | null> => {
    try {
      const response = await fetch('/api/events?isActive=true', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const activeEvents = data.events || [];
        
        // Find the most recent active event that is currently running
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

  useEffect(() => {
    const initializePage = async () => {
      setLoading(true);
      const sessionData = await fetchSession();
      
      // Determine view based on user role
      if (sessionData.isAuthenticated && sessionData.isAdmin) {
        // Authenticated admin gets operator dashboard
        await Promise.all([
          fetchEvents(),
          fetchCSRFToken()
        ]);
        setActiveView('dashboard');
      } else {
        // Default to audience interface for everyone else (including unauthenticated)
        // Find active event for audience view
        const currentEvent = await findActiveEvent();
        setActiveEvent(currentEvent);
        setActiveView('audience');
      }
      
      setLoading(false);
    };

    initializePage();
  }, []);

  // Refresh active event periodically (every 30 seconds)
  useEffect(() => {
    if (activeView === 'audience') {
      const interval = setInterval(async () => {
        const currentEvent = await findActiveEvent();
        setActiveEvent(currentEvent);
      }, 30000); // 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [activeView]);

  // Show loading state
  if (loading || activeView === 'loading') {
    return (
      <div className="w-full min-h-screen bg-black relative overflow-y-auto overflow-x-hidden">
        <PhaseNavigation currentPhase="event" />
        
        <div className="h-full pt-20 flex flex-col items-center justify-center text-center px-8">
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(ellipse at center, ${theme.colors.primary}40 0%, transparent 50%)`
            }}
          />
          
          <div className="relative z-10">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2" style={{ borderColor: theme.colors.primary }}></div>
            <p className="text-white/60 mt-4">Loading Event Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full min-h-screen bg-black relative overflow-y-auto overflow-x-hidden">
        <PhaseNavigation currentPhase="event" />
        
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
      </div>
    );
  }

  // Show audience interface
  if (activeView === 'audience') {
    // No active event found
    if (!activeEvent) {
      return (
        <div className="w-full min-h-screen bg-black relative overflow-y-auto overflow-x-hidden">
          <PhaseNavigation currentPhase="event" />
          
          <div className="h-full pt-20 flex flex-col items-center justify-center text-center px-8">
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                background: `radial-gradient(ellipse at center, ${theme.colors.primary}40 0%, transparent 50%)`
              }}
            />
            
            <div className="relative z-10 max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
        </div>
      );
    }
    
    return (
      <div className="w-full min-h-screen bg-black relative">
        <PhaseNavigation currentPhase="event" />
        
        <EventAudienceInterface
          eventId={activeEvent.id}
          userId={session?.userId || 'anonymous'}
          theme={theme}
        />
        
        {/* Comprehensive Help System for Audience */}
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
      </div>
    );
  }

  // Show operator dashboard (admin only)
  if (activeView === 'dashboard') {
    return (
      <div className="w-full min-h-screen bg-black relative">
        <PhaseNavigation currentPhase="event" />
        
        <EventDashboard 
          events={events}
          session={session!}
          onEventsUpdate={fetchEvents}
          theme={theme}
        />
        
        {/* Comprehensive Help System for Admins */}
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
      </div>
    );
  }

  // Show Interactive Choice Hub
  if (activeView === 'interactive') {
    if (!activeEvent) {
      return (
        <div className="w-full min-h-screen bg-black relative overflow-y-auto overflow-x-hidden">
          <PhaseNavigation currentPhase="event" />
          
          <div className="h-full pt-20 flex flex-col items-center justify-center text-center px-8">
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                background: `radial-gradient(ellipse at center, ${theme.colors.primary}40 0%, transparent 50%)`
              }}
            />
            
            <div className="relative z-10 max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
        </div>
      );
    }
    
    return (
      <div className="w-full min-h-screen bg-black relative">
        <PhaseNavigation currentPhase="event" />
        
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
      </div>
    );
  }

  // This should never be reached, but just in case
  return null;
}