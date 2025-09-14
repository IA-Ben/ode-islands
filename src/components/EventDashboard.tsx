"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LiveEventCard from './LiveEventCard';
import EventCreationForm from './EventCreationForm';
import LivePollingInterface from './LivePollingInterface';
import QAManagement from './QAManagement';
import EventTimeline from './EventTimeline';
import LiveChatInterface from './LiveChatInterface';

// Type definitions
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

interface EventDashboardProps {
  events: LiveEvent[];
  session: SessionData;
  onEventsUpdate: () => void;
  theme: any;
}

type ViewMode = 'overview' | 'polls' | 'qa' | 'chat' | 'timeline' | 'create';

export default function EventDashboard({ events, session, onEventsUpdate, theme }: EventDashboardProps) {
  const [activeView, setActiveView] = useState<ViewMode>('overview');
  const [selectedEvent, setSelectedEvent] = useState<LiveEvent | null>(null);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Get active events
  const activeEvents = events.filter(event => event.isActive);
  const upcomingEvents = events.filter(event => !event.isActive && new Date(event.startTime) > new Date());
  const pastEvents = events.filter(event => !event.isActive && new Date(event.endTime) < new Date());

  // Auto-select the first active event if none is selected
  useEffect(() => {
    if (!selectedEvent && activeEvents.length > 0) {
      setSelectedEvent(activeEvents[0]);
    }
  }, [activeEvents, selectedEvent]);

  // Set up real-time updates
  useEffect(() => {
    if (realTimeEnabled) {
      const interval = setInterval(() => {
        onEventsUpdate();
      }, 5000); // Refresh every 5 seconds
      
      setRefreshInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [realTimeEnabled, onEventsUpdate]);

  const handleEventSelect = (event: LiveEvent) => {
    setSelectedEvent(event);
  };

  const handleActivateEvent = async (eventId: string) => {
    try {
      const response = await fetch('/api/events', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          eventId,
          isActive: true
        })
      });

      if (response.ok) {
        onEventsUpdate();
      } else {
        console.error('Failed to activate event');
      }
    } catch (error) {
      console.error('Error activating event:', error);
    }
  };

  const handleDeactivateEvent = async (eventId: string) => {
    try {
      const response = await fetch('/api/events', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          eventId,
          isActive: false
        })
      });

      if (response.ok) {
        onEventsUpdate();
      } else {
        console.error('Failed to deactivate event');
      }
    } catch (error) {
      console.error('Error deactivating event:', error);
    }
  };

  // Get CSRF token from cookies
  const getCsrfToken = (): string => {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf-token') {
        return decodeURIComponent(value);
      }
    }
    return '';
  };

  // Navigation items
  const navigationItems = [
    { id: 'overview', label: 'Overview', description: 'Event management and status' },
    { id: 'polls', label: 'Live Polls', description: 'Interactive audience polling', disabled: !selectedEvent },
    { id: 'qa', label: 'Q&A Session', description: 'Questions and answers', disabled: !selectedEvent },
    { id: 'chat', label: 'Live Chat', description: 'Real-time messaging', disabled: !selectedEvent },
    { id: 'timeline', label: 'Timeline', description: 'Scheduled activities', disabled: !selectedEvent },
  ];

  if (session.isAdmin) {
    navigationItems.push({ id: 'create', label: 'Create Event', description: 'Add new event' });
  }

  return (
    <div className="w-full min-h-screen pt-20 pb-8">
      {/* Background gradient */}
      <div 
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${theme.colors.primary}20 0%, transparent 70%)`
        }}
      />
      
      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 
                className="text-5xl font-bold mb-3 tracking-tight"
                style={{ color: theme.colors.primary }}
              >
                Event Dashboard
              </h1>
              <div className="flex items-center gap-4">
                <p className="text-white/70 text-lg">
                  {activeEvents.length > 0 
                    ? `${activeEvents.length} active event${activeEvents.length !== 1 ? 's' : ''}`
                    : 'No active events'
                  }
                </p>
                {activeEvents.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-green-400 font-medium text-sm uppercase tracking-wide">Live</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Real-time status */}
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRealTimeEnabled(!realTimeEnabled)}
                  className={`text-sm font-medium ${realTimeEnabled ? 'text-green-400' : 'text-white/60'} hover:bg-white/10`}
                >
                  <span className={`w-2 h-2 rounded-full mr-2 ${realTimeEnabled ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`}></span>
                  {realTimeEnabled ? 'Live Updates' : 'Paused'}
                </Button>
                
                <div className="w-px h-4 bg-white/20"></div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEventsUpdate}
                  className="text-sm font-medium text-white/60 hover:text-white hover:bg-white/10"
                >
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Event selector for non-overview views */}
          {activeView !== 'overview' && activeView !== 'create' && selectedEvent && (
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm mb-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-xl mb-2">{selectedEvent.title}</h3>
                    <p className="text-white/60">
                      {new Date(selectedEvent.startTime).toLocaleDateString()} • {new Date(selectedEvent.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedEvent.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div 
                      className={`px-4 py-2 rounded-lg font-medium text-sm uppercase tracking-wide ${
                        selectedEvent.isActive 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-white/10 text-white/60 border border-white/20'
                      }`}
                    >
                      {selectedEvent.isActive ? 'Live' : 'Inactive'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navigation */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-3">
            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => setActiveView(item.id as ViewMode)}
                disabled={item.disabled}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeView === item.id 
                    ? 'bg-white/15 text-white border border-white/20 shadow-lg' 
                    : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'
                } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-xs opacity-70">{item.description}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="min-h-[60vh]">
          {activeView === 'overview' && (
            <div className="space-y-12">
              {/* Active Events */}
              {activeEvents.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold text-white">Active Events</h2>
                    <div className="text-white/60">
                      {activeEvents.length} event{activeEvents.length !== 1 ? 's' : ''} live
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {activeEvents.map(event => (
                      <LiveEventCard
                        key={event.id}
                        event={event}
                        isSelected={selectedEvent?.id === event.id}
                        onSelect={() => handleEventSelect(event)}
                        onActivate={session.isAdmin ? () => handleActivateEvent(event.id) : undefined}
                        onDeactivate={session.isAdmin ? () => handleDeactivateEvent(event.id) : undefined}
                        isAdmin={session.isAdmin || false}
                        theme={theme}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Upcoming Events */}
              {upcomingEvents.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold text-white">Upcoming Events</h2>
                    <div className="text-white/60">
                      {upcomingEvents.length} event{upcomingEvents.length !== 1 ? 's' : ''} scheduled
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {upcomingEvents.map(event => (
                      <LiveEventCard
                        key={event.id}
                        event={event}
                        isSelected={selectedEvent?.id === event.id}
                        onSelect={() => handleEventSelect(event)}
                        onActivate={session.isAdmin ? () => handleActivateEvent(event.id) : undefined}
                        onDeactivate={session.isAdmin ? () => handleDeactivateEvent(event.id) : undefined}
                        isAdmin={session.isAdmin || false}
                        theme={theme}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* No events message */}
              {events.length === 0 && (
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardContent className="px-12 py-16 text-center">
                    <div className="max-w-md mx-auto">
                      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-white/40 rounded-md"></div>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-white">No Events Available</h3>
                      <p className="text-white/60 text-lg mb-8 leading-relaxed">
                        {session.isAdmin 
                          ? 'Create your first event to get started with live interactions and real-time engagement.'
                          : 'There are currently no events scheduled. Check back soon for upcoming live events.'
                        }
                      </p>
                      {session.isAdmin && (
                        <Button
                          onClick={() => setActiveView('create')}
                          style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
                          className="px-8 py-3 font-semibold text-lg"
                        >
                          Create First Event
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Events */}
              {pastEvents.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold text-white">Recent Events</h2>
                    <div className="text-white/60">
                      {pastEvents.length} event{pastEvents.length !== 1 ? 's' : ''} completed
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {pastEvents.slice(0, 6).map(event => (
                      <LiveEventCard
                        key={event.id}
                        event={event}
                        isSelected={selectedEvent?.id === event.id}
                        onSelect={() => handleEventSelect(event)}
                        isAdmin={session.isAdmin || false}
                        theme={theme}
                        isPastEvent={true}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeView === 'polls' && selectedEvent && (
            <LivePollingInterface
              event={selectedEvent}
              session={session}
              theme={theme}
            />
          )}

          {activeView === 'qa' && selectedEvent && (
            <QAManagement
              event={selectedEvent}
              session={session}
              theme={theme}
            />
          )}

          {activeView === 'chat' && selectedEvent && (
            <LiveChatInterface
              event={selectedEvent}
              session={session}
              theme={theme}
            />
          )}

          {activeView === 'timeline' && selectedEvent && (
            <EventTimeline
              event={selectedEvent}
              session={session}
              theme={theme}
            />
          )}

          {activeView === 'create' && session.isAdmin && (
            <EventCreationForm
              onEventCreated={onEventsUpdate}
              onCancel={() => setActiveView('overview')}
              theme={theme}
            />
          )}
        </div>
      </div>
    </div>
  );
}