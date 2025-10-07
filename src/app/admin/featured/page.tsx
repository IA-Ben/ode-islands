'use client';

import { useState, useEffect } from 'react';
import {
  Star,
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Search,
  Filter,
} from 'lucide-react';
import { surfaces, colors, components } from '@/lib/admin/designTokens';

interface FeaturedRule {
  id: string;
  name: string;
  description?: string;
  context: string;
  cardId: string;
  priority: number;
  pinned: boolean;
  isActive: boolean;
  cardTitle?: string;
  createdAt: string;
}

export default function FeaturedRulesPage() {
  const [rules, setRules] = useState<FeaturedRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [contextFilter, setContextFilter] = useState('');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/featured/rules', {
        credentials: 'same-origin'
      });

      if (response.ok) {
        const data = await response.json();
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
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
      }
    } catch (error) {
      console.error('Error updating rule:', error);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await fetch(`/api/admin/featured/rules/${ruleId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.cardTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesContext = !contextFilter || rule.context === contextFilter;
    return matchesSearch && matchesContext;
  });

  const contexts = [
    { value: '', label: 'All Contexts' },
    { value: 'event_hub', label: 'Event Hub' },
    { value: 'story_chapter', label: 'Story Chapter' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'rewards', label: 'Rewards' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${colors.gradients.primary} flex items-center justify-center shadow-lg`}>
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Featured Rules
                </h1>
                <p className="text-slate-400 mt-1">
                  Manage dynamic featured content rules
                </p>
              </div>
            </div>
            <button className={components.buttonPrimary}>
              <Plus className="w-4 h-4" />
              New Rule
            </button>
          </div>
        </div>

        <div className={`${surfaces.cardGlass} rounded-xl border border-slate-700/50 mb-6`}>
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex gap-4 flex-col md:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 ${surfaces.subtleGlass} border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400`}
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={contextFilter}
                  onChange={(e) => setContextFilter(e.target.value)}
                  className={`pl-10 pr-8 py-2 ${surfaces.subtleGlass} border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400`}
                >
                  {contexts.map(ctx => (
                    <option key={ctx.value} value={ctx.value}>{ctx.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Rule Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Context
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Card
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {rule.pinned && <Star className="w-4 h-4 text-fuchsia-400 fill-fuchsia-400" />}
                        <div>
                          <div className="text-sm font-medium text-white">
                            {rule.name}
                          </div>
                          {rule.description && (
                            <div className="text-xs text-slate-400 mt-1">
                              {rule.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`${components.badge} bg-slate-500/20 text-slate-400`}>
                        {rule.context.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {rule.cardTitle || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`${components.badge} bg-sky-500/20 text-sky-400`}>
                        {rule.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(rule)}
                        className="flex items-center gap-2"
                      >
                        {rule.isActive ? (
                          <>
                            <Power className="w-4 h-4 text-green-400" />
                            <span className={`${components.badge} bg-green-500/20 text-green-400`}>Active</span>
                          </>
                        ) : (
                          <>
                            <PowerOff className="w-4 h-4 text-slate-500" />
                            <span className={`${components.badge} bg-slate-500/20 text-slate-400`}>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-fuchsia-400 hover:text-fuchsia-300">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="text-red-400 hover:text-red-300"
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

          {filteredRules.length === 0 && (
            <div className="text-center py-12">
              <Star className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No featured rules found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
