"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  type: 'poll' | 'qa' | 'content' | 'break' | 'announcement';
  scheduledTime: Date;
  duration?: number; // minutes
  status: 'upcoming' | 'active' | 'completed';
  metadata?: any;
}

interface EventTimelineProps {
  event: LiveEvent;
  session: SessionData;
  theme: any;
}

export default function EventTimeline({ event, session, theme }: EventTimelineProps) {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [autoProgress, setAutoProgress] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Generate sample timeline events based on event duration and settings
  useEffect(() => {
    const generateTimelineEvents = () => {
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));

      const events: TimelineEvent[] = [];

      // Welcome/Opening (5 minutes after start)
      events.push({
        id: 'welcome',
        title: 'Welcome & Introduction',
        description: 'Event opening and overview',
        type: 'announcement',
        scheduledTime: new Date(startTime.getTime() + 5 * 60 * 1000),
        duration: 10,
        status: getEventStatus(new Date(startTime.getTime() + 5 * 60 * 1000), 10),
        metadata: { priority: 'high' }
      });

      // Interactive segments based on event settings
      const settings = event.settings ? JSON.parse(event.settings) : {};
      
      if (settings.allowPolls !== false) {
        // Poll 1 - 25% through event
        events.push({
          id: 'poll-1',
          title: 'Opening Poll',
          description: 'Audience engagement poll',
          type: 'poll',
          scheduledTime: new Date(startTime.getTime() + (durationMs * 0.25)),
          duration: 5,
          status: getEventStatus(new Date(startTime.getTime() + (durationMs * 0.25)), 5),
          metadata: { pollType: 'engagement' }
        });

        // Poll 2 - 50% through event
        events.push({
          id: 'poll-2',
          title: 'Mid-Event Poll',
          description: 'Knowledge check or feedback poll',
          type: 'poll',
          scheduledTime: new Date(startTime.getTime() + (durationMs * 0.5)),
          duration: 7,
          status: getEventStatus(new Date(startTime.getTime() + (durationMs * 0.5)), 7),
          metadata: { pollType: 'knowledge' }
        });

        // Poll 3 - 75% through event
        events.push({
          id: 'poll-3',
          title: 'Final Poll',
          description: 'Wrap-up or feedback poll',
          type: 'poll',
          scheduledTime: new Date(startTime.getTime() + (durationMs * 0.75)),
          duration: 5,
          status: getEventStatus(new Date(startTime.getTime() + (durationMs * 0.75)), 5),
          metadata: { pollType: 'feedback' }
        });
      }

      if (settings.allowQA !== false) {
        // Q&A Session - 40% through event
        events.push({
          id: 'qa-session',
          title: 'Q&A Session',
          description: 'Open floor for questions and answers',
          type: 'qa',
          scheduledTime: new Date(startTime.getTime() + (durationMs * 0.4)),
          duration: 15,
          status: getEventStatus(new Date(startTime.getTime() + (durationMs * 0.4)), 15),
          metadata: { moderationRequired: settings.moderationRequired }
        });
      }

      // Break (if event is longer than 90 minutes)
      if (durationMinutes > 90) {
        events.push({
          id: 'break',
          title: 'Break',
          description: 'Short intermission',
          type: 'break',
          scheduledTime: new Date(startTime.getTime() + (durationMs * 0.6)),
          duration: 10,
          status: getEventStatus(new Date(startTime.getTime() + (durationMs * 0.6)), 10),
          metadata: {}
        });
      }

      // Content segments
      events.push({
        id: 'main-content-1',
        title: 'Main Content - Part 1',
        description: 'Primary event content delivery',
        type: 'content',
        scheduledTime: new Date(startTime.getTime() + 15 * 60 * 1000), // 15 min after start
        duration: Math.floor(durationMinutes * 0.3),
        status: getEventStatus(new Date(startTime.getTime() + 15 * 60 * 1000), Math.floor(durationMinutes * 0.3)),
        metadata: { contentType: 'presentation' }
      });

      events.push({
        id: 'main-content-2',
        title: 'Main Content - Part 2',
        description: 'Secondary event content delivery',
        type: 'content',
        scheduledTime: new Date(startTime.getTime() + (durationMs * 0.65)),
        duration: Math.floor(durationMinutes * 0.25),
        status: getEventStatus(new Date(startTime.getTime() + (durationMs * 0.65)), Math.floor(durationMinutes * 0.25)),
        metadata: { contentType: 'interactive' }
      });

      // Closing
      events.push({
        id: 'closing',
        title: 'Closing Remarks',
        description: 'Event wrap-up and next steps',
        type: 'announcement',
        scheduledTime: new Date(endTime.getTime() - 10 * 60 * 1000), // 10 min before end
        duration: 10,
        status: getEventStatus(new Date(endTime.getTime() - 10 * 60 * 1000), 10),
        metadata: { priority: 'high' }
      });

      // Sort events by scheduled time
      return events.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
    };

    setTimelineEvents(generateTimelineEvents());
  }, [event]);

  // Function to determine event status based on current time
  function getEventStatus(scheduledTime: Date, duration: number = 0): 'upcoming' | 'active' | 'completed' {
    const now = currentTime.getTime();
    const eventStart = scheduledTime.getTime();
    const eventEnd = eventStart + (duration * 60 * 1000);

    if (now < eventStart) return 'upcoming';
    if (now >= eventStart && now <= eventEnd) return 'active';
    return 'completed';
  }

  // Update event statuses based on current time
  useEffect(() => {
    setTimelineEvents(prev => 
      prev.map(evt => ({
        ...evt,
        status: getEventStatus(evt.scheduledTime, evt.duration)
      }))
    );
  }, [currentTime]);

  // Get progress percentage through the entire event
  const getEventProgress = () => {
    const startTime = new Date(event.startTime).getTime();
    const endTime = new Date(event.endTime).getTime();
    const now = currentTime.getTime();
    
    if (now < startTime) return 0;
    if (now > endTime) return 100;
    
    return Math.min(Math.max((now - startTime) / (endTime - startTime) * 100, 0), 100);
  };

  const eventProgress = getEventProgress();
  const activeEvent = timelineEvents.find(evt => evt.status === 'active');
  const nextEvent = timelineEvents.find(evt => evt.status === 'upcoming');

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'poll': return '📊';
      case 'qa': return '❓';
      case 'content': return '📚';
      case 'break': return '☕';
      case 'announcement': return '📢';
      default: return '📅';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'poll': return { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' };
      case 'qa': return { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400' };
      case 'content': return { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' };
      case 'break': return { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400' };
      case 'announcement': return { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' };
      default: return { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Event Timeline</h2>
          <p className="text-white/60">
            Live progress and scheduled activities
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant={autoProgress ? "default" : "outline"}
            onClick={() => setAutoProgress(!autoProgress)}
            className="text-xs"
          >
            <span className={`w-2 h-2 rounded-full mr-2 ${autoProgress ? 'bg-green-400' : 'bg-gray-400'}`}></span>
            {autoProgress ? 'Auto' : 'Manual'}
          </Button>
          
          <div className="text-right">
            <div className="text-white text-sm font-medium">
              {formatTime(currentTime)}
            </div>
            <div className="text-white/60 text-xs">
              Current Time
            </div>
          </div>
        </div>
      </div>

      {/* Overall event progress */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-medium">Event Progress</h3>
              <p className="text-white/60 text-sm">
                {formatTime(new Date(event.startTime))} - {formatTime(new Date(event.endTime))}
              </p>
            </div>
            <div className="text-right">
              <div className="text-white text-lg font-bold">{eventProgress.toFixed(1)}%</div>
              <div className="text-white/60 text-xs">Complete</div>
            </div>
          </div>
          
          <div className="w-full bg-white/10 rounded-full h-3">
            <div 
              className="h-3 rounded-full transition-all duration-1000"
              style={{ 
                backgroundColor: theme.colors.primary,
                width: `${eventProgress}%`
              }}
            />
          </div>
          
          {/* Current status */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <div>
              {activeEvent ? (
                <span className="text-green-400">
                  🟢 Currently: {activeEvent.title}
                </span>
              ) : nextEvent ? (
                <span className="text-blue-400">
                  ⏳ Next: {nextEvent.title} at {formatTime(nextEvent.scheduledTime)}
                </span>
              ) : (
                <span className="text-white/60">
                  {eventProgress === 100 ? '✅ Event Completed' : '⏸️ No Active Items'}
                </span>
              )}
            </div>
            
            {event.isActive && (
              <span className="text-green-400 text-xs">🔴 LIVE</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline list */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-medium text-white">Scheduled Activities</h3>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-white/20"></div>
            
            {timelineEvents.map((evt, index) => {
              const colors = getEventTypeColor(evt.type);
              
              return (
                <div
                  key={evt.id}
                  className={`relative flex items-start gap-4 pb-6 cursor-pointer transition-all hover:bg-white/5 rounded-lg p-2 -ml-2 ${
                    selectedEvent?.id === evt.id ? 'bg-white/10' : ''
                  }`}
                  onClick={() => setSelectedEvent(evt)}
                >
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-2 ${
                    evt.status === 'active' 
                      ? 'bg-green-500/20 border-green-500/50 animate-pulse' 
                      : evt.status === 'completed'
                      ? 'bg-green-500/20 border-green-500/30'
                      : `${colors.bg} ${colors.border}`
                  }`}>
                    <span className="text-xl">{getEventTypeIcon(evt.type)}</span>
                  </div>
                  
                  {/* Event details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-medium ${
                        evt.status === 'active' ? 'text-green-400' : 'text-white'
                      }`}>
                        {evt.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full border ${
                          evt.status === 'active' 
                            ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                            : evt.status === 'completed'
                            ? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}>
                          {evt.status === 'active' ? '🟢 Active' : evt.status === 'completed' ? '✅ Done' : '⏳ Upcoming'}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-white/60 text-sm mb-2 line-clamp-2">
                      {evt.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-white/50">
                      <span>🕒 {formatTime(evt.scheduledTime)}</span>
                      {evt.duration && <span>⏱️ {formatDuration(evt.duration)}</span>}
                      <span className={colors.text}>
                        {evt.type.charAt(0).toUpperCase() + evt.type.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected event details */}
        <div className="lg:sticky lg:top-4">
          {selectedEvent ? (
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <span>{getEventTypeIcon(selectedEvent.type)}</span>
                  {selectedEvent.title}
                </CardTitle>
                <div className="text-white/60 text-sm">
                  {formatTime(selectedEvent.scheduledTime)}
                  {selectedEvent.duration && ` • ${formatDuration(selectedEvent.duration)}`}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-white/80">{selectedEvent.description}</p>
                
                {/* Event-specific actions */}
                {selectedEvent.type === 'poll' && (
                  <div className="space-y-2">
                    <h5 className="text-white font-medium">Poll Details</h5>
                    <div className="text-white/60 text-sm">
                      Type: {selectedEvent.metadata?.pollType || 'General'}
                    </div>
                    {selectedEvent.status === 'active' && (
                      <Button
                        size="sm"
                        style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
                        className="w-full"
                      >
                        Go to Live Poll
                      </Button>
                    )}
                  </div>
                )}
                
                {selectedEvent.type === 'qa' && (
                  <div className="space-y-2">
                    <h5 className="text-white font-medium">Q&A Session</h5>
                    <div className="text-white/60 text-sm">
                      Moderation: {selectedEvent.metadata?.moderationRequired ? 'Required' : 'Open'}
                    </div>
                    {selectedEvent.status === 'active' && (
                      <Button
                        size="sm"
                        style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
                        className="w-full"
                      >
                        Join Q&A
                      </Button>
                    )}
                  </div>
                )}
                
                {selectedEvent.type === 'content' && (
                  <div className="space-y-2">
                    <h5 className="text-white font-medium">Content Segment</h5>
                    <div className="text-white/60 text-sm">
                      Type: {selectedEvent.metadata?.contentType || 'General'}
                    </div>
                  </div>
                )}
                
                {/* Status indicator */}
                <div className={`p-3 rounded-lg border ${
                  selectedEvent.status === 'active' 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : selectedEvent.status === 'completed'
                    ? 'bg-gray-500/10 border-gray-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
                }`}>
                  <div className={`text-sm font-medium ${
                    selectedEvent.status === 'active' ? 'text-green-400' : 
                    selectedEvent.status === 'completed' ? 'text-gray-400' : 'text-blue-400'
                  }`}>
                    {selectedEvent.status === 'active' ? '🟢 Currently Active' : 
                     selectedEvent.status === 'completed' ? '✅ Completed' : '⏳ Upcoming'}
                  </div>
                  <div className="text-white/60 text-xs mt-1">
                    {selectedEvent.status === 'upcoming' && (
                      <>Starts in {Math.ceil((selectedEvent.scheduledTime.getTime() - currentTime.getTime()) / (1000 * 60))} minutes</>
                    )}
                    {selectedEvent.status === 'active' && selectedEvent.duration && (
                      <>Ends in {Math.ceil((selectedEvent.scheduledTime.getTime() + selectedEvent.duration * 60 * 1000 - currentTime.getTime()) / (1000 * 60))} minutes</>
                    )}
                    {selectedEvent.status === 'completed' && (
                      <>Completed {Math.ceil((currentTime.getTime() - selectedEvent.scheduledTime.getTime()) / (1000 * 60))} minutes ago</>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-4">⏰</div>
                <h3 className="text-lg font-semibold mb-2 text-white">Event Timeline</h3>
                <p className="text-white/60">Select an activity from the timeline to view details and take action.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}