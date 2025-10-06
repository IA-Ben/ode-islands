'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Play, Pause, MapPin, Clock, X, Loader2 } from 'lucide-react';
import { SectionSubNav } from '@/components/admin/SectionSubNav';
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

interface EventFormData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  venueName: string;
  venueAddress: string;
  settings: {
    allowPolls: boolean;
    allowQA: boolean;
    allowChat: boolean;
    moderationRequired: boolean;
  };
}

type SubNavTab = 'list' | 'create';

export default function EventsPage() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SubNavTab>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LiveEvent | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    venueName: '',
    venueAddress: '',
    settings: {
      allowPolls: true,
      allowQA: true,
      allowChat: false,
      moderationRequired: true,
    }
  });

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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          startTime: formData.startTime,
          endTime: formData.endTime,
          venueName: formData.venueName,
          venueAddress: formData.venueAddress,
          settings: formData.settings,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchEvents();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to create event'}`);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    } finally {
      setSubmitting(false);
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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      venueName: '',
      venueAddress: '',
      settings: {
        allowPolls: true,
        allowQA: true,
        allowChat: false,
        moderationRequired: true,
      }
    });
    setEditingEvent(null);
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
            setShowCreateModal(true);
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
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`${surfaces.overlayGlass} ${borders.glassBorder} ${borders.radius.xl} ${spacing.padding.lg} max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={typography.h2}>Create New Event</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className={`${pills.base} p-2 ${surfaces.darkGlass} ${borders.glassBorder} hover:bg-slate-800/80 transition-colors ${focus.ring}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-6">
              <div>
                <label className={typography.label}>Event Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`${components.input} w-full mt-1`}
                  placeholder="Enter event title"
                />
              </div>

              <div>
                <label className={typography.label}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`${components.input} w-full mt-1`}
                  rows={3}
                  placeholder="Enter event description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={typography.label}>Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className={`${components.input} w-full mt-1`}
                  />
                </div>

                <div>
                  <label className={typography.label}>End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className={`${components.input} w-full mt-1`}
                  />
                </div>
              </div>

              <div>
                <label className={typography.label}>Venue Name</label>
                <input
                  type="text"
                  value={formData.venueName}
                  onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                  className={`${components.input} w-full mt-1`}
                  placeholder="Enter venue name"
                />
              </div>

              <div>
                <label className={typography.label}>Venue Address</label>
                <input
                  type="text"
                  value={formData.venueAddress}
                  onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
                  className={`${components.input} w-full mt-1`}
                  placeholder="Enter venue address"
                />
              </div>

              <div>
                <label className={`${typography.label} mb-3 block`}>Event Features</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.allowPolls}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: { ...formData.settings, allowPolls: e.target.checked }
                      })}
                      className={focus.ring}
                    />
                    <span className="text-slate-300">Enable Polls</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.allowQA}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: { ...formData.settings, allowQA: e.target.checked }
                      })}
                      className={focus.ring}
                    />
                    <span className="text-slate-300">Enable Q&A</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.allowChat}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: { ...formData.settings, allowChat: e.target.checked }
                      })}
                      className={focus.ring}
                    />
                    <span className="text-slate-300">Enable Live Chat</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.moderationRequired}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: { ...formData.settings, moderationRequired: e.target.checked }
                      })}
                      className={focus.ring}
                    />
                    <span className="text-slate-300">Require Moderation</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className={components.buttonSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`${components.buttonPrimary} flex items-center gap-2`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Event
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Event Card Component
interface EventCardProps {
  event: LiveEvent;
  onToggleActive: (event: LiveEvent) => void;
  onDelete: (event: LiveEvent) => void;
}

function EventCard({ event, onToggleActive, onDelete }: EventCardProps) {
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
    <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} ${spacing.padding.md} group hover:border-fuchsia-500/30 transition-all`}>
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

        <div className="flex items-center gap-2">
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
