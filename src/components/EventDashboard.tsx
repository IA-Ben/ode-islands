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
    { id: 'overview', label: 'Event Overview', icon: '🏠', description: 'View and manage events' },
    { id: 'polls', label: 'Live Polls', icon: '📊', description: 'Interactive polling', disabled: !selectedEvent },
    { id: 'qa', label: 'Q&A Session', icon: '❓', description: 'Questions & answers', disabled: !selectedEvent },
    { id: 'chat', label: 'Live Chat', icon: '💬', description: 'Real-time messaging', disabled: !selectedEvent },
    { id: 'timeline', label: 'Event Timeline', icon: '⏰', description: 'Scheduled content', disabled: !selectedEvent },
  ];

  if (session.isAdmin) {
    navigationItems.push({ id: 'create', label: 'Create Event', icon: '➕', description: 'Add new event' });
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
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 
                className="text-4xl font-bold mb-2"
                style={{ color: theme.colors.primary }}
              >
                Live Event Dashboard
              </h1>
              <p className="text-white/60">
                {activeEvents.length > 0 
                  ? `${activeEvents.length} active event${activeEvents.length !== 1 ? 's' : ''} running`
                  : 'No active events'
                }
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Real-time toggle */}
              <Button
                variant={realTimeEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setRealTimeEnabled(!realTimeEnabled)}
                className="text-xs"
              >
                <span className={`w-2 h-2 rounded-full mr-2 ${realTimeEnabled ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                {realTimeEnabled ? 'Live' : 'Paused'}
              </Button>
              
              {/* Manual refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={onEventsUpdate}
                className="text-xs"
              >
                🔄 Refresh
              </Button>
            </div>
          </div>

          {/* Event selector for non-overview views */}
          {activeView !== 'overview' && activeView !== 'create' && selectedEvent && (
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{selectedEvent.title}</h3>
                    <p className="text-white/60 text-sm">
                      {new Date(selectedEvent.startTime).toLocaleString()} - {new Date(selectedEvent.endTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span 
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedEvent.isActive 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}
                    >
                      {selectedEvent.isActive ? '🟢 Active' : '⚪ Inactive'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant={activeView === item.id ? "default" : "outline"}
                onClick={() => setActiveView(item.id as ViewMode)}
                disabled={item.disabled}
                className={`flex items-center gap-2 ${
                  activeView === item.id 
                    ? 'bg-white/10 text-white border-white/20' 
                    : 'bg-transparent text-white/70 border-white/10 hover:bg-white/5'
                }`}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.icon}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="min-h-[60vh]">
          {activeView === 'overview' && (
            <div className="space-y-8">
              {/* Active Events */}
              {activeEvents.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">Active Events</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                </div>
              )}

              {/* Upcoming Events */}
              {upcomingEvents.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">Upcoming Events</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                </div>
              )}

              {/* No events message */}
              {events.length === 0 && (
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardContent className="p-8 text-center">
                    <div className="text-4xl mb-4">📅</div>
                    <h3 className="text-xl font-semibold mb-2 text-white">No Events Available</h3>
                    <p className="text-white/60 mb-4">
                      {session.isAdmin 
                        ? 'Create your first event to get started with live interactions.'
                        : 'There are currently no events scheduled.'
                      }
                    </p>
                    {session.isAdmin && (
                      <Button
                        onClick={() => setActiveView('create')}
                        style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
                      >
                        Create First Event
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Recent Events */}
              {pastEvents.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">Recent Events</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                </div>
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