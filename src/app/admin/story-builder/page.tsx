'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Save, Eye, Settings, ChevronLeft, Sparkles } from 'lucide-react';
import { VisualStoryBuilder } from '@/components/admin/VisualStoryBuilder';
import { LivePreviewPanel } from '@/components/admin/LivePreviewPanel';
import { TemplateGallery } from '@/components/admin/TemplateGallery';
import { surfaces, colors, components } from '@/lib/admin/designTokens';
import { useRouter } from 'next/navigation';

export default function StoryBuilderPage() {
  const router = useRouter();
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    checkForContent();
  }, []);

  const checkForContent = async () => {
    try {
      const response = await fetch('/api/chapters');
      if (response.ok) {
        const data = await response.json();
        setHasContent(data && data.length > 0);
      }
    } catch (error) {
      console.error('Failed to check content:', error);
    }
  };

  const handleTemplateSelect = async (template: any) => {
    if (template.id === 'blank') {
      setShowTemplates(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/templates/${template.type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          name: template.name,
        }),
      });

      if (response.ok) {
        setShowTemplates(false);
        setHasContent(true);
        // Refresh the visual builder
        window.location.reload();
      }
    } catch (error) {
      console.error('Template creation failed:', error);
    }
  };

  if (showTemplates || !hasContent) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-4"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${colors.gradients.primary} flex items-center justify-center`}>
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Story Builder</h1>
                <p className="text-slate-400">Create immersive branching narratives</p>
              </div>
            </div>
          </div>

          {/* Template Gallery */}
          <TemplateGallery
            onSelectTemplate={handleTemplateSelect}
            filterType="story"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header Bar */}
      <div className={`${surfaces.darkGlass} border-b border-slate-700/50 sticky top-0 z-20`}>
        <div className="max-w-[2000px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 hover:bg-white/5 rounded-lg transition"
              >
                <ChevronLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${colors.gradients.primary} flex items-center justify-center`}>
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Visual Story Builder</h1>
                  <p className="text-xs text-slate-400">Create and manage your story</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTemplates(true)}
                className={components.buttonSecondary}
              >
                <Sparkles className="w-4 h-4" />
                Templates
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={components.buttonSecondary}
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </button>
              <button className={components.buttonPrimary}>
                <Save className="w-4 h-4" />
                Save All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[2000px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Story Builder */}
          <div className={showPreview ? 'flex-1' : 'w-full'}>
            <VisualStoryBuilder />
          </div>

          {/* Live Preview */}
          {showPreview && selectedChapter && (
            <div className="w-[420px]">
              <LivePreviewPanel
                contentType="chapter"
                contentId={selectedChapter}
              />
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="fixed bottom-6 left-6 z-10">
        <div className={`${surfaces.cardGlass} rounded-lg px-4 py-2 border border-slate-700/50`}>
          <p className="text-xs text-slate-500">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">⌘</kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono ml-1">K</kbd>
            <span className="ml-2">Quick actions</span>
          </p>
        </div>
      </div>
    </div>
  );
}
