'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Image as ImageIcon, Layout } from 'lucide-react';
import { surfaces, colors, components, borders, focus } from '@/lib/admin/designTokens';

interface ConceptArtCollection {
  id: string;
  title: string;
  description: string | null;
  coverLayout: string;
  showWatermark: boolean;
  allowDownload: boolean;
  publishStatus: string;
  isActive: boolean;
  imageCount: number;
}

interface ConceptArtManagerProps {
  csrfToken: string;
}

export function ConceptArtManager({ csrfToken }: ConceptArtManagerProps) {
  const [collections, setCollections] = useState<ConceptArtCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState<ConceptArtCollection | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coverLayout: 'mosaic',
    showWatermark: false,
    allowDownload: false,
    publishStatus: 'draft',
    isActive: true,
  });

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/concept-art');
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections || []);
      }
    } catch (error) {
      console.error('Error fetching concept art collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingCollection
      ? `/api/admin/concept-art/${editingCollection.id}`
      : '/api/admin/concept-art';

    const method = editingCollection ? 'PATCH' : 'POST';

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
        fetchCollections();
        handleCloseForm();
      }
    } catch (error) {
      console.error('Error saving concept art collection:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      const response = await fetch(`/api/admin/concept-art/${id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      if (response.ok) {
        fetchCollections();
      }
    } catch (error) {
      console.error('Error deleting concept art collection:', error);
    }
  };

  const handleEdit = (collection: ConceptArtCollection) => {
    setEditingCollection(collection);
    setFormData({
      title: collection.title,
      description: collection.description || '',
      coverLayout: collection.coverLayout,
      showWatermark: collection.showWatermark,
      allowDownload: collection.allowDownload,
      publishStatus: collection.publishStatus,
      isActive: collection.isActive,
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCollection(null);
    setFormData({
      title: '',
      description: '',
      coverLayout: 'mosaic',
      showWatermark: false,
      allowDownload: false,
      publishStatus: 'draft',
      isActive: true,
    });
  };

  if (loading) {
    return <div className="text-white">Loading concept art collections...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Concept Art Collections</h3>
        <button
          onClick={() => setShowForm(true)}
          className={`${components.buttonPrimary} flex items-center gap-2`}
        >
          <Plus className="w-4 h-4" />
          Add Collection
        </button>
      </div>

      {/* Collections List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((collection) => (
          <div
            key={collection.id}
            className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-4 hover:bg-white/10 transition-all ${focus.ring}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layout className={`w-5 h-5 ${collection.coverLayout === 'mosaic' ? 'text-fuchsia-400' : 'text-purple-400'}`} />
                <span className="text-xs font-semibold text-slate-400 uppercase">{collection.coverLayout}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(collection)}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <Edit className="w-4 h-4 text-slate-400 hover:text-fuchsia-400" />
                </button>
                <button
                  onClick={() => handleDelete(collection.id)}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                </button>
              </div>
            </div>

            <h4 className="font-bold text-white mb-2">{collection.title}</h4>
            {collection.description && (
              <p className="text-sm text-slate-400 mb-3 line-clamp-2">{collection.description}</p>
            )}
            
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`inline-flex px-2 py-1 text-xs rounded ${collection.publishStatus === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                {collection.publishStatus}
              </span>
              <span className="inline-flex px-2 py-1 text-xs rounded bg-fuchsia-500/20 text-fuchsia-400">
                {collection.imageCount} images
              </span>
            </div>

            <div className="flex gap-2 text-xs text-slate-500">
              {collection.showWatermark && <span>• Watermarked</span>}
              {collection.allowDownload && <span>• Downloadable</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingCollection ? 'Edit Collection' : 'Add New Collection'}
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
                <label className="block text-sm font-medium text-slate-300 mb-2">Cover Layout</label>
                <select
                  value={formData.coverLayout}
                  onChange={(e) => setFormData({ ...formData, coverLayout: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                >
                  <option value="mosaic">Mosaic</option>
                  <option value="strip">Strip</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showWatermark"
                    checked={formData.showWatermark}
                    onChange={(e) => setFormData({ ...formData, showWatermark: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-fuchsia-500 focus:ring-fuchsia-500"
                  />
                  <label htmlFor="showWatermark" className="text-sm text-slate-300">Show watermark</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowDownload"
                    checked={formData.allowDownload}
                    onChange={(e) => setFormData({ ...formData, allowDownload: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-fuchsia-500 focus:ring-fuchsia-500"
                  />
                  <label htmlFor="allowDownload" className="text-sm text-slate-300">Allow download</label>
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
                  {editingCollection ? 'Update Collection' : 'Create Collection'}
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
