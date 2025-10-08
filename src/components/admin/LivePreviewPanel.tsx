'use client';

import { useState } from 'react';
import { Smartphone, Monitor, RefreshCw, Eye, EyeOff, Maximize2 } from 'lucide-react';
import { surfaces, colors, components } from '@/lib/admin/designTokens';

interface LivePreviewPanelProps {
  contentType: 'event' | 'story' | 'chapter' | 'card';
  contentId: string;
  previewUrl?: string;
}

export function LivePreviewPanel({ contentType, contentId, previewUrl }: LivePreviewPanelProps) {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
      const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = iframe.src;
      }
    }, 500);
  };

  const getPreviewUrl = () => {
    if (previewUrl) return previewUrl;

    switch (contentType) {
      case 'event':
        return `/event?preview=true&id=${contentId}`;
      case 'story':
      case 'chapter':
        return `/before?preview=true&id=${contentId}`;
      case 'card':
        return `/before/story/${contentId}?preview=true`;
      default:
        return '/';
    }
  };

  const deviceDimensions = {
    mobile: { width: 375, height: 667 },
    desktop: { width: 1280, height: 720 },
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className={`${components.buttonSecondary} fixed bottom-6 right-6 z-40`}
      >
        <Eye className="w-4 h-4" />
        Show Preview
      </button>
    );
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 p-4">
        <div className="h-full flex flex-col">
          {/* Fullscreen Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-white">Live Preview</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setDevice('mobile')}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    device === 'mobile'
                      ? 'bg-fuchsia-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDevice('desktop')}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    device === 'desktop'
                      ? 'bg-fuchsia-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition"
              >
                Exit Fullscreen
              </button>
            </div>
          </div>

          {/* Fullscreen Preview */}
          <div className="flex-1 flex items-center justify-center">
            <div
              className={`${surfaces.cardGlass} rounded-lg overflow-hidden border border-slate-700/50`}
              style={{
                width: device === 'mobile' ? '375px' : '100%',
                height: device === 'mobile' ? '667px' : '100%',
                maxWidth: device === 'desktop' ? '1280px' : undefined,
              }}
            >
              <iframe
                id="preview-iframe"
                src={getPreviewUrl()}
                className="w-full h-full bg-white"
                title="Live Preview"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${surfaces.cardGlass} rounded-xl border border-slate-700/50 overflow-hidden sticky top-6`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-fuchsia-400" />
          <h3 className="text-sm font-semibold text-white">Live Preview</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDevice('mobile')}
            className={`p-1.5 rounded transition ${
              device === 'mobile'
                ? 'bg-fuchsia-600 text-white'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Mobile view"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevice('desktop')}
            className={`p-1.5 rounded transition ${
              device === 'desktop'
                ? 'bg-fuchsia-600 text-white'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Desktop view"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded text-slate-400 hover:bg-slate-800 transition disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 rounded text-slate-400 hover:bg-slate-800 transition"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 rounded text-slate-400 hover:bg-slate-800 transition"
            title="Hide preview"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="bg-slate-800/50 p-4 flex items-center justify-center" style={{ height: '600px' }}>
        <div
          className="bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300"
          style={{
            width: device === 'mobile' ? '375px' : '100%',
            height: device === 'mobile' ? '667px' : '100%',
            maxWidth: device === 'desktop' ? '800px' : undefined,
            transform: device === 'mobile' ? 'scale(0.85)' : 'scale(1)',
          }}
        >
          <iframe
            id="preview-iframe"
            src={getPreviewUrl()}
            className="w-full h-full"
            title="Live Preview"
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
        <p className="text-xs text-slate-500">
          Preview updates automatically when you make changes
        </p>
      </div>
    </div>
  );
}
