"use client";

import { BookOpen, Plus } from 'lucide-react';
import { surfaces, colors, components } from '@/lib/admin/designTokens';

export default function StoryBuilderPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${colors.gradients.primary} flex items-center justify-center shadow-lg`}>
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Story Builder
                </h1>
                <p className="text-slate-400 mt-1">
                  Create and manage story chapters and narrative flows
                </p>
              </div>
            </div>
            <button className={components.buttonPrimary}>
              <Plus className="w-4 h-4" />
              New Chapter
            </button>
          </div>
        </div>

        <div className={`${surfaces.cardGlass} rounded-xl p-8 border border-slate-700/50`}>
          <div className="text-center py-12">
            <div className={`w-24 h-24 rounded-2xl ${colors.gradients.primary} flex items-center justify-center mx-auto mb-6 shadow-xl`}>
              <BookOpen className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Story Builder Coming Soon
            </h2>
            <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
              The Story Builder feature is currently under development. This powerful tool will allow you to craft immersive story-driven experiences for your events.
            </p>
            <div className={`${surfaces.subtleGlass} rounded-xl p-6 border border-slate-700/50 max-w-2xl mx-auto`}>
              <h3 className="text-lg font-semibold text-white mb-4">Planned Features</h3>
              <ul className="text-left space-y-3 text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-fuchsia-400 mt-1">•</span>
                  <span>Create and manage story chapters with rich content</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-fuchsia-400 mt-1">•</span>
                  <span>Design narrative flows and branching experiences</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-fuchsia-400 mt-1">•</span>
                  <span>Build immersive story-driven content with media integration</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-fuchsia-400 mt-1">•</span>
                  <span>Configure chapter progression and unlocking mechanics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-fuchsia-400 mt-1">•</span>
                  <span>Preview and test story flows before publishing</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
