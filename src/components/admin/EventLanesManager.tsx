'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Info, Zap, Gift, Eye, Save } from 'lucide-react';
import { surfaces, components, borders, typography, pills, focus } from '@/lib/admin/designTokens';

interface EventLane {
  id?: string;
  eventId: string;
  laneKey: string;
  title: string;
  description?: string;
  iconName?: string;
  order: number;
  isActive: boolean;
  cardCount?: number;
}

interface EventLanesManagerProps {
  eventId?: string;
  onSave?: () => void;
}

const LANE_PRESETS = [
  {
    laneKey: 'info',
    title: 'Info',
    description: 'Event information, schedules, and announcements',
    iconName: 'Info',
    icon: Info,
  },
  {
    laneKey: 'interact',
    title: 'Interact',
    description: 'Live polls, Q&A, and audience engagement',
    iconName: 'Zap',
    icon: Zap,
  },
  {
    laneKey: 'rewards',
    title: 'Rewards',
    description: 'Collectibles, achievements, and prizes',
    iconName: 'Gift',
    icon: Gift,
  },
];

export function EventLanesManager({ eventId, onSave }: EventLanesManagerProps) {
  const [lanes, setLanes] = useState<EventLane[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (eventId) {
      fetchLanes();
    } else {
      // Initialize with default lanes if no event ID yet
      setLanes(
        LANE_PRESETS.map((preset, index) => ({
          eventId: 'new',
          laneKey: preset.laneKey,
          title: preset.title,
          description: preset.description,
          iconName: preset.iconName,
          order: index,
          isActive: true,
        }))
      );
      setLoading(false);
    }
  }, [eventId]);

  const fetchLanes = async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/events/${eventId}/lanes`);
      if (response.ok) {
        const data = await response.json();
        if (data.lanes && data.lanes.length > 0) {
          setLanes(data.lanes);
        } else {
          // Initialize with presets if no lanes exist
          setLanes(
            LANE_PRESETS.map((preset, index) => ({
              eventId,
              laneKey: preset.laneKey,
              title: preset.title,
              description: preset.description,
              iconName: preset.iconName,
              order: index,
              isActive: true,
            }))
          );
        }
      }
    } catch (error) {
      console.error('Error fetching lanes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!eventId || eventId === 'new') {
      if (onSave) onSave();
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/events/${eventId}/lanes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lanes }),
      });

      if (response.ok) {
        if (onSave) onSave();
        fetchLanes(); // Refresh to get IDs
      } else {
        alert('Failed to save lanes');
      }
    } catch (error) {
      console.error('Error saving lanes:', error);
      alert('Failed to save lanes');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLane = (index: number, updates: Partial<EventLane>) => {
    const newLanes = [...lanes];
    newLanes[index] = { ...newLanes[index], ...updates };
    setLanes(newLanes);
  };

  const handleDeleteLane = (index: number) => {
    if (!confirm('Delete this lane? All assigned cards will be unassigned.')) return;
    setLanes(lanes.filter((_, i) => i !== index));
  };

  const handleAddLane = () => {
    const newLane: EventLane = {
      eventId: eventId || 'new',
      laneKey: `custom_${Date.now()}`,
      title: 'New Lane',
      description: '',
      iconName: 'Folder',
      order: lanes.length,
      isActive: true,
    };
    setLanes([...lanes, newLane]);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newLanes = [...lanes];
    const draggedLane = newLanes[draggedIndex];
    newLanes.splice(draggedIndex, 1);
    newLanes.splice(index, 0, draggedLane);

    // Update order
    newLanes.forEach((lane, i) => {
      lane.order = i;
    });

    setLanes(newLanes);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleManageCards = (lane: EventLane) => {
    // Navigate to card assignment interface
    window.open(`/admin/events/${eventId}/lanes/${lane.id}/cards`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={typography.h3}>Event Lanes</h3>
          <p className="text-slate-400 text-sm mt-1">
            Organize content into lanes (Info, Interact, Rewards). Drag to reorder.
          </p>
        </div>
        <div className="flex gap-3">
          {eventId && eventId !== 'new' && (
            <button
              onClick={() => window.open(`/admin/events/${eventId}/live`, '_blank')}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium flex items-center gap-2 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Go Live
            </button>
          )}
          <button onClick={handleAddLane} className={components.buttonSecondary}>
            <Plus className="w-4 h-4" />
            Add Lane
          </button>
          <button onClick={handleSave} disabled={saving} className={components.buttonPrimary}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Lanes'}
          </button>
        </div>
      </div>

      {lanes.length === 0 ? (
        <div className={`${components.card} text-center py-12`}>
          <Info className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <div className={typography.h3}>No lanes configured</div>
          <p className="text-slate-400 mt-2 mb-4">Add lanes to organize your event content</p>
          <button onClick={handleAddLane} className={components.buttonPrimary}>
            <Plus className="w-4 h-4" />
            Add First Lane
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {lanes.map((lane, index) => {
            const preset = LANE_PRESETS.find((p) => p.laneKey === lane.laneKey);
            const Icon = preset?.icon || Info;

            return (
              <div
                key={lane.id || index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-4 transition-all ${
                  draggedIndex === index ? 'opacity-50' : 'opacity-100'
                } hover:border-fuchsia-500/30 cursor-move`}
              >
                <div className="flex items-start gap-4">
                  {/* Drag Handle */}
                  <div className="pt-2 text-slate-500 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Icon */}
                  <div className={`${pills.base} p-3 bg-fuchsia-600/20 text-fuchsia-400 mt-1`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
                        <input
                          type="text"
                          value={lane.title}
                          onChange={(e) => handleUpdateLane(index, { title: e.target.value })}
                          className={`${components.input} w-full`}
                          placeholder="Lane title"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Key</label>
                        <input
                          type="text"
                          value={lane.laneKey}
                          onChange={(e) => handleUpdateLane(index, { laneKey: e.target.value })}
                          className={`${components.input} w-full`}
                          placeholder="lane_key"
                          disabled={preset !== undefined}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                      <textarea
                        value={lane.description || ''}
                        onChange={(e) => handleUpdateLane(index, { description: e.target.value })}
                        className={`${components.input} w-full`}
                        rows={2}
                        placeholder="Describe this lane's purpose..."
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={lane.isActive}
                            onChange={(e) => handleUpdateLane(index, { isActive: e.target.checked })}
                            className={focus.ring}
                          />
                          <span className="text-sm text-slate-300">Active</span>
                        </label>

                        {lane.cardCount !== undefined && (
                          <span className="text-sm text-slate-400">
                            {lane.cardCount} {lane.cardCount === 1 ? 'card' : 'cards'}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {lane.id && (
                          <button
                            onClick={() => handleManageCards(lane)}
                            className={`${components.buttonSecondary} text-sm`}
                          >
                            <Eye className="w-4 h-4" />
                            Manage Cards
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteLane(index)}
                          className={`${pills.base} p-2 ${surfaces.darkGlass} ${borders.glassBorder} text-red-400 hover:text-red-300`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preset Suggestions */}
      {lanes.length > 0 && lanes.length < 3 && (
        <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-4`}>
          <p className="text-sm font-medium text-slate-300 mb-3">Suggested Lanes:</p>
          <div className="flex flex-wrap gap-2">
            {LANE_PRESETS.filter((preset) => !lanes.some((l) => l.laneKey === preset.laneKey)).map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.laneKey}
                  onClick={() => {
                    const newLane: EventLane = {
                      eventId: eventId || 'new',
                      laneKey: preset.laneKey,
                      title: preset.title,
                      description: preset.description,
                      iconName: preset.iconName,
                      order: lanes.length,
                      isActive: true,
                    };
                    setLanes([...lanes, newLane]);
                  }}
                  className={`${pills.base} px-4 py-2 ${surfaces.darkGlass} hover:bg-fuchsia-600/20 transition-colors flex items-center gap-2`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{preset.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
