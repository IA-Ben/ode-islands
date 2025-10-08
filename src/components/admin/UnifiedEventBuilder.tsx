'use client';

import { useState, useEffect } from 'react';
import { Calendar, MapPin, Settings, Eye, Save, ArrowLeft, BookOpen, Zap, Award } from 'lucide-react';
import { surfaces, colors, components } from '@/lib/admin/designTokens';
import { ContentStatusManager } from '../cms/ContentStatusManager';

interface Event {
  id?: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  venueName?: string;
  venueAddress?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  settings?: any;
}

type Tab = 'details' | 'before' | 'during' | 'after' | 'settings';

interface UnifiedEventBuilderProps {
  eventId?: string;
  onSave?: (event: Event) => void;
  onCancel?: () => void;
}

export function UnifiedEventBuilder({ eventId, onSave, onCancel }: UnifiedEventBuilderProps) {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [event, setEvent] = useState<Event>({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    isActive: false,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEvent(data);
      }
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = eventId ? `/api/admin/events/${eventId}` : '/api/admin/events';
      const method = eventId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        const savedEvent = await response.json();
        if (onSave) {
          onSave(savedEvent);
        }
      } else {
        throw new Error('Failed to save event');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'details' as Tab, label: 'Event Details', icon: Calendar },
    { id: 'before' as Tab, label: 'Before Experience', icon: BookOpen },
    { id: 'during' as Tab, label: 'During Event', icon: Zap },
    { id: 'after' as Tab, label: 'After Experience', icon: Award },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className={`${surfaces.darkGlass} border-b border-slate-700/50 sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="p-2 hover:bg-white/5 rounded-lg transition"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {eventId ? 'Edit Event' : 'Create New Event'}
                </h1>
                <p className="text-sm text-slate-400">
                  {event.title || 'Untitled Event'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className={components.buttonSecondary}>
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`${components.buttonPrimary} disabled:opacity-50`}
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : 'Save Event'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-fuchsia-600 text-white'
                      : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className={`${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50`}>
              <h2 className="text-xl font-semibold text-white mb-6">Basic Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={event.title}
                    onChange={(e) => setEvent({ ...event, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                    placeholder="Enter event name..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={event.description}
                    onChange={(e) => setEvent({ ...event, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                    placeholder="Describe your event..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Start Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={event.startTime}
                      onChange={(e) => setEvent({ ...event, startTime: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      End Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={event.endTime}
                      onChange={(e) => setEvent({ ...event, endTime: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={`${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50`}>
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Venue Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Venue Name
                  </label>
                  <input
                    type="text"
                    value={event.venueName || ''}
                    onChange={(e) => setEvent({ ...event, venueName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                    placeholder="e.g., Madison Square Garden"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Address
                  </label>
                  <textarea
                    value={event.venueAddress || ''}
                    onChange={(e) => setEvent({ ...event, venueAddress: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                    placeholder="Full venue address..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={event.venueLatitude || ''}
                      onChange={(e) => setEvent({ ...event, venueLatitude: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                      placeholder="40.7128"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={event.venueLongitude || ''}
                      onChange={(e) => setEvent({ ...event, venueLongitude: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                      placeholder="-74.0060"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'before' && (
          <div className={`${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50`}>
            <h2 className="text-xl font-semibold text-white mb-4">Before Experience</h2>
            <p className="text-slate-400 mb-6">
              Configure the pre-event story, chapters, and content that users explore before the event.
            </p>
            <div className="space-y-4">
              <button className={components.buttonPrimary}>
                <BookOpen className="w-4 h-4" />
                Open Story Builder
              </button>
              <p className="text-sm text-slate-500">
                This will open the visual story builder to create interactive narratives.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'during' && (
          <div className={`${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50`}>
            <h2 className="text-xl font-semibold text-white mb-4">During Event Experience</h2>
            <p className="text-slate-400 mb-6">
              Manage real-time event features, lanes, and live interactions.
            </p>
            <p className="text-sm text-slate-500">Event lane configuration coming soon...</p>
          </div>
        )}

        {activeTab === 'after' && (
          <div className={`${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50`}>
            <h2 className="text-xl font-semibold text-white mb-4">After Experience</h2>
            <p className="text-slate-400 mb-6">
              Configure post-event content, memories, and recap features.
            </p>
            <p className="text-sm text-slate-500">After experience configuration coming soon...</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className={`${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50`}>
              <h2 className="text-xl font-semibold text-white mb-6">Event Status</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Active Status</p>
                  <p className="text-sm text-slate-400">
                    {event.isActive ? 'Event is live and visible to users' : 'Event is inactive'}
                  </p>
                </div>
                <button
                  onClick={() => setEvent({ ...event, isActive: !event.isActive })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    event.isActive ? 'bg-fuchsia-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      event.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
