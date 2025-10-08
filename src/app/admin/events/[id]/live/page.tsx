'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Zap, Send, BarChart3, MessageSquare, Eye, Radio, AlertCircle } from 'lucide-react';
import { surfaces, components, borders, typography, pills } from '@/lib/admin/designTokens';

interface LiveEvent {
  id: string;
  title: string;
  isActive: boolean;
  startTime: string;
  endTime: string;
}

export default function LiveEventControlPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<LiveEvent | null>(null);
  const [activeTab, setActiveTab] = useState<'publish' | 'polls' | 'qa' | 'analytics'>('publish');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEvent(data);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEvent = async () => {
    if (!event) return;

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !event.isActive }),
      });

      if (response.ok) {
        fetchEvent();
      }
    } catch (error) {
      console.error('Error toggling event:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isLive = event?.isActive && new Date(event.startTime) <= new Date() && new Date() <= new Date(event.endTime);

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={typography.h1}>{event?.title} - Live Control</h1>
            <p className="text-slate-400 mt-1">Real-time event management and publishing</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Event Status */}
            {isLive ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-green-400 font-medium">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-500/20 border border-slate-500/30 rounded-full">
                <Radio className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400 font-medium">Offline</span>
              </div>
            )}

            {/* Toggle Event */}
            <button
              onClick={handleToggleEvent}
              className={event?.isActive ? components.buttonSecondary : components.buttonPrimary}
            >
              {event?.isActive ? 'End Event' : 'Start Event'}
            </button>
          </div>
        </div>

        {/* Warning if event not active */}
        {!event?.isActive && (
          <div className={`${surfaces.cardGlass} ${borders.glassBorder} border-l-4 border-l-yellow-500 p-4 mb-6`}>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <h4 className="text-yellow-400 font-medium">Event is not active</h4>
                <p className="text-slate-400 text-sm mt-1">
                  Users cannot see this event content. Click "Start Event" to go live.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'publish', label: 'Publish Cards', icon: Send },
            { id: 'polls', label: 'Live Polls', icon: BarChart3 },
            { id: 'qa', label: 'Q&A', icon: MessageSquare },
            { id: 'analytics', label: 'Analytics', icon: Eye },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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

        {/* Content */}
        {activeTab === 'publish' && <PublishCardsPanel eventId={eventId} />}
        {activeTab === 'polls' && <LivePollsPanel eventId={eventId} />}
        {activeTab === 'qa' && <QAPanel eventId={eventId} />}
        {activeTab === 'analytics' && <AnalyticsPanel eventId={eventId} />}
      </div>
    </div>
  );
}

// Publish Cards Panel
function PublishCardsPanel({ eventId }: { eventId: string }) {
  const [lanes, setLanes] = useState<any[]>([]);
  const [selectedLane, setSelectedLane] = useState<string>('');
  const [cards, setCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchLanes();
  }, [eventId]);

  useEffect(() => {
    if (selectedLane) {
      fetchLaneCards();
    }
  }, [selectedLane]);

  const fetchLanes = async () => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/lanes`);
      if (response.ok) {
        const data = await response.json();
        setLanes(data.lanes || []);
        if (data.lanes && data.lanes.length > 0) {
          setSelectedLane(data.lanes[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching lanes:', error);
    }
  };

  const fetchLaneCards = async () => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/lanes/${selectedLane}/cards`);
      if (response.ok) {
        const data = await response.json();
        setCards(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  const handlePublishCard = async () => {
    if (!selectedCard) return;

    try {
      setPublishing(true);
      const response = await fetch(`/api/admin/events/${eventId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: selectedCard,
          laneId: selectedLane,
          action: 'publish',
        }),
      });

      if (response.ok) {
        alert('Card published successfully!');
        setSelectedCard('');
      } else {
        alert('Failed to publish card');
      }
    } catch (error) {
      console.error('Error publishing card:', error);
      alert('Failed to publish card');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Quick Publish */}
      <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6`}>
        <h3 className={typography.h3}>Quick Publish</h3>
        <p className="text-slate-400 text-sm mt-1 mb-4">
          Instantly publish a card to a lane
        </p>

        <div className="space-y-4">
          {/* Lane Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Select Lane</label>
            <select
              value={selectedLane}
              onChange={(e) => setSelectedLane(e.target.value)}
              className={components.input}
            >
              {lanes.map((lane) => (
                <option key={lane.id} value={lane.id}>
                  {lane.title}
                </option>
              ))}
            </select>
          </div>

          {/* Card Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Select Card</label>
            <select
              value={selectedCard}
              onChange={(e) => setSelectedCard(e.target.value)}
              className={components.input}
            >
              <option value="">-- Choose a card --</option>
              {cards.map((assignment) => (
                <option key={assignment.id} value={assignment.cardId}>
                  {assignment.card?.title || assignment.cardId}
                </option>
              ))}
            </select>
          </div>

          {/* Publish Button */}
          <button
            onClick={handlePublishCard}
            disabled={!selectedCard || publishing}
            className={`${components.buttonPrimary} w-full`}
          >
            <Send className="w-4 h-4" />
            {publishing ? 'Publishing...' : 'Publish Now'}
          </button>
        </div>
      </div>

      {/* Right: Recently Published */}
      <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6`}>
        <h3 className={typography.h3}>Recently Published</h3>
        <p className="text-slate-400 text-sm mt-1 mb-4">
          Last 10 published cards
        </p>

        <div className="space-y-2">
          <p className="text-slate-500 text-sm">No cards published yet</p>
        </div>
      </div>
    </div>
  );
}

// Live Polls Panel
function LivePollsPanel({ eventId }: { eventId: string }) {
  return (
    <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6`}>
      <h3 className={typography.h3}>Live Polls</h3>
      <p className="text-slate-400 mt-2">Poll management interface coming soon...</p>
    </div>
  );
}

// Q&A Panel
function QAPanel({ eventId }: { eventId: string }) {
  return (
    <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6`}>
      <h3 className={typography.h3}>Q&A Management</h3>
      <p className="text-slate-400 mt-2">Q&A moderation interface coming soon...</p>
    </div>
  );
}

// Analytics Panel
function AnalyticsPanel({ eventId }: { eventId: string }) {
  return (
    <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6`}>
      <h3 className={typography.h3}>Live Analytics</h3>
      <p className="text-slate-400 mt-2">Real-time analytics dashboard coming soon...</p>
    </div>
  );
}
