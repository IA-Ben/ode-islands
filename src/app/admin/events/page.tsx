'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Play, Pause, MapPin, Clock, X, Loader2 } from 'lucide-react';
import { SectionSubNav } from '@/components/admin/SectionSubNav';
import { UnifiedEventBuilder } from '@/components/admin/UnifiedEventBuilder';
import { surfaces, pills, focus, colors, interactive, borders, typography, spacing, layout, components } from '@/lib/admin/designTokens';

interface LiveEvent {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  isActive: boolean;
  settings?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  createdAt: string;
  createdBy?: string | null;
}

type SubNavTab = 'list' | 'create';

export default function EventsPage() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SubNavTab>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [showEventBuilder, setShowEventBuilder] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events', {
        credentials: 'same-origin'
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (event: LiveEvent) => {
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ isActive: !event.isActive }),
      });

      if (response.ok) {
        fetchEvents();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to update event'}`);
      }
    } catch (error) {
      console.error('Error toggling event:', error);
      alert('Failed to update event status');
    }
  };

  const handleDelete = async (event: LiveEvent) => {
    if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (response.ok) {
        fetchEvents();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to delete event'}`);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  const handleEdit = (event: LiveEvent) => {
    setEditingEventId(event.id);
    setShowEventBuilder(true);
  };

  const handleEventSaved = () => {
    setShowEventBuilder(false);
    setEditingEventId(undefined);
    fetchEvents();
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterActive === 'all' ||
      (filterActive === 'active' && event.isActive) ||
      (filterActive === 'inactive' && !event.isActive);

    return matchesSearch && matchesFilter;
  });

  const activeEvents = events.filter(e => e.isActive).length;
  const upcomingEvents = events.filter(e => {
    const startTime = new Date(e.startTime);
    return startTime > new Date() && !e.isActive;
  }).length;

  if (showEventBuilder) {
    return (
      <UnifiedEventBuilder
        eventId={editingEventId}
        onSave={handleEventSaved}
        onCancel={() => {
          setShowEventBuilder(false);
          setEditingEventId(undefined);
        }}
      />
    );
  }

  return (
    <div className={layout.page}>
      {/* Section Sub-Navigation */}
      <SectionSubNav
        items={[
          { id: 'list', label: 'Event List' },
          { id: 'create', label: 'Create Event' },
        ]}
        activeId={activeTab}
        onChange={(id) => {
          setActiveTab(id as SubNavTab);
          if (id === 'create') {
            setShowEventBuilder(true);
            setActiveTab('list');
          }
        }}
      />

      {/* Stats Bar */}
      <div className={`${spacing.container.lg} mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-4`}>
        <div className={components.card}>
          <div className="flex items-center gap-3">
            <div className={`${pills.base} ${spacing.padding.md} ${colors.accent.bg}`}>
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className={typography.label}>Total Events</div>
              <div className={typography.h3}>{events.length}</div>
            </div>
          </div>
        </div>

        <div className={components.card}>
          <div className="flex items-center gap-3">
            <div className={`${pills.base} ${spacing.padding.md} bg-green-600`}>
              <Play className="w-5 h-5" />
            </div>
            <div>
              <div className={typography.label}>Active Now</div>
              <div className={typography.h3}>{activeEvents}</div>
            </div>
          </div>
        </div>

        <div className={components.card}>
          <div className="flex items-center gap-3">
            <div className={`${pills.base} ${spacing.padding.md} bg-blue-600`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className={typography.label}>Upcoming</div>
              <div className={typography.h3}>{upcomingEvents}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className={`${spacing.container.lg} mx-auto px-4 py-4 flex flex-col sm:flex-row gap-3`}>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${components.input} pl-10 w-full`}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterActive('all')}
            className={`${pills.base} px-4 py-2 ${focus.ring} transition-colors ${
              filterActive === 'all' 
                ? 'bg-fuchsia-600/90 text-white backdrop-blur-md' 
                : `${surfaces.darkGlass} text-slate-300 hover:text-white hover:bg-slate-800/80`
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterActive('active')}
            className={`${pills.base} px-4 py-2 ${focus.ring} transition-colors ${
              filterActive === 'active' 
                ? 'bg-fuchsia-600/90 text-white backdrop-blur-md' 
                : `${surfaces.darkGlass} text-slate-300 hover:text-white hover:bg-slate-800/80`
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterActive('inactive')}
            className={`${pills.base} px-4 py-2 ${focus.ring} transition-colors ${
              filterActive === 'inactive' 
                ? 'bg-fuchsia-600/90 text-white backdrop-blur-md' 
                : `${surfaces.darkGlass} text-slate-300 hover:text-white hover:bg-slate-800/80`
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className={`${spacing.container.lg} mx-auto px-4 py-4`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className={`${components.card} text-center py-12`}>
            <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <div className={typography.h3}>No events found</div>
            <p className="text-slate-400 mt-2">
              {searchQuery ? 'Try adjusting your search' : 'Create your first event to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={handleEdit}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// Event Card Component
interface EventCardProps {
  event: LiveEvent;
  onEdit: (event: LiveEvent) => void;
  onToggleActive: (event: LiveEvent) => void;
  onDelete: (event: LiveEvent) => void;
}

function EventCard({ event, onEdit, onToggleActive, onDelete }: EventCardProps) {
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  const now = new Date();
  const isLive = event.isActive && startTime <= now && now <= endTime;
  const isPast = endTime < now;
  const isUpcoming = startTime > now;

  const getStatusBadge = () => {
    if (isLive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live
        </span>
      );
    }
    if (isPast) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-500/20 text-slate-400 text-xs font-medium">
          Ended
        </span>
      );
    }
    if (isUpcoming) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
          Upcoming
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-500/20 text-slate-400 text-xs font-medium">
        Inactive
      </span>
    );
  };

  return (
    <div
      onClick={() => onEdit(event)}
      className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} ${spacing.padding.md} group hover:border-fuchsia-500/30 transition-all cursor-pointer`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className={`${typography.h3} truncate`}>{event.title}</h3>
            {getStatusBadge()}
          </div>

          {event.description && (
            <p className="text-slate-400 text-sm mb-3 line-clamp-2">{event.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>
                {startTime.toLocaleDateString()} {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {event.venueName && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{event.venueName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onToggleActive(event)}
            className={`${pills.base} p-2 ${surfaces.darkGlass} ${borders.glassBorder} hover:bg-slate-800/80 transition-colors ${focus.ring} ${
              event.isActive ? 'text-green-400 hover:text-green-300' : 'text-slate-400 hover:text-slate-300'
            }`}
            title={event.isActive ? 'Deactivate' : 'Activate'}
          >
            {event.isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button
            onClick={() => onDelete(event)}
            className={`${pills.base} p-2 ${surfaces.darkGlass} ${borders.glassBorder} hover:bg-slate-800/80 transition-colors ${focus.ring} text-red-400 hover:text-red-300`}
            title="Delete"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
