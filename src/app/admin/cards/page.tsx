'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ImmersivePageLayout, { ImmersiveTheme } from '@/components/ImmersivePageLayout';
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Eye,
  Search,
  Filter,
  Globe,
  CalendarCheck,
  X
} from 'lucide-react';

interface CardData {
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
  publishStatus: string;
  publishedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  imageMedia?: {
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

export default function CardsPage() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [eventLanes, setEventLanes] = useState<EventLane[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    byScope: {},
    byType: {},
    byStatus: {}
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CardData | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    scope: '',
    type: '',
    publishStatus: '',
    lane: '',
    search: ''
  });

  // Form data
  const [formData, setFormData] = useState<{
    scope: 'story' | 'event';
    type: string;
    title: string;
    subtitle: string;
    summary: string;
    content: string;
    imageMediaId: string;
    videoMediaId: string;
    iconName: string;
    size: string;
    publishStatus: string;
    parentType: string;
    parentId: string;
  }>({
    scope: 'story',
    type: 'text-story',
    title: '',
    subtitle: '',
    summary: '',
    content: '{}',
    imageMediaId: '',
    videoMediaId: '',
    iconName: '',
    size: 'M',
    publishStatus: 'draft',
    parentType: '',
    parentId: ''
  });

  const theme: ImmersiveTheme = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
    title: '#ffffff',
    subtitle: '#e0e7ff',
    description: '#c7d2fe',
    shadow: true
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let parsedContent = {};
      if (formData.content && formData.content.trim() !== '') {
        try {
          parsedContent = JSON.parse(formData.content);
        } catch (error) {
          alert('Invalid JSON in Content field');
          return;
        }
      }

      const body = {
        ...formData,
        content: parsedContent,
        imageMediaId: formData.imageMediaId || null,
        videoMediaId: formData.videoMediaId || null,
        iconName: formData.iconName || null,
        parentType: formData.parentType || null,
        parentId: formData.parentId || null,
      };

      const url = editingCard 
        ? `/api/admin/cards/${editingCard.id}` 
        : '/api/admin/cards';
      
