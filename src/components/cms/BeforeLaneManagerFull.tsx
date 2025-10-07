'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, GripVertical, X } from 'lucide-react';
import { surfaces, colors, components, borders, focus } from '@/lib/admin/designTokens';
import { CardPicker } from './CardPicker';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BeforeLane {
  id: string;
  eventId: string | null;
  laneKey: string;
  title: string;
  description: string | null;
  iconName: string | null;
  order: number;
  isActive: boolean;
}

interface CardAssignment {
  id: string;
  cardId: string;
  order: number;
  card?: {
    id: string;
    title: string;
    subtitle?: string;
    type: string;
  };
  imageUrl?: string;
}

function SortableCard({ assignment, onRemove }: { assignment: CardAssignment; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: assignment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-4 flex items-center gap-4`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-slate-400" />
      </div>
      
      {assignment.imageUrl && (
        <img
          src={assignment.imageUrl}
          alt={assignment.card?.title}
          className="w-16 h-16 rounded-lg object-cover"
        />
      )}
      
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-white">{assignment.card?.title || 'Unknown Card'}</h4>
        {assignment.card?.subtitle && (
          <p className="text-sm text-slate-400">{assignment.card.subtitle}</p>
        )}
        <span className="text-xs text-slate-500">{assignment.card?.type}</span>
      </div>

      <button
        onClick={onRemove}
        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
      >
        <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
      </button>
    </div>
  );
}

interface BeforeLaneManagerFullProps {
  csrfToken: string;
}

export function BeforeLaneManagerFull({ csrfToken }: BeforeLaneManagerFullProps) {
  const [lanes, setLanes] = useState<BeforeLane[]>([]);
  const [selectedLane, setSelectedLane] = useState<BeforeLane | null>(null);
  const [assignments, setAssignments] = useState<CardAssignment[]>([]);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchLanes();
  }, []);

  useEffect(() => {
    if (selectedLane) {
      fetchLaneCards(selectedLane.id);
    }
  }, [selectedLane]);

  const fetchLanes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/before-lanes');
      if (response.ok) {
        const data = await response.json();
        setLanes(data.lanes || []);
        if (!selectedLane && data.lanes?.length > 0) {
          setSelectedLane(data.lanes[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching lanes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLaneCards = async (laneId: string) => {
    try {
      const response = await fetch(`/api/admin/before-lanes/${laneId}/cards`);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching lane cards:', error);
    }
  };

  const handleAddCard = async (card: any) => {
    if (!selectedLane) return;

    try {
      const response = await fetch(`/api/admin/before-lanes/${selectedLane.id}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          cardId: card.id,
          order: assignments.length,
        }),
      });

      if (response.ok) {
        fetchLaneCards(selectedLane.id);
        setShowCardPicker(false);
      }
    } catch (error) {
      console.error('Error adding card:', error);
    }
  };

  const handleRemoveCard = async (assignmentId: string, cardId: string) => {
    if (!selectedLane) return;

    try {
      const response = await fetch(
        `/api/admin/before-lanes/${selectedLane.id}/cards?cardId=${cardId}`,
        {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      if (response.ok) {
        fetchLaneCards(selectedLane.id);
      }
    } catch (error) {
      console.error('Error removing card:', error);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setAssignments((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (loading) {
    return <div className="text-white">Loading lanes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Before Lane Management</h3>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Lane Selector */}
        <div className="col-span-3 space-y-2">
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Lanes</h4>
          {lanes.map((lane) => (
            <button
              key={lane.id}
              onClick={() => setSelectedLane(lane)}
              className={`w-full p-3 rounded-lg text-left transition-colors ${
                selectedLane?.id === lane.id
                  ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="font-medium">{lane.title}</div>
              <div className="text-xs opacity-75">{lane.laneKey}</div>
            </button>
          ))}
        </div>

        {/* Card Management */}
        <div className="col-span-9 space-y-4">
          {selectedLane ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-white">{selectedLane.title}</h4>
                  <p className="text-sm text-slate-400">{selectedLane.description}</p>
                </div>
                <button
                  onClick={() => setShowCardPicker(true)}
                  className={`${components.buttonPrimary} flex items-center gap-2`}
                >
                  <Plus className="w-4 h-4" />
                  Add Card
                </button>
              </div>

              {assignments.length === 0 ? (
                <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-12 text-center`}>
                  <p className="text-slate-400 mb-4">No cards assigned to this lane</p>
                  <button
                    onClick={() => setShowCardPicker(true)}
                    className={components.buttonPrimary}
                  >
                    Add First Card
                  </button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={assignments.map(a => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {assignments.map((assignment) => (
                        <SortableCard
                          key={assignment.id}
                          assignment={assignment}
                          onRemove={() => handleRemoveCard(assignment.id, assignment.cardId)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </>
          ) : (
            <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-12 text-center`}>
              <p className="text-slate-400">Select a lane to manage its cards</p>
            </div>
          )}
        </div>
      </div>

      {/* Card Picker Modal */}
      {showCardPicker && (
        <CardPicker
          onSelect={handleAddCard}
          onClose={() => setShowCardPicker(false)}
          scope="before"
          excludeIds={assignments.map(a => a.cardId)}
        />
      )}
    </div>
  );
}
