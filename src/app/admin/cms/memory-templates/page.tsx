'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ImmersivePageLayout, { ImmersiveTheme } from '@/components/ImmersivePageLayout';

interface MemoryTemplate {
  id: string;
  eventId: string | null;
  title: string;
  description: string | null;
  mediaType: string;
  mediaAsset: string | null;
  points: number;
  rarity: string;
  setId: string | null;
  setName: string | null;
  setIndex: number | null;
  setTotal: number | null;
  metadataSchema: any;
  ogShareTitle: string | null;
  ogShareDescription: string | null;
  ogShareImage: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Event {
  id: string;
  title: string;
}

export default function MemoryTemplatesPage() {
  const [templates, setTemplates] = useState<MemoryTemplate[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MemoryTemplate | null>(null);
  
  const [filters, setFilters] = useState({
    eventId: '',
    mediaType: '',
    rarity: '',
    isActive: ''
  });
  
  const [formData, setFormData] = useState<{
    eventId: string;
    title: string;
    description: string;
    mediaType: string;
    mediaAsset: string;
    points: number;
    rarity: string;
    setId: string;
    setName: string;
    setIndex: number | null;
    setTotal: number | null;
    metadataSchema: string;
    ogShareTitle: string;
    ogShareDescription: string;
    ogShareImage: string;
    isActive: boolean;
  }>({
    eventId: '',
    title: '',
    description: '',
    mediaType: 'image',
    mediaAsset: '',
    points: 0,
    rarity: 'common',
    setId: '',
    setName: '',
    setIndex: null,
    setTotal: null,
    metadataSchema: '{}',
    ogShareTitle: '',
    ogShareDescription: '',
    ogShareImage: '',
    isActive: true
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
    fetchEvents();
    fetchTemplates();
  }, [filters]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events', {
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.eventId) queryParams.set('eventId', filters.eventId);
      if (filters.mediaType) queryParams.set('mediaType', filters.mediaType);
      if (filters.rarity) queryParams.set('rarity', filters.rarity);
      if (filters.isActive) queryParams.set('isActive', filters.isActive);
      
      const response = await fetch(`/api/cms/memory-templates?${queryParams}`, {
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let parsedMetadataSchema = null;
      if (formData.metadataSchema && formData.metadataSchema.trim() !== '') {
        try {
          parsedMetadataSchema = JSON.parse(formData.metadataSchema);
        } catch (error) {
          alert('Invalid JSON in Metadata Schema');
          return;
        }
      }

      const body = {
        ...formData,
        eventId: formData.eventId || null,
        mediaAsset: formData.mediaAsset || null,
        setId: formData.setId || null,
        setName: formData.setName || null,
        ogShareTitle: formData.ogShareTitle || null,
        ogShareDescription: formData.ogShareDescription || null,
        ogShareImage: formData.ogShareImage || null,
        metadataSchema: parsedMetadataSchema,
      };

      const url = editingTemplate 
        ? `/api/cms/memory-templates/${editingTemplate.id}` 
        : '/api/cms/memory-templates';
      
      const method = editingTemplate ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        credentials: 'same-origin',
      });

      if (response.ok) {
        alert(editingTemplate ? 'Template updated!' : 'Template created!');
        setShowForm(false);
        setEditingTemplate(null);
        resetForm();
        fetchTemplates();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save template'}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/cms/memory-templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (response.ok) {
        alert('Template deleted!');
        fetchTemplates();
      } else {
        const error = await response.json();
        if (error.inUse) {
          alert(error.message || 'Template is in use and cannot be deleted');
        } else {
          alert('Failed to delete template');
        }
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const handleEdit = (template: MemoryTemplate) => {
    setEditingTemplate(template);
    setFormData({
      eventId: template.eventId || '',
      title: template.title,
      description: template.description || '',
      mediaType: template.mediaType,
      mediaAsset: template.mediaAsset || '',
      points: template.points,
      rarity: template.rarity,
      setId: template.setId || '',
      setName: template.setName || '',
      setIndex: template.setIndex,
      setTotal: template.setTotal,
      metadataSchema: template.metadataSchema ? JSON.stringify(template.metadataSchema, null, 2) : '{}',
      ogShareTitle: template.ogShareTitle || '',
      ogShareDescription: template.ogShareDescription || '',
      ogShareImage: template.ogShareImage || '',
      isActive: template.isActive
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      eventId: '',
      title: '',
      description: '',
      mediaType: 'image',
      mediaAsset: '',
      points: 0,
      rarity: 'common',
      setId: '',
      setName: '',
      setIndex: null,
      setTotal: null,
      metadataSchema: '{}',
      ogShareTitle: '',
      ogShareDescription: '',
      ogShareImage: '',
      isActive: true
    });
    setEditingTemplate(null);
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-500 text-white';
      case 'epic': return 'bg-purple-500 text-white';
      case 'rare': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getMediaTypeIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'video': return '🎥';
      case '3d': return '🎮';
      case 'ar-capture': return '📷';
      case 'audio': return '🎵';
      default: return '🖼️';
    }
  };

  return (
    <ImmersivePageLayout
      title="Memory Templates"
      subtitle="Manage reusable memory configurations"
      theme={theme}
    >
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6 flex gap-4 items-center justify-between">
          <div className="flex gap-4 flex-wrap">
            <select
              value={filters.eventId}
              onChange={(e) => setFilters({ ...filters, eventId: e.target.value })}
              className="px-4 py-2 rounded border bg-white"
            >
              <option value="">All Events</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>

            <select
              value={filters.mediaType}
              onChange={(e) => setFilters({ ...filters, mediaType: e.target.value })}
              className="px-4 py-2 rounded border bg-white"
            >
              <option value="">All Media Types</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="ar-capture">AR Capture</option>
              <option value="3d">3D</option>
              <option value="audio">Audio</option>
            </select>

            <select
              value={filters.rarity}
              onChange={(e) => setFilters({ ...filters, rarity: e.target.value })}
              className="px-4 py-2 rounded border bg-white"
            >
              <option value="">All Rarities</option>
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>

            <select
              value={filters.isActive}
              onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
              className="px-4 py-2 rounded border bg-white"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            + Create Template
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingTemplate ? 'Edit' : 'Create'} Memory Template</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title *</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="Template title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Event</label>
                    <select
                      value={formData.eventId}
                      onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                      className="w-full px-4 py-2 rounded border"
                    >
                      <option value="">No Event</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>{event.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Template description"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Media Type *</label>
                    <select
                      value={formData.mediaType}
                      onChange={(e) => setFormData({ ...formData, mediaType: e.target.value })}
                      className="w-full px-4 py-2 rounded border"
                      required
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="ar-capture">AR Capture</option>
                      <option value="3d">3D</option>
                      <option value="audio">Audio</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Rarity</label>
                    <select
                      value={formData.rarity}
                      onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                      className="w-full px-4 py-2 rounded border"
                    >
                      <option value="common">Common</option>
                      <option value="rare">Rare</option>
                      <option value="epic">Epic</option>
                      <option value="legendary">Legendary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Points</label>
                    <Input
                      type="number"
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Media Asset URL</label>
                  <Input
                    value={formData.mediaAsset}
                    onChange={(e) => setFormData({ ...formData, mediaAsset: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Set ID</label>
                    <Input
                      value={formData.setId}
                      onChange={(e) => setFormData({ ...formData, setId: e.target.value })}
                      placeholder="set-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Set Name</label>
                    <Input
                      value={formData.setName}
                      onChange={(e) => setFormData({ ...formData, setName: e.target.value })}
                      placeholder="Collection Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Set Index</label>
                    <Input
                      type="number"
                      value={formData.setIndex || ''}
                      onChange={(e) => setFormData({ ...formData, setIndex: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Set Total</label>
                    <Input
                      type="number"
                      value={formData.setTotal || ''}
                      onChange={(e) => setFormData({ ...formData, setTotal: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Metadata Schema (JSON)</label>
                  <Textarea
                    value={formData.metadataSchema}
                    onChange={(e) => setFormData({ ...formData, metadataSchema: e.target.value })}
                    rows={4}
                    placeholder='{"customField": "value"}'
                    className="font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">OG Share Title</label>
                    <Input
                      value={formData.ogShareTitle}
                      onChange={(e) => setFormData({ ...formData, ogShareTitle: e.target.value })}
                      placeholder="Title for social sharing"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">OG Share Description</label>
                    <Textarea
                      value={formData.ogShareDescription}
                      onChange={(e) => setFormData({ ...formData, ogShareDescription: e.target.value })}
                      rows={2}
                      placeholder="Description for social sharing"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">OG Share Image URL</label>
                    <Input
                      value={formData.ogShareImage}
                      onChange={(e) => setFormData({ ...formData, ogShareImage: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    id="isActive"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium">Active</label>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                    {editingTemplate ? 'Update' : 'Create'} Template
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12">Loading templates...</div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No memory templates found. Create one to get started!
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getMediaTypeIcon(template.mediaType)}</span>
                      <div>
                        <h3 className="font-bold text-lg">{template.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${getRarityBadgeColor(template.rarity)}`}>
                          {template.rarity}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {template.isActive ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">Inactive</span>
                      )}
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                  )}

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Media Type:</span>
                      <span className="font-medium">{template.mediaType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Points:</span>
                      <span className="font-medium">{template.points}</span>
                    </div>
                    {template.setName && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Set:</span>
                        <span className="font-medium">{template.setName} ({template.setIndex}/{template.setTotal})</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(template)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(template.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      size="sm"
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ImmersivePageLayout>
  );
}
