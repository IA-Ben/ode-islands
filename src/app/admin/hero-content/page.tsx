'use client';

import { useState, useEffect } from 'react';
import { Film, Image as ImageIcon, Save, Plus, Edit, Trash2, Eye, Play } from 'lucide-react';
import { MediaPickerModal } from '@/components/admin/MediaPickerModal';
import { surfaces, components, borders, typography, spacing, pills, focus } from '@/lib/admin/designTokens';

interface MediaAsset {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
}

interface HeroContent {
  id?: string;
  name: string;
  type: 'intro_video' | 'hero_spot' | 'menu_hero';
  title: string;
  subtitle?: string;
  imageMediaId?: string;
  videoMediaId?: string;
  imageMedia?: MediaAsset;
  videoMedia?: MediaAsset;
  ctaPrimary?: {
    label: string;
    action: 'story' | 'app' | 'url';
    target?: string;
  };
  ctaSecondary?: {
    label: string;
    action: 'story' | 'app' | 'url';
    target?: string;
  };
  settings?: {
    loop?: boolean;
    autoplay?: boolean;
    muted?: boolean;
    showOnLaunch?: boolean;
  };
  isActive: boolean;
}

export default function HeroContentPage() {
  const [heroContents, setHeroContents] = useState<HeroContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingContent, setEditingContent] = useState<HeroContent | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerType, setMediaPickerType] = useState<'image' | 'video'>('image');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHeroContents();
  }, []);

  const fetchHeroContents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/hero-content');
      if (response.ok) {
        const data = await response.json();
        setHeroContents(data.contents || []);
      }
    } catch (error) {
      console.error('Error fetching hero contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingContent({
      name: '',
      type: 'intro_video',
      title: '',
      subtitle: '',
      isActive: false,
      settings: {
        loop: true,
        autoplay: true,
        muted: true,
        showOnLaunch: false,
      },
    });
    setShowEditor(true);
  };

  const handleEdit = (content: HeroContent) => {
    setEditingContent(content);
    setShowEditor(true);
  };

  const handleDelete = async (content: HeroContent) => {
    if (!confirm(`Delete "${content.name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/admin/hero-content/${content.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchHeroContents();
      }
    } catch (error) {
      console.error('Error deleting hero content:', error);
      alert('Failed to delete hero content');
    }
  };

  const handleSave = async () => {
    if (!editingContent) return;

    try {
      setSaving(true);
      const url = editingContent.id
        ? `/api/admin/hero-content/${editingContent.id}`
        : '/api/admin/hero-content';
      const method = editingContent.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingContent),
      });

      if (response.ok) {
        setShowEditor(false);
        setEditingContent(null);
        fetchHeroContents();
      } else {
        alert('Failed to save hero content');
      }
    } catch (error) {
      console.error('Error saving hero content:', error);
      alert('Failed to save hero content');
    } finally {
      setSaving(false);
    }
  };

  const handleMediaSelect = (asset: MediaAsset) => {
    if (!editingContent) return;

    if (mediaPickerType === 'image') {
      setEditingContent({
        ...editingContent,
        imageMediaId: asset.id,
        imageMedia: asset,
      });
    } else {
      setEditingContent({
        ...editingContent,
        videoMediaId: asset.id,
        videoMedia: asset,
      });
    }
    setShowMediaPicker(false);
  };

  if (showEditor && editingContent) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className={typography.h1}>
                {editingContent.id ? 'Edit Hero Content' : 'Create Hero Content'}
              </h1>
              <p className="text-slate-400 mt-1">
                Configure intro videos, hero spots, and menu heroes
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditor(false);
                  setEditingContent(null);
                }}
                className={components.buttonSecondary}
              >
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className={components.buttonPrimary}>
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6 space-y-4`}>
              <h3 className={typography.h3}>Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={editingContent.name}
                  onChange={(e) => setEditingContent({ ...editingContent, name: e.target.value })}
                  className={components.input}
                  placeholder="e.g., 'Main Intro Video' or 'Summer Festival Hero'"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Type *</label>
                <select
                  value={editingContent.type}
                  onChange={(e) =>
                    setEditingContent({
                      ...editingContent,
                      type: e.target.value as HeroContent['type'],
                    })
                  }
                  className={components.input}
                >
                  <option value="intro_video">Intro Video (Launch Screen)</option>
                  <option value="hero_spot">Hero Spot (In-App)</option>
                  <option value="menu_hero">Menu Hero</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={editingContent.title}
                  onChange={(e) => setEditingContent({ ...editingContent, title: e.target.value })}
                  className={components.input}
                  placeholder="Welcome to The Ode Islands"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Subtitle</label>
                <textarea
                  value={editingContent.subtitle || ''}
                  onChange={(e) => setEditingContent({ ...editingContent, subtitle: e.target.value })}
                  className={components.input}
                  rows={2}
                  placeholder="Experience immersive storytelling like never before"
                />
              </div>
            </div>

            {/* Media */}
            <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6 space-y-4`}>
              <h3 className={typography.h3}>Media Assets</h3>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-300">Background Image</label>
                  <button
                    onClick={() => {
                      setMediaPickerType('image');
                      setShowMediaPicker(true);
                    }}
                    className="text-sm text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1"
                  >
                    <ImageIcon className="w-4 h-4" />
                    {editingContent.imageMedia ? 'Change' : 'Select'} Image
                  </button>
                </div>
                {editingContent.imageMedia && (
                  <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                    {editingContent.imageMedia.thumbnailUrl && (
                      <img
                        src={editingContent.imageMedia.thumbnailUrl}
                        alt="Background"
                        className="w-16 h-16 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {editingContent.imageMedia.fileName}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {(editingContent.imageMedia.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setEditingContent({ ...editingContent, imageMediaId: undefined, imageMedia: undefined })
                      }
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-300">
                    {editingContent.type === 'intro_video' ? 'Intro Video *' : 'Background Video (Optional)'}
                  </label>
                  <button
                    onClick={() => {
                      setMediaPickerType('video');
                      setShowMediaPicker(true);
                    }}
                    className="text-sm text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1"
                  >
                    <Film className="w-4 h-4" />
                    {editingContent.videoMedia ? 'Change' : 'Select'} Video
                  </button>
                </div>
                {editingContent.videoMedia && (
                  <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <div className="w-16 h-16 bg-slate-700 rounded flex items-center justify-center">
                      <Film className="w-8 h-8 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {editingContent.videoMedia.fileName}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {(editingContent.videoMedia.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setEditingContent({ ...editingContent, videoMediaId: undefined, videoMedia: undefined })
                      }
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CTAs */}
            <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6 space-y-4`}>
              <h3 className={typography.h3}>Call-to-Action Buttons</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Primary CTA</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={editingContent.ctaPrimary?.label || ''}
                      onChange={(e) =>
                        setEditingContent({
                          ...editingContent,
                          ctaPrimary: { ...editingContent.ctaPrimary, label: e.target.value, action: 'story' },
                        })
                      }
                      className={components.input}
                      placeholder="Button text"
                    />
                    <select
                      value={editingContent.ctaPrimary?.action || 'story'}
                      onChange={(e) =>
                        setEditingContent({
                          ...editingContent,
                          ctaPrimary: {
                            ...editingContent.ctaPrimary,
                            label: editingContent.ctaPrimary?.label || '',
                            action: e.target.value as 'story' | 'app' | 'url',
                          },
                        })
                      }
                      className={components.input}
                    >
                      <option value="story">Go to Story</option>
                      <option value="app">Go to App UI</option>
                      <option value="url">Custom URL</option>
                    </select>
                    <input
                      type="text"
                      value={editingContent.ctaPrimary?.target || ''}
                      onChange={(e) =>
                        setEditingContent({
                          ...editingContent,
                          ctaPrimary: { ...editingContent.ctaPrimary, label: editingContent.ctaPrimary?.label || '', action: editingContent.ctaPrimary?.action || 'story', target: e.target.value },
                        })
                      }
                      className={components.input}
                      placeholder="Target (optional)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Secondary CTA (Optional)</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={editingContent.ctaSecondary?.label || ''}
                      onChange={(e) =>
                        setEditingContent({
                          ...editingContent,
                          ctaSecondary: { ...editingContent.ctaSecondary, label: e.target.value, action: 'app' },
                        })
                      }
                      className={components.input}
                      placeholder="Button text"
                    />
                    <select
                      value={editingContent.ctaSecondary?.action || 'app'}
                      onChange={(e) =>
                        setEditingContent({
                          ...editingContent,
                          ctaSecondary: {
                            ...editingContent.ctaSecondary,
                            label: editingContent.ctaSecondary?.label || '',
                            action: e.target.value as 'story' | 'app' | 'url',
                          },
                        })
                      }
                      className={components.input}
                    >
                      <option value="story">Go to Story</option>
                      <option value="app">Go to App UI</option>
                      <option value="url">Custom URL</option>
                    </select>
                    <input
                      type="text"
                      value={editingContent.ctaSecondary?.target || ''}
                      onChange={(e) =>
                        setEditingContent({
                          ...editingContent,
                          ctaSecondary: { ...editingContent.ctaSecondary, label: editingContent.ctaSecondary?.label || '', action: editingContent.ctaSecondary?.action || 'app', target: e.target.value },
                        })
                      }
                      className={components.input}
                      placeholder="Target (optional)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6 space-y-4`}>
              <h3 className={typography.h3}>Settings</h3>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingContent.settings?.loop || false}
                    onChange={(e) =>
                      setEditingContent({
                        ...editingContent,
                        settings: { ...editingContent.settings, loop: e.target.checked },
                      })
                    }
                    className={focus.ring}
                  />
                  <span className="text-slate-300">Loop video</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingContent.settings?.autoplay || false}
                    onChange={(e) =>
                      setEditingContent({
                        ...editingContent,
                        settings: { ...editingContent.settings, autoplay: e.target.checked },
                      })
                    }
                    className={focus.ring}
                  />
                  <span className="text-slate-300">Autoplay video</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingContent.settings?.muted || false}
                    onChange={(e) =>
                      setEditingContent({
                        ...editingContent,
                        settings: { ...editingContent.settings, muted: e.target.checked },
                      })
                    }
                    className={focus.ring}
                  />
                  <span className="text-slate-300">Mute by default</span>
                </label>

                {editingContent.type === 'intro_video' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingContent.settings?.showOnLaunch || false}
                      onChange={(e) =>
                        setEditingContent({
                          ...editingContent,
                          settings: { ...editingContent.settings, showOnLaunch: e.target.checked },
                        })
                      }
                      className={focus.ring}
                    />
                    <span className="text-slate-300">Show on app launch</span>
                  </label>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingContent.isActive}
                    onChange={(e) => setEditingContent({ ...editingContent, isActive: e.target.checked })}
                    className={focus.ring}
                  />
                  <span className="text-slate-300">Active (visible to users)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {showMediaPicker && (
          <MediaPickerModal
            isOpen={showMediaPicker}
            onClose={() => setShowMediaPicker(false)}
            onSelect={handleMediaSelect}
            accept={mediaPickerType}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={typography.h1}>Hero Content</h1>
            <p className="text-slate-400 mt-1">
              Manage intro videos, hero spots, and menu heroes with images and videos
            </p>
          </div>
          <button onClick={handleCreate} className={components.buttonPrimary}>
            <Plus className="w-4 h-4" />
            Create Hero Content
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : heroContents.length === 0 ? (
          <div className={`${components.card} text-center py-12`}>
            <Film className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <div className={typography.h3}>No hero content yet</div>
            <p className="text-slate-400 mt-2">Create your first intro video or hero spot to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {heroContents.map((content) => (
              <div
                key={content.id}
                className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-4 hover:border-fuchsia-500/30 transition-all`}
              >
                <div className="aspect-video bg-slate-800 rounded-lg mb-4 relative overflow-hidden">
                  {content.videoMedia?.thumbnailUrl || content.imageMedia?.thumbnailUrl ? (
                    <img
                      src={content.videoMedia?.thumbnailUrl || content.imageMedia?.thumbnailUrl}
                      alt={content.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Film className="w-12 h-12 text-slate-600" />
                    </div>
                  )}
                  {content.videoMedia && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-12 h-12 text-white/80" />
                    </div>
                  )}
                  {content.isActive && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-green-500/90 text-white text-xs rounded-full">Active</span>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <h3 className={typography.h3}>{content.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{content.type.replace('_', ' ').toUpperCase()}</p>
                  <p className="text-white mt-2">{content.title}</p>
                  {content.subtitle && <p className="text-slate-400 text-sm mt-1 line-clamp-2">{content.subtitle}</p>}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(content)}
                    className={`${components.buttonSecondary} flex-1`}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(content)}
                    className={`${pills.base} p-2 ${surfaces.darkGlass} ${borders.glassBorder} text-red-400 hover:text-red-300`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
