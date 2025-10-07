'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Video, Save, Upload } from 'lucide-react';
import { surfaces, components, borders } from '@/lib/admin/designTokens';
import { DirectMediaUpload } from './DirectMediaUpload';

interface BeforeHeroSettings {
  imageMediaId: string | null;
  videoMediaId: string | null;
  title: string | null;
  subtitle: string | null;
  showAnimation: boolean;
}

interface BeforeHeroManagerProps {
  csrfToken: string;
}

export function BeforeHeroManager({ csrfToken: initialCsrfToken }: BeforeHeroManagerProps) {
  const [csrfToken, setCsrfToken] = useState(initialCsrfToken);

  useEffect(() => {
    // Fetch CSRF token from API if not provided
    if (!csrfToken) {
      fetch('/api/csrf-token')
        .then(res => res.json())
        .then(data => {
          if (data.csrfToken) {
            setCsrfToken(data.csrfToken);
          } else if (data.data) {
            setCsrfToken(data.data);
          }
        })
        .catch(err => console.error('Failed to fetch CSRF token:', err));
    }
  }, [csrfToken]);
  const [settings, setSettings] = useState<BeforeHeroSettings>({
    imageMediaId: null,
    videoMediaId: null,
    title: null,
    subtitle: null,
    showAnimation: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showVideoUpload, setShowVideoUpload] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/before/hero-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Error fetching hero settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/before/hero-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Hero settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving hero settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-white">Loading hero settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Before Page Hero Settings</h3>
          <p className="text-sm text-slate-400 mt-1">Configure the main hero section on the Before page</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`${components.buttonPrimary} flex items-center gap-2`}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image/Video Settings */}
        <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6 space-y-4`}>
          <h4 className="font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-fuchsia-400" />
            Hero Media
          </h4>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-300">Hero Image</label>
              <button
                onClick={() => setShowImageUpload(!showImageUpload)}
                className="text-sm text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1"
              >
                <Upload className="w-4 h-4" />
                {showImageUpload ? 'Enter ID' : 'Upload New'}
              </button>
            </div>

            {showImageUpload ? (
              <DirectMediaUpload
                acceptedTypes="image"
                csrfToken={csrfToken}
                onUploadComplete={(mediaAssetId) => {
                  setSettings({ ...settings, imageMediaId: mediaAssetId });
                  setShowImageUpload(false);
                }}
              />
            ) : (
              <>
                <input
                  type="text"
                  value={settings.imageMediaId || ''}
                  onChange={(e) => setSettings({ ...settings, imageMediaId: e.target.value || null })}
                  placeholder="Enter media ID from Media Library"
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                />
                <p className="text-xs text-slate-500 mt-1">Background image for hero section</p>
              </>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-300">Hero Video</label>
              <button
                onClick={() => setShowVideoUpload(!showVideoUpload)}
                className="text-sm text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1"
              >
                <Upload className="w-4 h-4" />
                {showVideoUpload ? 'Enter ID' : 'Upload New'}
              </button>
            </div>

            {showVideoUpload ? (
              <DirectMediaUpload
                acceptedTypes="video"
                csrfToken={csrfToken}
                onUploadComplete={(mediaAssetId) => {
                  setSettings({ ...settings, videoMediaId: mediaAssetId });
                  setShowVideoUpload(false);
                }}
              />
            ) : (
              <>
                <input
                  type="text"
                  value={settings.videoMediaId || ''}
                  onChange={(e) => setSettings({ ...settings, videoMediaId: e.target.value || null })}
                  placeholder="Enter media ID from Media Library"
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                />
                <p className="text-xs text-slate-500 mt-1">Background video for hero section (optional)</p>
              </>
            )}
          </div>
        </div>

        {/* Text Content */}
        <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6 space-y-4`}>
          <h4 className="font-bold text-white">Hero Text Content</h4>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Hero Title</label>
            <input
              type="text"
              value={settings.title || ''}
              onChange={(e) => setSettings({ ...settings, title: e.target.value || null })}
              placeholder="Enter hero title"
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Hero Subtitle</label>
            <textarea
              value={settings.subtitle || ''}
              onChange={(e) => setSettings({ ...settings, subtitle: e.target.value || null })}
              placeholder="Enter hero subtitle/description"
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showAnimation"
              checked={settings.showAnimation}
              onChange={(e) => setSettings({ ...settings, showAnimation: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-fuchsia-500 focus:ring-fuchsia-500"
            />
            <label htmlFor="showAnimation" className="text-sm text-slate-300">
              Show opening animation
            </label>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6`}>
        <h4 className="font-bold text-white mb-4">Preview</h4>
        <div className="relative h-64 bg-slate-900 rounded-lg overflow-hidden">
          {settings.imageMediaId ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-fuchsia-900/50">
              <div className="text-center space-y-2">
                <h2 className="text-4xl font-bold text-white">{settings.title || 'Hero Title'}</h2>
                <p className="text-xl text-slate-300">{settings.subtitle || 'Hero subtitle appears here'}</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                <p>Add hero image/video to see preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
