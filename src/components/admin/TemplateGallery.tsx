'use client';

import { useState } from 'react';
import { Copy, Calendar, BookOpen, Zap, Award, ChevronRight } from 'lucide-react';
import { surfaces, colors, components } from '@/lib/admin/designTokens';

interface Template {
  id: string;
  name: string;
  description: string;
  type: 'event' | 'story' | 'card';
  category: string;
  preview?: string;
  estimatedTime: string;
  features: string[];
}

const templates: Template[] = [
  {
    id: 'concert-event',
    name: 'Live Concert Experience',
    description: 'Complete event setup for music concerts with before, during, and after experiences',
    type: 'event',
    category: 'Music',
    estimatedTime: '15 min setup',
    features: [
      'Pre-event story chapters',
      'Live event lanes (Info, Interact, Rewards)',
      'QR-based memory collection',
      'Post-event recap',
    ],
  },
  {
    id: 'festival-event',
    name: 'Multi-Day Festival',
    description: 'Multi-day event with multiple stages, artists, and interactive experiences',
    type: 'event',
    category: 'Festival',
    estimatedTime: '20 min setup',
    features: [
      'Daily schedules',
      'Multiple venue support',
      'Artist meet & greet',
      'Festival passport system',
    ],
  },
  {
    id: 'branching-story',
    name: 'Choose Your Own Adventure',
    description: 'Interactive story with multiple branching paths and endings',
    type: 'story',
    category: 'Interactive',
    estimatedTime: '30 min setup',
    features: [
      '5 chapters with branches',
      '3 different endings',
      'Choice-based progression',
      'Achievement system',
    ],
  },
  {
    id: 'linear-story',
    name: 'Linear Narrative',
    description: 'Simple storytelling experience with sequential chapters',
    type: 'story',
    category: 'Narrative',
    estimatedTime: '10 min setup',
    features: [
      '10 sequential chapters',
      'Rich media support',
      'Progress tracking',
      'Auto-save functionality',
    ],
  },
  {
    id: 'ar-treasure-hunt',
    name: 'AR Treasure Hunt',
    description: 'Location-based AR experience for venue exploration',
    type: 'event',
    category: 'Interactive',
    estimatedTime: '25 min setup',
    features: [
      'GPS-based locations',
      'AR object discovery',
      'Collectible rewards',
      'Leaderboard',
    ],
  },
  {
    id: 'artist-bts',
    name: 'Behind The Scenes',
    description: 'Artist backstory and exclusive content reveal',
    type: 'story',
    category: 'Content',
    estimatedTime: '15 min setup',
    features: [
      'Video galleries',
      'Photo collections',
      'Artist interviews',
      'Exclusive unlocks',
    ],
  },
];

interface TemplateGalleryProps {
  onSelectTemplate: (template: Template) => void;
  filterType?: 'event' | 'story' | 'card' | 'all';
}

export function TemplateGallery({ onSelectTemplate, filterType = 'all' }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...new Set(templates.map(t => t.category))];

  const filteredTemplates = templates.filter(template => {
    const matchesType = filterType === 'all' || template.type === filterType;
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesType && matchesCategory;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'event':
        return Calendar;
      case 'story':
        return BookOpen;
      case 'card':
        return Zap;
      default:
        return Award;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'event':
        return 'bg-purple-500/20 text-purple-400';
      case 'story':
        return 'bg-blue-500/20 text-blue-400';
      case 'card':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Choose a Template</h2>
        <p className="text-slate-400">
          Start with a pre-built template to save time and get best practices
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              selectedCategory === category
                ? 'bg-fuchsia-600 text-white'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => {
          const Icon = getTypeIcon(template.type);

          return (
            <div
              key={template.id}
              className={`group ${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50 hover:border-fuchsia-500/50 transition-all`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${getTypeColor(template.type)} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`${components.badge} ${getTypeColor(template.type)}`}>
                  {template.type}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-white mb-2">{template.name}</h3>
              <p className="text-sm text-slate-400 mb-4 line-clamp-2">{template.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500"></div>
                  {template.estimatedTime}
                </div>
                <div className="space-y-1">
                  {template.features.slice(0, 3).map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                      <ChevronRight className="w-3 h-3 text-fuchsia-500" />
                      {feature}
                    </div>
                  ))}
                  {template.features.length > 3 && (
                    <p className="text-xs text-slate-600 ml-5">
                      +{template.features.length - 3} more
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => onSelectTemplate(template)}
                className={`w-full ${components.buttonPrimary} justify-center group-hover:bg-fuchsia-700 transition-colors`}
              >
                <Copy className="w-4 h-4" />
                Use Template
              </button>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className={`${surfaces.cardGlass} rounded-xl p-12 border border-slate-700/50 text-center`}>
          <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Templates Found</h3>
          <p className="text-slate-400">
            Try selecting a different category or type
          </p>
        </div>
      )}

      {/* Start from Scratch Option */}
      <div className={`${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">Start from Scratch</h3>
            <p className="text-sm text-slate-400">
              Create a custom {filterType === 'all' ? 'item' : filterType} without a template
            </p>
          </div>
          <button
            onClick={() => onSelectTemplate({ id: 'blank', name: 'Blank', description: '', type: filterType === 'all' ? 'event' : filterType as any, category: 'Custom', estimatedTime: '', features: [] })}
            className={components.buttonSecondary}
          >
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  );
}
