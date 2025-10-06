'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { SectionSubNav } from '@/components/admin/SectionSubNav';
import { CardTile, CardTable, CardViewToggle, type ViewMode } from '@/components/admin/cards';
import { CardEditorDrawer } from '@/components/admin/cards/CardEditorDrawer';
import type { CardData as ComponentCardData } from '@/components/admin/cards/CardTile';
import type { CardData as DrawerCardData } from '@/components/admin/cards/CardEditorDrawer';
import { surfaces, pills, focus, colors, interactive, borders, typography } from '@/lib/admin/designTokens';

interface APICardData {
  id: string;
  scope: 'story' | 'event';
  type: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  content: any;
  imageMediaId: string | null;
  videoMediaId: string | null;
  iconName: string | null;
  size: string | null;
  publishStatus: 'draft' | 'in_review' | 'published' | 'archived';
  publishedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  imageMedia?: {
    id: string;
    publicUrl: string;
    title: string;
  };
  videoMedia?: {
    id: string;
    publicUrl: string;
    title: string;
  };
  assignments: Array<{
    id: string;
    parentType: string;
    parentId: string;
    order: number;
  }>;
  minTier?: string;
  rewardConfig?: any;
}

interface EventLane {
  id: string;
  laneKey: string;
  title: string;
  eventId: string;
}

interface Stats {
  total: number;
  byScope: Record<string, number>;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

type SubNavTab = 'list' | 'filters';

export default function CardsPage() {
  const [cards, setCards] = useState<APICardData[]>([]);
  const [eventLanes, setEventLanes] = useState<EventLane[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    byScope: {},
    byType: {},
    byStatus: {}
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SubNavTab>('list');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingCard, setEditingCard] = useState<DrawerCardData | null>(null);

  const [filters, setFilters] = useState({
    scope: '',
    type: '',
    publishStatus: '',
    lane: '',
    search: ''
  });

  useEffect(() => {
    fetchEventLanes();
    fetchCards();
  }, [filters]);

  const fetchEventLanes = async () => {
    try {
      const response = await fetch('/api/admin/event-lanes', {
        credentials: 'same-origin'
      });
      if (response.ok) {
        const data = await response.json();
        setEventLanes(data.lanes || []);
      }
    } catch (error) {
      console.error('Error fetching event lanes:', error);
    }
  };

  const fetchCards = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.scope) queryParams.set('scope', filters.scope);
      if (filters.type) queryParams.set('type', filters.type);
      if (filters.publishStatus) queryParams.set('publishStatus', filters.publishStatus);
      if (filters.lane) queryParams.set('lane', filters.lane);
      if (filters.search) queryParams.set('search', filters.search);

      const response = await fetch(`/api/admin/cards?${queryParams}`, {
        credentials: 'same-origin'
      });

      if (response.ok) {
        const data = await response.json();
        setCards(data.cards || []);
        setStats(data.stats || { total: 0, byScope: {}, byType: {}, byStatus: {} });
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapAPICardToComponentCard = (card: APICardData): ComponentCardData => {
    const laneAssignment = card.assignments.find(a => a.parentType === 'event_lane');
    const laneKey = laneAssignment ? eventLanes.find(l => l.id === laneAssignment.parentId)?.laneKey : undefined;
    
    let eventLane: 'info' | 'interact' | 'rewards' | undefined;
    if (laneKey === 'info') eventLane = 'info';
    else if (laneKey === 'interact') eventLane = 'interact';
    else if (laneKey === 'rewards') eventLane = 'rewards';

    return {
      id: card.id,
      title: card.title,
      subtitle: card.subtitle || undefined,
      type: card.type,
      scope: card.scope,
      eventLane,
      publishStatus: card.publishStatus,
      minTier: card.minTier,
      updatedAt: card.updatedAt,
      imageMedia: card.imageMedia,
    };
  };

  const mapAPICardToDrawerCard = (card: APICardData): DrawerCardData => {
    return {
      id: card.id,
      scope: card.scope,
      type: card.type,
      title: card.title,
      subtitle: card.subtitle,
      summary: card.summary,
      content: card.content,
      imageMediaId: card.imageMediaId,
      videoMediaId: card.videoMediaId,
      iconName: card.iconName,
      size: card.size,
      publishStatus: card.publishStatus,
      publishedAt: card.publishedAt,
      isActive: card.isActive,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      imageMedia: card.imageMedia,
      videoMedia: card.videoMedia,
      assignments: card.assignments,
      minTier: card.minTier,
      rewardConfig: card.rewardConfig,
    };
  };

  const handleEdit = (card: ComponentCardData) => {
    const apiCard = cards.find(c => c.id === card.id);
    if (apiCard) {
      const mappedCard = mapAPICardToDrawerCard(apiCard);
      setEditingCard(mappedCard);
      setShowDrawer(true);
    }
  };

  const handleDuplicate = (card: ComponentCardData) => {
    const apiCard = cards.find(c => c.id === card.id);
    if (apiCard) {
      const mappedCard = mapAPICardToDrawerCard(apiCard);
      setEditingCard({
        ...mappedCard,
        id: '',
        title: `${mappedCard.title} (Copy)`,
        publishStatus: 'draft',
      });
      setShowDrawer(true);
    }
  };

  const handleArchive = async (card: ComponentCardData) => {
    if (!confirm(`Archive "${card.title}"?`)) return;

    try {
      const response = await fetch(`/api/admin/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishStatus: 'archived' }),
        credentials: 'same-origin',
      });

      if (response.ok) {
        alert('Card archived!');
        fetchCards();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to archive card'}`);
      }
    } catch (error) {
      console.error('Error archiving card:', error);
      alert('Failed to archive card');
    }
  };

