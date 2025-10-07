'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Star, Eye, Copy, Power, PowerOff } from 'lucide-react';
import { surfaces, colors, components, borders, focus } from '@/lib/admin/designTokens';

interface FeaturedRule {
  id: string;
  name: string;
  description: string | null;
  context: string;
  cardId: string;
  priority: number;
  pinned: boolean;
  popularityBoost: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  cardTitle?: string;
  imageUrl?: string;
}

interface FeaturedRulesBuilderProps {
  csrfToken: string;
}

const CONTEXT_OPTIONS = [
  { value: 'before_featured', label: 'Before - Featured Hero' },
  { value: 'before_discover', label: 'Before - Discover' },
  { value: 'event_hub', label: 'Event Hub' },
  { value: 'after', label: 'After Experience' },
];

export function FeaturedRulesBuilder({ csrfToken }: FeaturedRulesBuilderProps) {
  const [rules, setRules] = useState<FeaturedRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<FeaturedRule | null>(null);
  const [contextFilter, setContextFilter] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    context: 'before_featured',
    cardId: '',
    priority: 0,
    pinned: false,
    popularityBoost: 0,
    startsAt: '',
    endsAt: '',
    isActive: true,
  });

  useEffect(() => {
    fetchRules();
  }, [contextFilter]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const url = contextFilter
        ? `/api/admin/featured/rules?context=${contextFilter}`
        : '/api/admin/featured/rules';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error('Error fetching featured rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingRule
      ? `/api/admin/featured/rules/${editingRule.id}`
      : '/api/admin/featured/rules';

    const method = editingRule ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          ...formData,
          startsAt: formData.startsAt || null,
          endsAt: formData.endsAt || null,
        }),
      });

      if (response.ok) {
        fetchRules();
        handleCloseForm();
      }
    } catch (error) {
      console.error('Error saving featured rule:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await fetch(`/api/admin/featured/rules/${id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Error deleting featured rule:', error);
    }
  };

  const handleToggleActive = async (rule: FeaturedRule) => {
    try {
      const response = await fetch(`/api/admin/featured/rules/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/featured/rules/${id}/duplicate`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Error duplicating rule:', error);
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
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      context: 'before_featured',
      cardId: '',
      priority: 0,
      pinned: false,
      popularityBoost: 0,
      startsAt: '',
      endsAt: '',
      isActive: true,
    });
  };

  const groupedRules = rules.reduce((acc, rule) => {
    if (!acc[rule.context]) {
      acc[rule.context] = [];
    }
    acc[rule.context].push(rule);
    return acc;
  }, {} as Record<string, FeaturedRule[]>);

  if (loading) {
    return <div className="text-white">Loading featured rules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-white">Featured Rules</h3>
          <select
            value={contextFilter}
            onChange={(e) => setContextFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
          >
            <option value="">All Contexts</option>
            {CONTEXT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className={`${components.buttonPrimary} flex items-center gap-2`}
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      {/* Rules List - Grouped by Context */}
      <div className="space-y-6">
        {Object.entries(groupedRules).map(([context, contextRules]) => (
          <div key={context}>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              {CONTEXT_OPTIONS.find(opt => opt.value === context)?.label || context}
            </h4>
            <div className="space-y-2">
              {contextRules
                .sort((a, b) => b.priority - a.priority)
                .map((rule) => (
                  <div
                    key={rule.id}
                    className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-4 hover:bg-white/10 transition-all ${focus.ring}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Card Preview */}
                      {rule.imageUrl && (
                        <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                          <img
                            src={rule.imageUrl}
                            alt={rule.cardTitle}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Rule Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {rule.pinned && (
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              )}
                              <h5 className="font-bold text-white">{rule.name}</h5>
                            </div>
                            {rule.description && (
                              <p className="text-sm text-slate-400 mb-2">{rule.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="px-2 py-1 bg-fuchsia-500/20 text-fuchsia-400 rounded">
                                {rule.cardTitle || 'Card ' + rule.cardId.slice(0, 8)}
                              </span>
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                                Priority: {rule.priority}
                              </span>
                              {rule.popularityBoost > 0 && (
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                                  +{rule.popularityBoost} boost
                                </span>
                              )}
                              {rule.startsAt && (
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
                                  {new Date(rule.startsAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleActive(rule)}
                              className="p-2 rounded hover:bg-white/10 transition-colors"
                              title={rule.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {rule.isActive ? (
                                <Power className="w-4 h-4 text-green-400" />
                              ) : (
                                <PowerOff className="w-4 h-4 text-slate-500" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDuplicate(rule.id)}
                              className="p-2 rounded hover:bg-white/10 transition-colors"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4 text-slate-400 hover:text-fuchsia-400" />
                            </button>
                            <button
                              onClick={() => handleEdit(rule)}
                              className="p-2 rounded hover:bg-white/10 transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4 text-slate-400 hover:text-fuchsia-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(rule.id)}
                              className="p-2 rounded hover:bg-white/10 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto`}>
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingRule ? 'Edit Featured Rule' : 'Add New Featured Rule'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Rule Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Context</label>
                  <select
                    value={formData.context}
                    onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                    required
                  >
                    {CONTEXT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Card ID</label>
                <input
                  type="text"
                  value={formData.cardId}
                  onChange={(e) => setFormData({ ...formData, cardId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                  placeholder="Select card from Card Library"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Popularity Boost</label>
                  <input
                    type="number"
                    value={formData.popularityBoost}
                    onChange={(e) => setFormData({ ...formData, popularityBoost: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                  />
                </div>

                <div className="flex items-end">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="pinned"
                      checked={formData.pinned}
                      onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-fuchsia-500 focus:ring-fuchsia-500"
                    />
                    <label htmlFor="pinned" className="text-sm text-slate-300">Pinned</label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Starts At</label>
                  <input
                    type="datetime-local"
                    value={formData.startsAt}
                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ends At</label>
                  <input
                    type="datetime-local"
                    value={formData.endsAt}
                    onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-fuchsia-500 focus:ring-fuchsia-500"
                />
                <label htmlFor="isActive" className="text-sm text-slate-300">Active</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className={`flex-1 ${components.buttonPrimary}`}
                >
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className={`flex-1 ${components.buttonSecondary}`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
