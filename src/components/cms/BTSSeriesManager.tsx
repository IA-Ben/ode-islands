'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Video, Image as ImageIcon } from 'lucide-react';
import { surfaces, colors, components, borders, focus } from '@/lib/admin/designTokens';

interface BTSSeries {
  id: string;
  title: string;
  description: string | null;
  autoPlayNext: boolean;
  mixOfficialAndUGC: boolean;
  coverImageMediaId: string | null;
  publishStatus: string;
  isActive: boolean;
  coverImage?: {
    id: string;
    cloudUrl: string;
  } | null;
  videoCount: number;
}

interface BTSSeriesManagerProps {
  csrfToken: string;
}

export function BTSSeriesManager({ csrfToken }: BTSSeriesManagerProps) {
  const [series, setSeries] = useState<BTSSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSeries, setEditingSeries] = useState<BTSSeries | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    autoPlayNext: false,
    mixOfficialAndUGC: false,
    coverImageMediaId: '',
    publishStatus: 'draft',
    isActive: true,
  });

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/bts-series');
      if (response.ok) {
        const data = await response.json();
        setSeries(data.series || []);
      }
    } catch (error) {
      console.error('Error fetching BTS series:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingSeries
      ? `/api/admin/bts-series/${editingSeries.id}`
      : '/api/admin/bts-series';

    const method = editingSeries ? 'PATCH' : 'POST';

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
        fetchSeries();
        handleCloseForm();
      }
    } catch (error) {
      console.error('Error saving BTS series:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this series?')) return;

    try {
      const response = await fetch(`/api/admin/bts-series/${id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      if (response.ok) {
        fetchSeries();
      }
    } catch (error) {
      console.error('Error deleting BTS series:', error);
    }
  };

  const handleEdit = (seriesItem: BTSSeries) => {
    setEditingSeries(seriesItem);
    setFormData({
      title: seriesItem.title,
      description: seriesItem.description || '',
      autoPlayNext: seriesItem.autoPlayNext,
      mixOfficialAndUGC: seriesItem.mixOfficialAndUGC,
      coverImageMediaId: seriesItem.coverImageMediaId || '',
      publishStatus: seriesItem.publishStatus,
      isActive: seriesItem.isActive,
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingSeries(null);
    setFormData({
      title: '',
      description: '',
      autoPlayNext: false,
      mixOfficialAndUGC: false,
      coverImageMediaId: '',
      publishStatus: 'draft',
      isActive: true,
    });
  };

  if (loading) {
    return <div className="text-white">Loading BTS series...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">BTS Video Series</h3>
        <button
          onClick={() => setShowForm(true)}
          className={`${components.buttonPrimary} flex items-center gap-2`}
        >
          <Plus className="w-4 h-4" />
          Add Series
        </button>
      </div>

      {/* Series List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {series.map((seriesItem) => (
          <div
            key={seriesItem.id}
            className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} overflow-hidden hover:bg-white/10 transition-all ${focus.ring}`}
          >
            {/* Cover Image */}
            <div className="relative h-48 bg-gradient-to-br from-purple-900/50 to-fuchsia-900/50">
              {seriesItem.coverImage ? (
                <img
                  src={seriesItem.coverImage.cloudUrl}
                  alt={seriesItem.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="w-16 h-16 text-slate-600" />
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={() => handleEdit(seriesItem)}
                  className="p-2 bg-slate-900/80 backdrop-blur-sm rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Edit className="w-4 h-4 text-slate-300 hover:text-fuchsia-400" />
                </button>
                <button
                  onClick={() => handleDelete(seriesItem.id)}
                  className="p-2 bg-slate-900/80 backdrop-blur-sm rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-slate-300 hover:text-red-400" />
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <h4 className="font-bold text-white mb-2">{seriesItem.title}</h4>
              {seriesItem.description && (
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">{seriesItem.description}</p>
              )}
              
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`inline-flex px-2 py-1 text-xs rounded ${seriesItem.publishStatus === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                  {seriesItem.publishStatus}
                </span>
                <span className="inline-flex px-2 py-1 text-xs rounded bg-fuchsia-500/20 text-fuchsia-400">
                  {seriesItem.videoCount} videos
                </span>
              </div>

              <div className="flex gap-2 text-xs text-slate-500">
                {seriesItem.autoPlayNext && <span>• Auto-play</span>}
                {seriesItem.mixOfficialAndUGC && <span>• Mixed content</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingSeries ? 'Edit Series' : 'Add New Series'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Cover Image Media ID</label>
                <input
                  type="text"
                  value={formData.coverImageMediaId}
                  onChange={(e) => setFormData({ ...formData, coverImageMediaId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                  placeholder="Select from Media Library"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoPlayNext"
                    checked={formData.autoPlayNext}
                    onChange={(e) => setFormData({ ...formData, autoPlayNext: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-fuchsia-500 focus:ring-fuchsia-500"
                  />
                  <label htmlFor="autoPlayNext" className="text-sm text-slate-300">Auto-play next</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mixOfficialAndUGC"
                    checked={formData.mixOfficialAndUGC}
                    onChange={(e) => setFormData({ ...formData, mixOfficialAndUGC: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-fuchsia-500 focus:ring-fuchsia-500"
                  />
                  <label htmlFor="mixOfficialAndUGC" className="text-sm text-slate-300">Mix official & UGC</label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Publish Status</label>
                  <select
                    value={formData.publishStatus}
                    onChange={(e) => setFormData({ ...formData, publishStatus: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                  >
                    <option value="draft">Draft</option>
                    <option value="in_review">In Review</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-fuchsia-500 focus:ring-fuchsia-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-slate-300">Active</label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className={`flex-1 ${components.buttonPrimary}`}
                >
                  {editingSeries ? 'Update Series' : 'Create Series'}
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