  const handleSave = async (cardData: Partial<DrawerCardData>) => {
    try {
      let parsedContent = cardData.content || {};
      if (typeof cardData.content === 'string') {
        try {
          parsedContent = JSON.parse(cardData.content);
        } catch (error) {
          alert('Invalid JSON in Content field');
          throw error;
        }
      }

      const body = {
        scope: cardData.scope,
        type: cardData.type,
        title: cardData.title,
        subtitle: cardData.subtitle || null,
        summary: cardData.summary || null,
        content: parsedContent,
        imageMediaId: cardData.imageMediaId || null,
        videoMediaId: cardData.videoMediaId || null,
        iconName: cardData.iconName || null,
        size: cardData.size || 'M',
        publishStatus: cardData.publishStatus || 'draft',
        minTier: cardData.minTier || null,
        rewardConfig: cardData.rewardConfig || null,
        parentType: cardData.assignments?.[0]?.parentType || null,
        parentId: cardData.assignments?.[0]?.parentId || null,
        order: cardData.assignments?.[0]?.order || 0,
      };

      const url = editingCard?.id 
        ? `/api/admin/cards/${editingCard.id}` 
        : '/api/admin/cards';
      
      const method = editingCard?.id ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'same-origin',
      });

      if (response.ok) {
        alert(editingCard?.id ? 'Card updated!' : 'Card created!');
        setShowDrawer(false);
        setEditingCard(null);
        fetchCards();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save card'}`);
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error saving card:', error);
      throw error;
    }
  };

  const handleCloseDrawer = () => {
    setShowDrawer(false);
    setEditingCard(null);
  };

  const handleCreateNew = () => {
    setEditingCard(null);
    setShowDrawer(true);
    setActiveTab('list');
  };

  const clearFilters = () => {
    setFilters({ scope: '', type: '', publishStatus: '', lane: '', search: '' });
  };

  const hasActiveFilters = filters.scope || filters.type || filters.publishStatus || filters.lane || filters.search;

  const subNavItems = [
    { id: 'list' as SubNavTab, label: 'List' },
    { id: 'filters' as SubNavTab, label: 'Filters' },
  ];

  const componentCards = cards.map(mapAPICardToComponentCard);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <SectionSubNav
        items={subNavItems}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as SubNavTab)}
      />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Cards', value: stats.total, color: 'text-white' },
            { label: 'Story Cards', value: stats.byScope.story || 0, color: 'text-purple-400' },
            { label: 'Event Cards', value: stats.byScope.event || 0, color: 'text-blue-400' },
            { label: 'Published', value: stats.byStatus.published || 0, color: 'text-green-400' },
          ].map((stat, i) => (
            <div
              key={i}
              className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-4`}
            >
              <p className={`${typography.labelMuted} mb-1`}>{stat.label}</p>
              <p className={`${typography.h2} ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        {activeTab === 'list' && (
          <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-4`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${colors.slate.textMuted} w-4 h-4`} />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search by title or subtitle..."
                  className={`
                    w-full pl-10 pr-4 py-2
                    ${surfaces.darkGlass}
                    ${borders.glassBorder}
                    ${borders.radius.lg}
                    ${focus.ring}
                    ${typography.body}
                    placeholder:text-slate-500
                  `}
                />
              </div>

              <div className="flex items-center gap-3">
                <CardViewToggle currentView={viewMode} onViewChange={setViewMode} />
                
                <button
                  onClick={handleCreateNew}
                  className={`
                    ${pills.base}
                    ${pills.padding.md}
                    ${colors.accent.bg}
                    ${focus.ring}
                    ${interactive.hoverSubtle}
                    ${interactive.active}
                    text-white font-medium
                    flex items-center gap-2
                    shadow-lg shadow-fuchsia-500/20
                  `}
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Card</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6 space-y-4`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={typography.h3}>Filter Cards</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className={`
                    ${pills.base}
                    ${pills.padding.sm}
                    ${surfaces.darkGlass}
                    ${borders.glassBorder}
                    ${focus.ring}
                    ${interactive.hoverSubtle}
                    ${colors.slate.text}
                    flex items-center gap-2
                    text-sm
                  `}
                >
                  <X className="w-3.5 h-3.5" />
                  Clear Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={typography.label}>Scope</label>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setFilters({ ...filters, scope: '' })}
                    className={`
                      ${pills.base}
                      ${pills.padding.sm}
                      ${focus.ring}
                      ${interactive.hoverSubtle}
                      flex-1 text-sm font-medium
                      ${filters.scope === '' 
                        ? `${colors.accent.bg} text-white` 
                        : `${surfaces.darkGlass} ${borders.glassBorder} ${colors.slate.text}`
                      }
                    `}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, scope: 'story' })}
                    className={`
                      ${pills.base}
                      ${pills.padding.sm}
                      ${focus.ring}
                      ${interactive.hoverSubtle}
                      flex-1 text-sm font-medium
                      ${filters.scope === 'story' 
                        ? 'bg-purple-600/90 text-white' 
                        : `${surfaces.darkGlass} ${borders.glassBorder} ${colors.slate.text}`
                      }
                    `}
                  >
                    Story
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, scope: 'event' })}
                    className={`
                      ${pills.base}
                      ${pills.padding.sm}
                      ${focus.ring}
                      ${interactive.hoverSubtle}
                      flex-1 text-sm font-medium
                      ${filters.scope === 'event' 
                        ? 'bg-blue-600/90 text-white' 
                        : `${surfaces.darkGlass} ${borders.glassBorder} ${colors.slate.text}`
                      }
                    `}
                  >
                    Event
                  </button>
                </div>
              </div>

              <div>
                <label className={typography.label}>Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className={`
                    w-full mt-2 px-4 py-2
                    ${surfaces.darkGlass}
                    ${borders.glassBorder}
                    ${borders.radius.lg}
                    ${focus.ring}
                    ${typography.body}
                  `}
                >
                  <option value="">All Types</option>
                  <option value="text-story">Text Story</option>
                  <option value="ar-story">AR Story</option>
                  <option value="video">Video</option>
                  <option value="schedule">Schedule</option>
                  <option value="map">Map</option>
                  <option value="venue">Venue Info</option>
                  <option value="live-ar">Live AR</option>
                  <option value="qr-scan">QR Scan</option>
                  <option value="user-media">User Media</option>
                  <option value="merch">Merchandise</option>
                  <option value="food-beverage">Food & Beverage</option>
                </select>
              </div>

              <div>
                <label className={typography.label}>Publish Status</label>
                <select
                  value={filters.publishStatus}
                  onChange={(e) => setFilters({ ...filters, publishStatus: e.target.value })}
                  className={`
                    w-full mt-2 px-4 py-2
                    ${surfaces.darkGlass}
                    ${borders.glassBorder}
                    ${borders.radius.lg}
                    ${focus.ring}
                    ${typography.body}
                  `}
                >
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="in_review">In Review</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {filters.scope === 'event' && eventLanes.length > 0 && (
                <div>
                  <label className={typography.label}>Event Lane</label>
                  <select
                    value={filters.lane}
                    onChange={(e) => setFilters({ ...filters, lane: e.target.value })}
                    className={`
                      w-full mt-2 px-4 py-2
                      ${surfaces.darkGlass}
                      ${borders.glassBorder}
                      ${borders.radius.lg}
                      ${focus.ring}
                      ${typography.body}
                    `}
                  >
                    <option value="">All Lanes</option>
                    {eventLanes.map((lane) => (
                      <option key={lane.id} value={lane.id}>{lane.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cards View */}
        {activeTab === 'list' && (
          <>
            {loading ? (
              <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-12 text-center`}>
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-500 mb-4"></div>
                <p className={typography.body}>Loading cards...</p>
              </div>
            ) : componentCards.length === 0 ? (
              <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-12 text-center`}>
                <p className={`${typography.body} mb-2`}>No cards found</p>
                <p className={typography.bodyMuted}>
                  {hasActiveFilters ? 'Try adjusting your filters' : 'Create your first card to get started'}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {componentCards.map((card) => (
                  <CardTile
                    key={card.id}
                    card={card}
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                    onArchive={handleArchive}
                  />
                ))}
              </div>
            ) : (
              <CardTable
                cards={componentCards}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onArchive={handleArchive}
              />
            )}
          </>
        )}
      </div>

      {/* Card Editor Drawer */}
      <CardEditorDrawer
        isOpen={showDrawer}
        onClose={handleCloseDrawer}
        card={editingCard || undefined}
        onSave={handleSave}
      />
    </div>
  );
}
