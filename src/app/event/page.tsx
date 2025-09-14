"use client";

import { useState, useEffect } from 'react';
import PhaseNavigation from "@/components/PhaseNavigation";
import { useTheme } from '@/contexts/ThemeContext';
import EventDashboard from '@/components/EventDashboard';
import EventAudienceInterface from '@/components/EventAudienceInterface';
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
  const [activeView, setActiveView] = useState<'audience' | 'dashboard' | 'loading'>('loading');

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
        setActiveView('audience');
      }
      
      setLoading(false);
    };

    initializePage();
  }, []);

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
    return (
      <div className="w-full min-h-screen bg-black relative">
        <PhaseNavigation currentPhase="event" />
        
        <EventAudienceInterface
          eventId="current-event" // TODO: Get from active event or URL params
          userId={session?.userId || 'anonymous'}
          theme={theme}
        />
        
        {/* Admin access button (hidden, only for authenticated admins) */}
        {session?.isAuthenticated && session?.isAdmin && (
          <div className="fixed top-20 right-4 z-50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetchEvents().then(() => setActiveView('dashboard'));
              }}
              className="bg-black/50 text-white/60 hover:text-white hover:bg-black/70 text-xs"
            >
              Operator Console
            </Button>
          </div>
        )}
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
        
        {/* Switch to audience view button */}
        <div className="fixed top-20 right-4 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView('audience')}
            className="bg-black/50 text-white/60 hover:text-white hover:bg-black/70 text-xs"
          >
            Audience View
          </Button>
        </div>
      </div>
    );
  }

  // This should never be reached, but just in case
  return null;
}