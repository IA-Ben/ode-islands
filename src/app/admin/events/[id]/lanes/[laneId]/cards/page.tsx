'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Search, X, Clock, ArrowLeft, Save, Eye, Calendar } from 'lucide-react';
import { surfaces, components, borders, typography, pills, focus, spacing } from '@/lib/admin/designTokens';

interface Card {
  id: string;
  title: string;
  subtitle?: string;
  type: string;
  imageMediaId?: string;
  scope: string;
  publishStatus: string;
  createdAt: string;
}

interface CardAssignment {
  id?: string;
  cardId: string;
  order: number;
  visibilityStartAt?: string;
  visibilityEndAt?: string;
  status: 'active' | 'inactive' | 'scheduled';
  card?: Card;
}

interface Lane {
  id: string;
  title: string;
  laneKey: string;
  description?: string;
}

export default function LaneCardsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const laneId = params.laneId as string;

  const [lane, setLane] = useState<Lane | null>(null);
  const [assignments, setAssignments] = useState<CardAssignment[]>([]);
  const [availableCards, setAvailableCards] = useState<Card[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLaneData();
  }, [laneId]);

  const fetchLaneData = async () => {
    try {
      setLoading(true);

      // Fetch lane details
      const laneResponse = await fetch(`/api/admin/events/${eventId}/lanes/${laneId}`);
      if (laneResponse.ok) {
        const laneData = await laneResponse.json();
        setLane(laneData.lane);
      }

      // Fetch current assignments
      const assignmentsResponse = await fetch(`/api/admin/events/${eventId}/lanes/${laneId}/cards`);
      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        setAssignments(assignmentsData.assignments || []);
      }

      // Fetch available cards
      const cardsResponse = await fetch(`/api/admin/cards?scope=event&publishStatus=published`);
      if (cardsResponse.ok) {
        const cardsData = await cardsResponse.json();
        setAvailableCards(cardsData.cards || []);
      }
    } catch (error) {
      console.error('Error fetching lane data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = (card: Card) => {
    const newAssignment: CardAssignment = {
      cardId: card.id,
      order: assignments.length,
      status: 'active',
      card,
    };
    setAssignments([...assignments, newAssignment]);
    setShowAddModal(false);
  };

  const handleRemoveCard = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newAssignments = [...assignments];
    const [moved] = newAssignments.splice(fromIndex, 1);
    newAssignments.splice(toIndex, 0, moved);

    // Update order
    newAssignments.forEach((assignment, index) => {
      assignment.order = index;
    });

    setAssignments(newAssignments);
  };

  const handleUpdateAssignment = (index: number, updates: Partial<CardAssignment>) => {
    const newAssignments = [...assignments];
    newAssignments[index] = { ...newAssignments[index], ...updates };
    setAssignments(newAssignments);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/events/${eventId}/lanes/${laneId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });

      if (response.ok) {
        alert('Cards saved successfully!');
        fetchLaneData(); // Refresh to get IDs
      } else {
        alert('Failed to save cards');
      }
    } catch (error) {
      console.error('Error saving cards:', error);
      alert('Failed to save cards');
    } finally {
      setSaving(false);
    }
  };

  const filteredAvailableCards = availableCards.filter(
    (card) =>
      !assignments.some((a) => a.cardId === card.id) &&
      (searchQuery === '' ||
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className={`${pills.base} p-2 ${surfaces.darkGlass} ${borders.glassBorder} hover:bg-slate-800/80`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className={typography.h1}>
                {lane?.title} Lane - Manage Cards
              </h1>
              <p className="text-slate-400 mt-1">
                Add and order cards for this event lane
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className={components.buttonSecondary}
            >
              <Plus className="w-4 h-4" />
              Add Card
            </button>
            <button onClick={handleSave} disabled={saving} className={components.buttonPrimary}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Assigned Cards */}
        <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6`}>
          <h3 className={typography.h3}>Assigned Cards ({assignments.length})</h3>
          <p className="text-slate-400 text-sm mt-1 mb-4">
            Drag to reorder. Cards appear in this order for users.
          </p>

          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-400">No cards assigned yet</p>
              <button
                onClick={() => setShowAddModal(true)}
                className={`${components.buttonPrimary} mt-4`}
              >
                <Plus className="w-4 h-4" />
                Add First Card
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment, index) => (
                <CardAssignmentRow
                  key={assignment.id || index}
                  assignment={assignment}
                  index={index}
                  onUpdate={(updates) => handleUpdateAssignment(index, updates)}
                  onRemove={() => handleRemoveCard(index)}
                  onMoveUp={index > 0 ? () => handleReorder(index, index - 1) : undefined}
                  onMoveDown={index < assignments.length - 1 ? () => handleReorder(index, index + 1) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add Card Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`${surfaces.overlayGlass} ${borders.glassBorder} ${borders.radius.xl} p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={typography.h2}>Add Card to Lane</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className={`${pills.base} p-2 ${surfaces.darkGlass} hover:bg-slate-800/80`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search cards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${components.input} pl-10 w-full`}
                />
              </div>

              {/* Available Cards */}
              <div className="space-y-2">
                {filteredAvailableCards.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">No available cards found</p>
                ) : (
                  filteredAvailableCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => handleAddCard(card)}
                      className={`${surfaces.cardGlass} ${borders.glassBorder} p-4 w-full text-left hover:border-fuchsia-500/50 transition-all`}
                    >
                      <h4 className="text-white font-medium">{card.title}</h4>
                      {card.subtitle && (
                        <p className="text-slate-400 text-sm mt-1">{card.subtitle}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-500">{card.type}</span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-500">{card.scope}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface CardAssignmentRowProps {
  assignment: CardAssignment;
  index: number;
  onUpdate: (updates: Partial<CardAssignment>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function CardAssignmentRow({
  assignment,
  index,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: CardAssignmentRowProps) {
  return (
    <div className={`${surfaces.cardGlass} ${borders.glassBorder} p-4`}>
      <div className="flex items-start gap-4">
        {/* Order Controls */}
        <div className="flex flex-col gap-1">
          <button
            onClick={onMoveUp}
            disabled={!onMoveUp}
            className={`${pills.base} p-1 ${surfaces.darkGlass} disabled:opacity-30`}
          >
            ▲
          </button>
          <div className="text-center text-sm text-slate-400 font-mono">{index + 1}</div>
          <button
            onClick={onMoveDown}
            disabled={!onMoveDown}
            className={`${pills.base} p-1 ${surfaces.darkGlass} disabled:opacity-30`}
          >
            ▼
          </button>
        </div>

        {/* Card Info */}
        <div className="flex-1">
          <h4 className="text-white font-medium">{assignment.card?.title}</h4>
          {assignment.card?.subtitle && (
            <p className="text-slate-400 text-sm mt-1">{assignment.card.subtitle}</p>
          )}

          {/* Visibility Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Status</label>
              <select
                value={assignment.status}
                onChange={(e) => onUpdate({ status: e.target.value as CardAssignment['status'] })}
                className={`${components.input} w-full text-sm`}
              >
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Show From</label>
              <input
                type="datetime-local"
                value={assignment.visibilityStartAt || ''}
                onChange={(e) => onUpdate({ visibilityStartAt: e.target.value || undefined })}
                className={`${components.input} w-full text-sm`}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Show Until</label>
              <input
                type="datetime-local"
                value={assignment.visibilityEndAt || ''}
                onChange={(e) => onUpdate({ visibilityEndAt: e.target.value || undefined })}
                className={`${components.input} w-full text-sm`}
              />
            </div>
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className={`${pills.base} p-2 ${surfaces.darkGlass} text-red-400 hover:text-red-300`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