      const method = editingCard ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        credentials: 'same-origin',
      });

      if (response.ok) {
        alert(editingCard ? 'Card updated!' : 'Card created!');
        setShowModal(false);
        setEditingCard(null);
        resetForm();
        fetchCards();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save card'}`);
      }
    } catch (error) {
      console.error('Error saving card:', error);
      alert('Failed to save card');
    }
  };

  const handleDelete = async (cardId: string) => {
    try {
      const response = await fetch(`/api/admin/cards/${cardId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (response.ok) {
        alert('Card deleted!');
        setDeleteConfirmId(null);
        fetchCards();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to delete card'}`);
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('Failed to delete card');
    }
  };

  const handleEdit = (card: CardData) => {
    setEditingCard(card);
    setFormData({
      scope: card.scope,
      type: card.type,
      title: card.title,
      subtitle: card.subtitle || '',
      summary: card.summary || '',
      content: JSON.stringify(card.content, null, 2),
      imageMediaId: card.imageMediaId || '',
      videoMediaId: card.videoMediaId || '',
      iconName: card.iconName || '',
      size: card.size || 'M',
      publishStatus: card.publishStatus,
      parentType: card.assignments[0]?.parentType || '',
      parentId: card.assignments[0]?.parentId || '',
    });
    setShowModal(true);
  };

  const handleDuplicate = (card: CardData) => {
    setEditingCard(null);
    setFormData({
      scope: card.scope,
      type: card.type,
      title: `${card.title} (Copy)`,
      subtitle: card.subtitle || '',
      summary: card.summary || '',
      content: JSON.stringify(card.content, null, 2),
      imageMediaId: card.imageMediaId || '',
      videoMediaId: card.videoMediaId || '',
      iconName: card.iconName || '',
      size: card.size || 'M',
      publishStatus: 'draft',
      parentType: card.assignments[0]?.parentType || '',
      parentId: card.assignments[0]?.parentId || '',
    });
    setShowModal(true);
  };

  const handlePublishToggle = async (card: CardData) => {
    const newStatus = card.publishStatus === 'published' ? 'draft' : 'published';
    
    try {
      const response = await fetch(`/api/admin/cards/${card.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publishStatus: newStatus }),
        credentials: 'same-origin',
      });

      if (response.ok) {
        alert(`Card ${newStatus === 'published' ? 'published' : 'unpublished'}!`);
        fetchCards();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to update card'}`);
      }
    } catch (error) {
      console.error('Error updating card:', error);
      alert('Failed to update card');
    }
  };

  const resetForm = () => {
    setFormData({
      scope: 'story',
      type: 'text-story',
      title: '',
      subtitle: '',
      summary: '',
      content: '{}',
      imageMediaId: '',
      videoMediaId: '',
      iconName: '',
      size: 'M',
      publishStatus: 'draft',
      parentType: '',
      parentId: ''
    });
    setEditingCard(null);
  };

  const getScopeBadgeColor = (scope: string) => {
    return scope === 'story' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500 text-white';
      case 'in_review': return 'bg-yellow-500 text-white';
      case 'archived': return 'bg-gray-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getLaneInfo = (card: CardData) => {
    const laneAssignment = card.assignments.find(a => a.parentType === 'event_lane');
    if (!laneAssignment) return null;
    const lane = eventLanes.find(l => l.id === laneAssignment.parentId);
    return lane?.title || laneAssignment.parentId;
  };

  return (
    <ImmersivePageLayout
      title="Card Library"
      subtitle="Manage unified cards for Story and Event experiences"
      theme={theme}
    >
      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Story Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.byScope.story || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Event Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.byScope.event || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.byStatus.published || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Actions */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex gap-4 items-center justify-between">
            <div className="flex gap-4 flex-wrap flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search by title or subtitle..."
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={filters.scope === '' ? 'default' : 'outline'}
                  onClick={() => setFilters({ ...filters, scope: '' })}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={filters.scope === 'story' ? 'default' : 'outline'}
                  onClick={() => setFilters({ ...filters, scope: 'story' })}
                  size="sm"
                  className={filters.scope === 'story' ? 'bg-purple-600' : ''}
                >
                  Story
                </Button>
                <Button
                  variant={filters.scope === 'event' ? 'default' : 'outline'}
                  onClick={() => setFilters({ ...filters, scope: 'event' })}
                  size="sm"
                  className={filters.scope === 'event' ? 'bg-blue-600' : ''}
                >
                  Event
                </Button>
              </div>
            </div>

            <Button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Card
            </Button>
          </div>

          <div className="flex gap-4 flex-wrap">
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-4 py-2 rounded-md border bg-white text-sm"
            >
              <option value="">All Types</option>
              <option value="text-story">Text Story</option>
              <option value="ar-story">AR Story</option>
              <option value="schedule">Schedule</option>
              <option value="map">Map</option>
              <option value="venue">Venue Info</option>
              <option value="live-ar">Live AR</option>
              <option value="qr-scan">QR Scan</option>
              <option value="user-media">User Media</option>
              <option value="merch">Merchandise</option>
              <option value="food-beverage">Food & Beverage</option>
            </select>

            <select
              value={filters.publishStatus}
              onChange={(e) => setFilters({ ...filters, publishStatus: e.target.value })}
              className="px-4 py-2 rounded-md border bg-white text-sm"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="in_review">In Review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            {filters.scope === 'event' && eventLanes.length > 0 && (
              <select
                value={filters.lane}
                onChange={(e) => setFilters({ ...filters, lane: e.target.value })}
                className="px-4 py-2 rounded-md border bg-white text-sm"
              >
                <option value="">All Lanes</option>
                {eventLanes.map((lane) => (
                  <option key={lane.id} value={lane.id}>{lane.title}</option>
                ))}
              </select>
            )}

            {(filters.scope || filters.type || filters.publishStatus || filters.lane || filters.search) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ scope: '', type: '', publishStatus: '', lane: '', search: '' })}
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600">Loading cards...</p>
          </div>
        ) : cards.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <CreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">No cards found</p>
              <p className="text-sm text-gray-500">Create your first card to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <Card key={card.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScopeBadgeColor(card.scope)}`}>
                          {card.scope.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(card.publishStatus)}`}>
                          {card.publishStatus.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <CardTitle className="text-lg">{card.title}</CardTitle>
                      {card.subtitle && (
                        <p className="text-sm text-gray-600 mt-1">{card.subtitle}</p>
                      )}
                    </div>
                    {card.imageMedia && (
                      <img 
                        src={card.imageMedia.publicUrl} 
                        alt={card.title}
                        className="w-16 h-16 rounded object-cover ml-2"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Type:</span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{card.type}</span>
                    </div>
                    {card.size && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Size:</span>
                        <span>{card.size}</span>
                      </div>
                    )}
                    {card.scope === 'event' && getLaneInfo(card) && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Lane:</span>
                        <span>{getLaneInfo(card)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(card)}
                      className="flex-1"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicate(card)}
                      className="flex-1"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Duplicate
                    </Button>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={card.publishStatus === 'published' ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => handlePublishToggle(card)}
                      className="flex-1"
                    >
                      <CalendarCheck className="w-3 h-3 mr-1" />
                      {card.publishStatus === 'published' ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteConfirmId(card.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>{editingCard ? 'Edit' : 'Create'} Card</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Scope *</label>
                      <select
                        value={formData.scope}
                        onChange={(e) => setFormData({ ...formData, scope: e.target.value as 'story' | 'event' })}
                        className="w-full px-4 py-2 rounded-md border"
                        required
                      >
                        <option value="story">Story</option>
                        <option value="event">Event</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Type *</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-4 py-2 rounded-md border"
                        required
                      >
                        <option value="text-story">Text Story</option>
                        <option value="ar-story">AR Story</option>
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Title *</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="Card title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Subtitle</label>
                    <Input
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      placeholder="Card subtitle"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Summary</label>
                    <Textarea
                      value={formData.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      rows={2}
                      placeholder="Brief description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Content (JSON) *</label>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={6}
                      placeholder='{"key": "value"}'
                      required
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Image Media ID</label>
                      <Input
                        value={formData.imageMediaId}
                        onChange={(e) => setFormData({ ...formData, imageMediaId: e.target.value })}
                        placeholder="Media asset ID"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Video Media ID</label>
                      <Input
                        value={formData.videoMediaId}
                        onChange={(e) => setFormData({ ...formData, videoMediaId: e.target.value })}
                        placeholder="Media asset ID"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Icon Name</label>
                      <Input
                        value={formData.iconName}
                        onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
                        placeholder="Calendar, MapPin, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Size</label>
                      <select
                        value={formData.size}
                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        className="w-full px-4 py-2 rounded-md border"
                      >
                        <option value="S">Small</option>
                        <option value="M">Medium</option>
                        <option value="L">Large</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Publish Status</label>
                      <select
                        value={formData.publishStatus}
                        onChange={(e) => setFormData({ ...formData, publishStatus: e.target.value })}
                        className="w-full px-4 py-2 rounded-md border"
                      >
                        <option value="draft">Draft</option>
                        <option value="in_review">In Review</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  {formData.scope === 'event' && eventLanes.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Assign to Lane (Optional)</label>
                      <select
                        value={formData.parentId}
                        onChange={(e) => {
                          setFormData({ 
                            ...formData, 
                            parentType: e.target.value ? 'event_lane' : '',
                            parentId: e.target.value 
                          });
                        }}
                        className="w-full px-4 py-2 rounded-md border"
                      >
                        <option value="">No lane assignment</option>
                        {eventLanes.map((lane) => (
                          <option key={lane.id} value={lane.id}>{lane.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                      {editingCard ? 'Update' : 'Create'} Card
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowModal(false);
                        setEditingCard(null);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Confirm Delete</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Are you sure you want to delete this card? This action cannot be undone.</p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ImmersivePageLayout>
  );
}
