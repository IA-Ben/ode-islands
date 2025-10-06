'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Star,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Search,
  Filter,
  Power,
  PowerOff,
  X,
  Save,
  AlertCircle
} from 'lucide-react';

interface Condition {
  id?: string;
  conditionType: 'tier_requirement' | 'zone' | 'time_window' | 'custom';
  conditionData: any;
}

interface FeaturedRule {
  id: string;
  name: string;
  description?: string;
  context: string;
  cardId: string;
  priority: number;
  pinned: boolean;
  popularityBoost: number;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  cardTitle?: string;
  cardSubtitle?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  conditions: Condition[];
}

interface CardOption {
  id: string;
  title: string;
  subtitle?: string;
  scope: string;
  publishStatus: string;
  imageUrl?: string;
}

export default function FeaturedRulesPage() {
  const [rules, setRules] = useState<FeaturedRule[]>([]);
  const [cards, setCards] = useState<CardOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<FeaturedRule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // Filters
  const [filters, setFilters] = useState({
    context: '',
    active: '',
    search: ''
  });

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    context: 'event_hub',
    cardId: '',
    priority: 50,
    pinned: false,
    popularityBoost: 0,
    startsAt: '',
    endsAt: '',
    isActive: true,
  });

  const [conditions, setConditions] = useState<Condition[]>([]);
  const [newCondition, setNewCondition] = useState<Partial<Condition>>({
    conditionType: 'tier_requirement',
    conditionData: {}
  });

  useEffect(() => {
    fetchRules();
    fetchCards();
  }, [filters, page]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.context) queryParams.set('context', filters.context);
      if (filters.active) queryParams.set('active', filters.active);
      if (filters.search) queryParams.set('search', filters.search);
      queryParams.set('page', page.toString());
      queryParams.set('limit', '20');

      const response = await fetch(`/api/admin/featured/rules?${queryParams}`, {
        credentials: 'same-origin'
      });

      if (response.ok) {
        const data = await response.json();
        setRules(data.rules || []);
        setTotal(data.total || 0);
      } else {
        console.error('Failed to fetch rules');
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCards = async () => {
    try {
      const response = await fetch('/api/admin/cards?publishStatus=published', {
        credentials: 'same-origin'
      });

      if (response.ok) {
        const data = await response.json();
        setCards(data.cards || []);
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.context || !formData.cardId) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.startsAt && formData.endsAt && new Date(formData.startsAt) >= new Date(formData.endsAt)) {
      alert('Start time must be before end time');
      return;
    }

    try {
      const body = {
        ...formData,
        conditions: conditions.map(c => ({
          conditionType: c.conditionType,
          conditionData: c.conditionData
        }))
      };

      const url = editingRule 
        ? `/api/admin/featured/rules/${editingRule.id}` 
        : '/api/admin/featured/rules';
      
      const method = editingRule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        credentials: 'same-origin',
      });

      if (response.ok) {
        alert(editingRule ? 'Rule updated!' : 'Rule created!');
        setShowModal(false);
        setEditingRule(null);
        resetForm();
        fetchRules();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save rule'}`);
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('Failed to save rule');
    }
  };

  const handleDelete = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/admin/featured/rules/${ruleId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (response.ok) {
        alert('Rule deleted!');
        setDeleteConfirmId(null);
        fetchRules();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to delete rule'}`);
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Failed to delete rule');
    }
  };

  const handleEdit = (rule: FeaturedRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      context: rule.context,
      cardId: rule.cardId,
      priority: rule.priority,
      pinned: rule.pinned,
      popularityBoost: rule.popularityBoost,
      startsAt: rule.startsAt ? new Date(rule.startsAt).toISOString().slice(0, 16) : '',
      endsAt: rule.endsAt ? new Date(rule.endsAt).toISOString().slice(0, 16) : '',
      isActive: rule.isActive,
    });
    setConditions(rule.conditions || []);
    setShowModal(true);
  };

  const handleDuplicate = async (rule: FeaturedRule) => {
    try {
      const response = await fetch(`/api/admin/featured/rules/${rule.id}/duplicate`, {
        method: 'POST',
        credentials: 'same-origin',
      });

      if (response.ok) {
        alert('Rule duplicated!');
        fetchRules();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to duplicate rule'}`);
      }
    } catch (error) {
      console.error('Error duplicating rule:', error);
      alert('Failed to duplicate rule');
    }
  };

  const handleToggleActive = async (rule: FeaturedRule) => {
    try {
      const response = await fetch(`/api/admin/featured/rules/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !rule.isActive }),
        credentials: 'same-origin',
      });

      if (response.ok) {
        fetchRules();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to update rule'}`);
      }
    } catch (error) {
      console.error('Error updating rule:', error);
      alert('Failed to update rule');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      context: 'event_hub',
      cardId: '',
      priority: 50,
      pinned: false,
      popularityBoost: 0,
      startsAt: '',
      endsAt: '',
      isActive: true,
    });
    setConditions([]);
    setEditingRule(null);
  };

  const addCondition = () => {
    if (!newCondition.conditionType) return;

    setConditions([
      ...conditions,
      {
        conditionType: newCondition.conditionType!,
        conditionData: newCondition.conditionData || {}
      }
    ]);

    setNewCondition({
      conditionType: 'tier_requirement',
      conditionData: {}
    });
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handlePreview = async (rule: FeaturedRule) => {
    setPreviewData({
      rule,
      message: 'Preview: This rule would be applied in the selected context with the configured conditions.'
    });
    setShowPreview(true);
  };

  const getContextBadgeColor = (context: string) => {
    const colors: Record<string, string> = {
      'event_hub': 'bg-blue-500',
      'story_chapter': 'bg-purple-500',
      'before': 'bg-green-500',
      'after': 'bg-orange-500',
      'rewards': 'bg-pink-500'
    };
    return colors[context] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                <Star className="w-10 h-10 text-yellow-500" />
                Featured Content Rules
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage dynamic card featuring and prioritization across contexts
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search rules..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Context</label>
                <select
                  value={filters.context}
                  onChange={(e) => setFilters({ ...filters, context: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Contexts</option>
                  <option value="event_hub">Event Hub</option>
                  <option value="story_chapter">Story Chapter</option>
                  <option value="before">Before</option>
                  <option value="after">After</option>
                  <option value="rewards">Rewards</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={filters.active}
                  onChange={(e) => setFilters({ ...filters, active: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => setFilters({ context: '', active: '', search: '' })}
                  variant="outline"
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rules Table */}
        <Card>
          <CardHeader>
            <CardTitle>Rules ({total})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"></div>
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No rules found. Create your first featured rule!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Card</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Context</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pinned</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{rule.name}</div>
                            {rule.description && (
                              <div className="text-sm text-gray-500">{rule.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {rule.imageUrl && (
                              <img src={rule.imageUrl} alt="" className="w-10 h-10 rounded object-cover" />
                            )}
                            <div>
                              <div className="font-medium text-sm">{rule.cardTitle}</div>
                              {rule.cardSubtitle && (
                                <div className="text-xs text-gray-500">{rule.cardSubtitle}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${getContextBadgeColor(rule.context)}`}>
                            {rule.context.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="font-mono font-medium">{rule.priority}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {rule.pinned && <Star className="w-4 h-4 text-yellow-500 mx-auto" fill="currentColor" />}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleToggleActive(rule)}
                            className={`px-3 py-1 text-xs font-medium rounded-full ${
                              rule.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handlePreview(rule)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(rule)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDuplicate(rule)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(rule.id)}
                              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {total > 20 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} rules
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage(page + 1)}
                    disabled={page * 20 >= total}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full my-8">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {editingRule ? 'Edit Rule' : 'Create New Rule'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Rule Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Rule Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter rule name"
                        maxLength={100}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Optional description"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Context <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.context}
                          onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        >
                          <option value="event_hub">Event Hub</option>
                          <option value="story_chapter">Story Chapter</option>
                          <option value="before">Before</option>
                          <option value="after">After</option>
                          <option value="rewards">Rewards</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Card <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.cardId}
                          onChange={(e) => setFormData({ ...formData, cardId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        >
                          <option value="">Select a card</option>
                          {cards.map((card) => (
                            <option key={card.id} value={card.id}>
                              {card.title} ({card.scope})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.pinned}
                          onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium">Pinned</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Priority & Weights */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Priority & Weights</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Priority (1-100): {formData.priority}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Popularity Boost: {formData.popularityBoost}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.popularityBoost}
                        onChange={(e) => setFormData({ ...formData, popularityBoost: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Time Windows */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Time Windows (Optional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Start Date/Time</label>
                      <input
                        type="datetime-local"
                        value={formData.startsAt}
                        onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">End Date/Time</label>
                      <input
                        type="datetime-local"
                        value={formData.endsAt}
                        onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                {/* Condition Builder */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Conditions</h3>
                  <div className="space-y-3">
                    {conditions.map((condition, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded border">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{condition.conditionType}</div>
                          <div className="text-xs text-gray-500">
                            {JSON.stringify(condition.conditionData)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCondition(index)}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <div className="p-4 border border-dashed rounded">
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <select
                          value={newCondition.conditionType}
                          onChange={(e) => setNewCondition({ ...newCondition, conditionType: e.target.value as any })}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="tier_requirement">User Tier</option>
                          <option value="zone">Zone/Location</option>
                          <option value="time_window">Time Window</option>
                          <option value="custom">Custom</option>
                        </select>

                        {newCondition.conditionType === 'tier_requirement' && (
                          <select
                            onChange={(e) => setNewCondition({ 
                              ...newCondition, 
                              conditionData: { tier: e.target.value } 
                            })}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">Select tier</option>
                            <option value="Bronze">Bronze</option>
                            <option value="Silver">Silver</option>
                            <option value="Gold">Gold</option>
                            <option value="any">Any</option>
                          </select>
                        )}

                        {newCondition.conditionType === 'zone' && (
                          <select
                            onChange={(e) => setNewCondition({ 
                              ...newCondition, 
                              conditionData: { zone: e.target.value } 
                            })}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">Select zone</option>
                            <option value="main-stage">Main Stage</option>
                            <option value="lobby">Lobby</option>
                            <option value="vip-lounge">VIP Lounge</option>
                            <option value="food-court">Food Court</option>
                            <option value="merchandise">Merchandise</option>
                            <option value="any">Any</option>
                          </select>
                        )}

                        <Button
                          type="button"
                          onClick={addCondition}
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          Add Condition
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingRule ? 'Update Rule' : 'Create Rule'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold">Delete Rule</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this rule? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
                <Button
                  onClick={() => setDeleteConfirmId(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && previewData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Rule Preview</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Rule: {previewData.rule.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{previewData.message}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <h5 className="font-medium mb-2">Context: {previewData.rule.context}</h5>
                  <p className="text-sm">Priority: {previewData.rule.priority}</p>
                  <p className="text-sm">Pinned: {previewData.rule.pinned ? 'Yes' : 'No'}</p>
                  <p className="text-sm">Status: {previewData.rule.isActive ? 'Active' : 'Inactive'}</p>
                </div>
                {previewData.rule.conditions && previewData.rule.conditions.length > 0 && (
                  <div>
                    <h5 className="font-medium mb-2">Conditions:</h5>
                    {previewData.rule.conditions.map((condition: Condition, index: number) => (
                      <div key={index} className="p-2 bg-gray-50 dark:bg-gray-900 rounded mb-2 text-sm">
                        {condition.conditionType}: {JSON.stringify(condition.conditionData)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
