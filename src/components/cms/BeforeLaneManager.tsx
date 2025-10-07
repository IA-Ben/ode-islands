'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { surfaces, colors, components, borders, focus } from '@/lib/admin/designTokens';

interface BeforeLane {
  id: string;
  eventId: string | null;
  laneKey: string;
  title: string;
  description: string | null;
  iconName: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BeforeLaneManagerProps {
  csrfToken: string;
  onLaneSelect?: (laneId: string) => void;
}

export function BeforeLaneManager({ csrfToken, onLaneSelect }: BeforeLaneManagerProps) {
  const [lanes, setLanes] = useState<BeforeLane[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLane, setEditingLane] = useState<BeforeLane | null>(null);
  
  const [formData, setFormData] = useState({
    laneKey: '',
    title: '',
    description: '',
    iconName: '',
    order: 0,
    isActive: true,
  });

  useEffect(() => {
    fetchLanes();
  }, []);

  const fetchLanes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/before-lanes');
      if (response.ok) {
        const data = await response.json();
        setLanes(data.lanes || []);
      }
    } catch (error) {
      console.error('Error fetching before lanes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingLane
      ? `/api/admin/before-lanes/${editingLane.id}`
      : '/api/admin/before-lanes';

    const method = editingLane ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchLanes();
        handleCloseForm();
      }
    } catch (error) {
      console.error('Error saving before lane:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lane?')) return;

    try {
      const response = await fetch(`/api/admin/before-lanes/${id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      if (response.ok) {
        fetchLanes();
      }
    } catch (error) {
      console.error('Error deleting before lane:', error);
    }
  };

  const handleEdit = (lane: BeforeLane) => {
    setEditingLane(lane);
    setFormData({
      laneKey: lane.laneKey,
      title: lane.title,
      description: lane.description || '',
      iconName: lane.iconName || '',
      order: lane.order,
      isActive: lane.isActive,
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingLane(null);
    setFormData({
      laneKey: '',
      title: '',
      description: '',
      iconName: '',
      order: 0,
      isActive: true,
    });
  };

  const laneKeyOptions = ['plan', 'discover', 'community', 'bts'];

  if (loading) {
    return <div className="text-white">Loading lanes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Before Section Lanes</h3>
        <button
          onClick={() => setShowForm(true)}
          className={`${components.buttonPrimary} flex items-center gap-2`}
        >
          <Plus className="w-4 h-4" />
          Add Lane
        </button>
      </div>

      {/* Lane List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {lanes.map((lane) => (
          <div
            key={lane.id}
            className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-4 cursor-pointer hover:bg-white/10 transition-all ${focus.ring}`}
            onClick={() => onLaneSelect?.(lane.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-slate-400" />
                <div className="text-xs font-semibold text-fuchsia-400 uppercase tracking-wide">
                  {lane.laneKey}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(lane);
                  }}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <Edit className="w-4 h-4 text-slate-400 hover:text-fuchsia-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(lane.id);
                  }}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                </button>
              </div>
            </div>
            <h4 className="font-bold text-white mb-1">{lane.title}</h4>
            {lane.description && (
              <p className="text-sm text-slate-400 line-clamp-2">{lane.description}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex px-2 py-1 text-xs rounded ${lane.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                {lane.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs text-slate-500">Order: {lane.order}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingLane ? 'Edit Lane' : 'Add New Lane'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Lane Key</label>
                <select
                  value={formData.laneKey}
                  onChange={(e) => setFormData({ ...formData, laneKey: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                  required
                  disabled={!!editingLane}
                >
                  <option value="">Select a lane...</option>
                  {laneKeyOptions.map((key) => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Icon Name</label>
                  <input
                    type="text"
                    value={formData.iconName}
                    onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                    placeholder="e.g., Calendar, Map"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
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
                  {editingLane ? 'Update Lane' : 'Create Lane'}
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
