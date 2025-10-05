'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ImmersivePageLayout, { ImmersiveTheme } from '@/components/ImmersivePageLayout';

interface RewardRule {
  id: string;
  eventId: string;
  type: string;
  name: string;
  description: string | null;
  memoryTemplateId: string;
  matchConfig: any;
  constraints: any;
  antiAbuse: any;
  validityStart: string | null;
  validityEnd: string | null;
  maxRedemptions: number | null;
  currentRedemptions: number;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Event {
  id: string;
  title: string;
}

interface MemoryTemplate {
  id: string;
  title: string;
  eventId: string | null;
}

export default function RewardRulesPage() {
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [templates, setTemplates] = useState<MemoryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<RewardRule | null>(null);
  
  const [filters, setFilters] = useState({
    eventId: '',
    type: '',
    memoryTemplateId: '',
    isActive: ''
  });
  
  const [formData, setFormData] = useState<{
    eventId: string;
    type: string;
    name: string;
    description: string;
    memoryTemplateId: string;
    matchConfig: string;
    constraints: string;
    antiAbuse: string;
    validityStart: string;
    validityEnd: string;
    maxRedemptions: string;
    isActive: boolean;
  }>({
    eventId: '',
    type: 'qr',
    name: '',
    description: '',
    memoryTemplateId: '',
    matchConfig: '{}',
    constraints: '{}',
    antiAbuse: '{}',
    validityStart: '',
    validityEnd: '',
    maxRedemptions: '',
    isActive: true
  });

  const theme: ImmersiveTheme = {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
    title: '#ffffff',
    subtitle: '#ffe0e6',
    description: '#ffc9d1',
    shadow: true
  };

  useEffect(() => {
    fetchEvents();
    fetchTemplates();
    fetchRules();
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
      const response = await fetch('/api/cms/memory-templates', {
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchRules = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.eventId) queryParams.set('eventId', filters.eventId);
      if (filters.type) queryParams.set('type', filters.type);
      if (filters.memoryTemplateId) queryParams.set('memoryTemplateId', filters.memoryTemplateId);
      if (filters.isActive) queryParams.set('isActive', filters.isActive);
      
      const response = await fetch(`/api/cms/reward-rules?${queryParams}`, {
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        const data = await response.json();
        setRules(data);
      }
    } catch (error) {
      console.error('Error fetching reward rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let parsedMatchConfig = null;
      let parsedConstraints = null;
      let parsedAntiAbuse = null;

      if (formData.matchConfig && formData.matchConfig.trim() !== '') {
        try {
          parsedMatchConfig = JSON.parse(formData.matchConfig);
        } catch (error) {
          alert('Invalid JSON in Match Config');
          return;
        }
      }

      if (formData.constraints && formData.constraints.trim() !== '') {
        try {
          parsedConstraints = JSON.parse(formData.constraints);
        } catch (error) {
          alert('Invalid JSON in Constraints');
          return;
        }
      }

      if (formData.antiAbuse && formData.antiAbuse.trim() !== '') {
        try {
          parsedAntiAbuse = JSON.parse(formData.antiAbuse);
        } catch (error) {
          alert('Invalid JSON in Anti-Abuse');
          return;
        }
      }

      const body = {
        eventId: formData.eventId,
        type: formData.type,
        name: formData.name,
        description: formData.description || null,
        memoryTemplateId: formData.memoryTemplateId,
        matchConfig: parsedMatchConfig,
        constraints: parsedConstraints,
        antiAbuse: parsedAntiAbuse,
        validityStart: formData.validityStart || null,
        validityEnd: formData.validityEnd || null,
        maxRedemptions: formData.maxRedemptions ? parseInt(formData.maxRedemptions) : null,
        isActive: formData.isActive
      };

      const url = editingRule 
        ? `/api/cms/reward-rules/${editingRule.id}` 
        : '/api/cms/reward-rules';
      
      const method = editingRule ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        credentials: 'same-origin',
      });

      if (response.ok) {
        alert(editingRule ? 'Reward rule updated!' : 'Reward rule created!');
        setShowForm(false);
        setEditingRule(null);
        resetForm();
        fetchRules();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save reward rule'}`);
      }
    } catch (error) {
      console.error('Error saving reward rule:', error);
      alert('Failed to save reward rule');
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this reward rule?')) return;

    try {
      const response = await fetch(`/api/cms/reward-rules/${ruleId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (response.ok) {
        alert('Reward rule deleted!');
        fetchRules();
      } else {
        alert('Failed to delete reward rule');
      }
    } catch (error) {
      console.error('Error deleting reward rule:', error);
      alert('Failed to delete reward rule');
    }
  };

  const handleEdit = (rule: RewardRule) => {
    setEditingRule(rule);
    setFormData({
      eventId: rule.eventId,
      type: rule.type,
      name: rule.name,
      description: rule.description || '',
      memoryTemplateId: rule.memoryTemplateId,
      matchConfig: rule.matchConfig ? JSON.stringify(rule.matchConfig, null, 2) : '{}',
      constraints: rule.constraints ? JSON.stringify(rule.constraints, null, 2) : '{}',
      antiAbuse: rule.antiAbuse ? JSON.stringify(rule.antiAbuse, null, 2) : '{}',
      validityStart: rule.validityStart ? rule.validityStart.split('T')[0] : '',
      validityEnd: rule.validityEnd ? rule.validityEnd.split('T')[0] : '',
      maxRedemptions: rule.maxRedemptions?.toString() || '',
      isActive: rule.isActive
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      eventId: '',
      type: 'qr',
      name: '',
      description: '',
      memoryTemplateId: '',
      matchConfig: '{}',
      constraints: '{}',
      antiAbuse: '{}',
      validityStart: '',
      validityEnd: '',
      maxRedemptions: '',
      isActive: true
    });
  };

  const getMatchConfigHint = (type: string) => {
    switch (type) {
      case 'qr':
        return 'Example: {"schema": "ode:{eventId}:{stampId}:{nonce}"}';
      case 'location':
        return 'Example: {"lat": 51.5074, "lng": -0.1278, "radius": 100, "floor": "1", "zone": "main"}';
      case 'action':
        return 'Example: {"event": "minigame.win", "conditions": {"score": ">100"}}';
      default:
        return '';
    }
  };

  const filteredTemplates = formData.eventId 
    ? templates.filter(t => t.eventId === formData.eventId)
    : templates;

  return (
    <ImmersivePageLayout
      theme={theme}
      title="Reward Rules Manager"
      subtitle="Manage QR, Location, and Action-based Reward Rules"
      description="Configure automated reward distribution rules"
    >
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Reward Rules</h1>
          <Button 
            onClick={() => {
              setEditingRule(null);
              resetForm();
              setShowForm(!showForm);
            }}
            className="bg-white text-purple-600 hover:bg-purple-100"
          >
            {showForm ? 'Cancel' : 'Create New Rule'}
          </Button>
        </div>

        {!showForm && (
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Event</label>
                  <select
                    value={filters.eventId}
                    onChange={(e) => setFilters({ ...filters, eventId: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">All Events</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>{event.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">All Types</option>
                    <option value="qr">QR Code</option>
                    <option value="location">Location</option>
                    <option value="action">Action</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Template</label>
                  <select
                    value={filters.memoryTemplateId}
                    onChange={(e) => setFilters({ ...filters, memoryTemplateId: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">All Templates</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>{template.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={filters.isActive}
                    onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">All</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {showForm && (
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{editingRule ? 'Edit Reward Rule' : 'Create New Reward Rule'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g., Main Stage Check-in"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Event *</label>
                    <select
                      value={formData.eventId}
                      onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                      className="w-full p-2 border rounded"
                      required
                    >
                      <option value="">Select Event</option>
                      {events.map(event => (
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
                    placeholder="Describe this reward rule..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full p-2 border rounded"
                      required
                    >
                      <option value="qr">QR Code</option>
                      <option value="location">Location</option>
                      <option value="action">Action</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Memory Template *</label>
                    <select
                      value={formData.memoryTemplateId}
                      onChange={(e) => setFormData({ ...formData, memoryTemplateId: e.target.value })}
                      className="w-full p-2 border rounded"
                      required
                    >
                      <option value="">Select Template</option>
                      {filteredTemplates.map(template => (
                        <option key={template.id} value={template.id}>{template.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Match Config (JSON)
                    <span className="text-xs text-gray-500 ml-2">{getMatchConfigHint(formData.type)}</span>
                  </label>
                  <Textarea
                    value={formData.matchConfig}
                    onChange={(e) => setFormData({ ...formData, matchConfig: e.target.value })}
                    placeholder={getMatchConfigHint(formData.type)}
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Constraints (JSON)
                      <span className="text-xs text-gray-500 ml-2">cooldownMinutes, oneTimeOnly, requiresTier, timeWindow</span>
                    </label>
                    <Textarea
                      value={formData.constraints}
                      onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                      placeholder='{"cooldownMinutes": 60, "oneTimeOnly": true}'
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Anti-Abuse (JSON)
                      <span className="text-xs text-gray-500 ml-2">perUserLimit, perDeviceLimit, duplicateNonceBlock</span>
                    </label>
                    <Textarea
                      value={formData.antiAbuse}
                      onChange={(e) => setFormData({ ...formData, antiAbuse: e.target.value })}
                      placeholder='{"perUserLimit": 1, "duplicateNonceBlock": true}'
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Validity Start</label>
                    <Input
                      type="date"
                      value={formData.validityStart}
                      onChange={(e) => setFormData({ ...formData, validityStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Validity End</label>
                    <Input
                      type="date"
                      value={formData.validityEnd}
                      onChange={(e) => setFormData({ ...formData, validityEnd: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Redemptions</label>
                    <Input
                      type="number"
                      value={formData.maxRedemptions}
                      onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                      placeholder="Leave empty for unlimited"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium">
                    Active
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                    {editingRule ? 'Update Rule' : 'Create Rule'}
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => {
                      setShowForm(false);
                      setEditingRule(null);
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

        {!showForm && (
          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardContent className="p-6">
                  <p className="text-center text-gray-500">Loading reward rules...</p>
                </CardContent>
              </Card>
            ) : rules.length === 0 ? (
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardContent className="p-6">
                  <p className="text-center text-gray-500">No reward rules found. Create one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              rules.map(rule => {
                const event = events.find(e => e.id === rule.eventId);
                const template = templates.find(t => t.id === rule.memoryTemplateId);
                return (
                  <Card key={rule.id} className="bg-white/95 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold">{rule.name}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              rule.type === 'qr' ? 'bg-blue-100 text-blue-800' :
                              rule.type === 'location' ? 'bg-green-100 text-green-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {rule.type.toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {rule.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {rule.description && (
                            <p className="text-gray-600 mb-2">{rule.description}</p>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-500 mt-3">
                            <div>
                              <span className="font-medium">Event:</span> {event?.title || 'Unknown'}
                            </div>
                            <div>
                              <span className="font-medium">Template:</span> {template?.title || 'Unknown'}
                            </div>
                            <div>
                              <span className="font-medium">Redemptions:</span> {rule.currentRedemptions}
                              {rule.maxRedemptions ? ` / ${rule.maxRedemptions}` : ' / ∞'}
                            </div>
                            <div>
                              <span className="font-medium">Created:</span> {new Date(rule.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleEdit(rule)}
                            variant="outline"
                            size="sm"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDelete(rule.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </ImmersivePageLayout>
  );
}
