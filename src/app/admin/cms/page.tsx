'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BeforeLaneManager } from '@/components/cms/BeforeLaneManager';
import { BTSSeriesManager } from '@/components/cms/BTSSeriesManager';
import { ConceptArtManager } from '@/components/cms/ConceptArtManager';
import { FeaturedRulesBuilder } from '@/components/cms/FeaturedRulesBuilder';
import { MediaLibrary } from '@/components/cms/MediaLibrary';
import AddChapterModal from '@/components/cms/AddChapterModal';
import { ChapterReorderList } from '@/components/cms/ChapterReorderList';
import AdvancedSearch from '@/components/cms/AdvancedSearch';
import StoryCardModal from '@/components/cms/StoryCardModal';
import { surfaces, colors, typography, components, focus, borders } from '@/lib/admin/designTokens';
import { 
  BookOpen, 
  Video, 
  Image as ImageIcon, 
  Star, 
  Database, 
  Search, 
  Settings, 
  Calendar, 
  Target, 
  Sparkles,
  LayoutGrid,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
};

export default function CMSPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string>('');
  const [csrfToken, setCsrfToken] = useState('');
  const [selectedSection, setSelectedSection] = useState('before-lanes');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['before', 'content']));

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchCSRFToken();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setLoginError('Not authenticated');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setLoginError('Authentication check failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchCSRFToken = async () => {
    try {
      const response = await fetch('/api/csrf-token');
      if (response.ok) {
        const data = await response.json();
        setCsrfToken(data.csrfToken);
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const MENU_SECTIONS = [
    {
      id: 'before',
      title: 'Before Experience',
      icon: BookOpen,
      items: [
        { id: 'before-lanes', label: 'Lane Management', icon: LayoutGrid, description: 'Manage Plan, Discover, Community & BTS lanes' },
        { id: 'bts-series', label: 'BTS Video Series', icon: Video, description: 'Create video playlists and episodes' },
        { id: 'concept-art', label: 'Concept Art Galleries', icon: ImageIcon, description: 'Manage art collections and layouts' },
      ]
    },
    {
      id: 'content',
      title: 'Content & Cards',
      icon: Database,
      items: [
        { id: 'featured-rules', label: 'Featured Rules', icon: Star, description: 'Configure dynamic content selection' },
        { id: 'card-library', label: 'Card Library', icon: LayoutGrid, description: 'Manage all story and event cards' },
        { id: 'chapters', label: 'Chapter Management', icon: BookOpen, description: 'Organize story chapters' },
      ]
    },
    {
      id: 'tools',
      title: 'CMS Tools',
      icon: Settings,
      items: [
        { id: 'media-library', label: 'Media Library', icon: Database, description: 'Upload and manage assets' },
        { id: 'search', label: 'Advanced Search', icon: Search, description: 'Find content across CMS' },
        { id: 'buttons', label: 'Custom Buttons', icon: Target, description: 'Manage interactive buttons' },
        { id: 'scheduler', label: 'Content Scheduler', icon: Calendar, description: 'Schedule content releases' },
      ]
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center mb-4">
            <div className="w-3 h-3 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <div className="text-slate-300 text-lg font-medium">Loading CMS...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className={`${surfaces.darkGlass} ${borders.glassBorder} ${borders.radius.xl} p-8 max-w-md w-full`}>
          <div className="text-center mb-8">
            <div className={`w-20 h-20 ${colors.gradients.primary} rounded-full flex items-center justify-center mx-auto mb-6`}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className={`${typography.h2} text-white mb-2`}>CMS Login Required</h1>
            <p className="text-slate-400">Please sign in with your admin account</p>
          </div>
          {loginError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{loginError}</p>
            </div>
          )}
          <a href="/api/login" className={`${components.buttonPrimary} w-full justify-center`}>
            Sign in with Replit
          </a>
        </div>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className={`${surfaces.darkGlass} ${borders.glassBorder} ${borders.radius.xl} p-8 max-w-md w-full text-center`}>
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className={`${typography.h2} text-white mb-2`}>Access Restricted</h1>
          <p className="text-slate-400 mb-6">Content management access requires admin permissions</p>
          <p className="text-sm text-slate-500 mb-6">Logged in as: {user.email}</p>
          <button onClick={handleLogout} className={`${components.buttonSecondary} w-full justify-center`}>
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar Navigation */}
      <div className={`w-80 ${surfaces.darkGlass} border-r ${borders.glassBorder} flex flex-col`}>
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 ${colors.gradients.primary} rounded-lg flex items-center justify-center`}>
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Ode Islands CMS</h1>
              <p className="text-xs text-slate-400">Content Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="flex-1">
              <p className="font-medium text-slate-300">{user.firstName} {user.lastName}</p>
              <p className="text-xs">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {MENU_SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            const isExpanded = expandedSections.has(section.id);
            
            return (
              <div key={section.id} className="space-y-1">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <SectionIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{section.title}</span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {isExpanded && (
                  <div className="ml-6 space-y-1">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedSection(item.id)}
                          className={`w-full flex items-start gap-2 px-3 py-2 rounded-lg transition-colors ${
                            selectedSection === item.id
                              ? 'bg-fuchsia-500/20 text-fuchsia-400'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <ItemIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div className="text-left flex-1 min-w-0">
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs opacity-75 line-clamp-1">{item.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Links */}
        <div className="p-4 border-t border-slate-700/50 space-y-2">
          <Link 
            href="/admin/theme"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
            Theme Editor
          </Link>
          <Link 
            href="/before"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview App
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Section Content */}
          {selectedSection === 'before-lanes' && <BeforeLaneManager csrfToken={csrfToken} />}
          {selectedSection === 'bts-series' && <BTSSeriesManager csrfToken={csrfToken} />}
          {selectedSection === 'concept-art' && <ConceptArtManager csrfToken={csrfToken} />}
          {selectedSection === 'featured-rules' && <FeaturedRulesBuilder csrfToken={csrfToken} />}
          {selectedSection === 'media-library' && <MediaLibrary />}
          {selectedSection === 'search' && <AdvancedSearch />}
          {selectedSection === 'card-library' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Card Library</h3>
              <p className="text-slate-400">Comprehensive card management interface coming soon...</p>
              <Link href="/admin/cards" className={components.buttonPrimary}>
                Go to Card Library
              </Link>
            </div>
          )}
          {selectedSection === 'chapters' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Chapter Management</h3>
              <p className="text-slate-400">Legacy chapter management interface...</p>
            </div>
          )}
          {selectedSection === 'buttons' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Custom Buttons</h3>
              <Link href="/admin/cms/custom-buttons" className={components.buttonPrimary}>
                Manage Custom Buttons
              </Link>
            </div>
          )}
          {selectedSection === 'scheduler' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Content Scheduler</h3>
              <Link href="/admin/cms/scheduler" className={components.buttonPrimary}>
                Manage Scheduled Content
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
