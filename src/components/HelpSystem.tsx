"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useHelp, HelpTopic, OnboardingStep } from '@/hooks/useHelp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

interface HelpSystemProps {
  userRole: 'audience' | 'admin';
  className?: string;
}

// Icon components for help system
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const BookOpenIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const CogIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function HelpSystem({ userRole, className }: HelpSystemProps) {
  const { theme } = useTheme();
  const help = useHelp(userRole);
  const [searchInputValue, setSearchInputValue] = useState('');
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key to close help
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && help.isOpen) {
        help.closeHelp();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [help.isOpen, help.closeHelp]);

  // Focus search input when opening
  useEffect(() => {
    if (help.isOpen && !help.isOnboarding && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [help.isOpen, help.isOnboarding]);

  // Handle onboarding highlighting
  useEffect(() => {
    if (help.isOnboarding) {
      const currentStep = help.getCurrentOnboardingStep();
      if (currentStep?.highlight) {
        setHighlightedElement(currentStep.highlight);
        
        // Add highlighting styles
        const element = document.querySelector(currentStep.highlight);
        if (element) {
          element.classList.add('help-highlight');
        }
      }
    }

    return () => {
      // Cleanup highlighting
      if (highlightedElement) {
        const element = document.querySelector(highlightedElement);
        if (element) {
          element.classList.remove('help-highlight');
        }
      }
    };
  }, [help.isOnboarding, help.onboardingStep, highlightedElement]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInputValue(value);
    help.searchHelp(value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchInputValue('');
    help.searchHelp('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Render category icon
  const getCategoryIcon = (categoryKey: string) => {
    switch (categoryKey) {
      case 'audience': return <UsersIcon />;
      case 'admin': return <ShieldIcon />;
      case 'technical': return <CogIcon />;
      default: return <BookOpenIcon />;
    }
  };

  // Render topic content
  const renderTopicContent = (topic: HelpTopic) => {
    const content = topic.content;
    
    return (
      <div className="space-y-4">
        {content.description && (
          <p className="text-gray-300 leading-relaxed">{content.description}</p>
        )}
        
        {content.steps && (
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Steps:</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              {content.steps.map((step: string, index: number) => (
                <li key={index} className="leading-relaxed">{step}</li>
              ))}
            </ol>
          </div>
        )}

        {content.tips && (
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Tips:</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              {content.tips.map((tip: string, index: number) => (
                <li key={index} className="leading-relaxed">{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {content.troubleshooting && (
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Troubleshooting:</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              {content.troubleshooting.map((item: string, index: number) => (
                <li key={index} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>
        )}

        {content.features && (
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Features:</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              {content.features.map((feature: string, index: number) => (
                <li key={index} className="leading-relaxed">{feature}</li>
              ))}
            </ul>
          </div>
        )}

        {content.bestPractices && (
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Best Practices:</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              {content.bestPractices.map((practice: string, index: number) => (
                <li key={index} className="leading-relaxed">{practice}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Handle complex content structures */}
        {content.cueTypes && (
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Cue Types:</h4>
            <div className="space-y-3">
              {Object.entries(content.cueTypes).map(([type, description]) => (
                <div key={type} className="border-l-4 border-blue-500 pl-4">
                  <h5 className="font-medium text-white">{type}</h5>
                  <p className="text-gray-300 text-sm">{description as string}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.sections && typeof content.sections === 'object' && (
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Sections:</h4>
            <div className="space-y-3">
              {Object.entries(content.sections).map(([section, description]) => (
                <div key={section} className="border-l-4 border-green-500 pl-4">
                  <h5 className="font-medium text-white capitalize">{section.replace(/([A-Z])/g, ' $1').trim()}</h5>
                  <p className="text-gray-300 text-sm">{description as string}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render onboarding step
  const renderOnboardingStep = (step: OnboardingStep) => {
    return (
      <div className="text-center space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">{step.title}</h2>
          <p className="text-gray-300 leading-relaxed text-lg">{step.content}</p>
        </div>
        
        <div className="flex items-center justify-center gap-4">
          <Button 
            variant="outline" 
            onClick={help.skipOnboarding}
            className="text-gray-400 border-gray-600 hover:bg-gray-700"
          >
            Skip Tour
          </Button>
          <Button onClick={help.nextOnboardingStep}>
            {step.action}
          </Button>
        </div>
        
        <div className="flex justify-center space-x-2">
          {help.helpContent.onboarding[userRole].steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === help.onboardingStep ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  // Get current display content
  const getDisplayContent = () => {
    if (help.isOnboarding) {
      const step = help.getCurrentOnboardingStep();
      return step ? { type: 'onboarding', content: step } : null;
    }

    if (help.currentTopic) {
      return { type: 'topic', content: help.currentTopic };
    }

    if (help.searchQuery) {
      const results = help.getSearchResults(help.searchQuery);
      return { type: 'search', content: results };
    }

    const topics = help.getTopicsForCategory(help.category);
    return { type: 'browse', content: topics };
  };

  const displayContent = getDisplayContent();

  if (!help.isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={help.closeHelp} />
      
      {/* Help System Modal */}
      <div 
        ref={modalRef}
        className={`fixed inset-4 md:inset-8 lg:inset-16 bg-gray-900 rounded-lg shadow-2xl z-50 flex flex-col ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <BookOpenIcon />
            <div>
              <h1 className="text-xl font-bold text-white">
                {help.isOnboarding 
                  ? help.helpContent.onboarding[userRole].title
                  : 'Help & Documentation'
                }
              </h1>
              {!help.isOnboarding && (
                <p className="text-sm text-gray-400">
                  {userRole === 'admin' ? 'Event Management Guide' : 'Audience Participation Guide'}
                </p>
              )}
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={help.closeHelp}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <CloseIcon />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Only show when not onboarding */}
          {!help.isOnboarding && (
            <div className="w-80 border-r border-gray-700 bg-gray-850 flex flex-col">
              {/* Search */}
              <div className="p-4 border-b border-gray-700">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search help topics..."
                    value={searchInputValue}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchInputValue && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter */}
              <div className="p-4 border-b border-gray-700">
                <div className="space-y-2">
                  <button
                    onClick={() => help.setCategoryFilter(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                      help.category === null
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <BookOpenIcon />
                    All Topics
                  </button>
                  
                  {Object.entries(help.helpContent.categories).map(([key, category]) => (
                    <button
                      key={key}
                      onClick={() => help.setCategoryFilter(key as any)}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                        help.category === key
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {getCategoryIcon(key)}
                      {category.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topics List */}
              <div className="flex-1 overflow-y-auto p-4">
                {displayContent?.type === 'search' && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Search Results ({(displayContent.content as HelpTopic[]).length})
                    </h3>
                    {(displayContent.content as HelpTopic[]).map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => help.showTopic(topic.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          help.currentTopic?.id === topic.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        <div className="font-medium">{topic.title}</div>
                        <div className="text-sm opacity-75">{topic.category}</div>
                      </button>
                    ))}
                  </div>
                )}
                
                {displayContent?.type === 'browse' && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      {help.category 
                        ? help.helpContent.categories[help.category].title 
                        : 'All Topics'
                      } ({(displayContent.content as HelpTopic[]).length})
                    </h3>
                    {(displayContent.content as HelpTopic[]).map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => help.showTopic(topic.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          help.currentTopic?.id === topic.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        <div className="font-medium">{topic.title}</div>
                        <div className="text-sm opacity-75">{topic.category}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            {displayContent?.type === 'onboarding' && (
              <div className="h-full flex items-center justify-center p-8">
                {renderOnboardingStep(displayContent.content as OnboardingStep)}
              </div>
            )}
            
            {displayContent?.type === 'topic' && (
              <div className="p-8">
                <div className="max-w-4xl">
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      <span>{(displayContent.content as HelpTopic).category}</span>
                      <ChevronRightIcon />
                      <span>Help Topic</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">
                      {(displayContent.content as HelpTopic).title}
                    </h1>
                  </div>
                  
                  {renderTopicContent(displayContent.content as HelpTopic)}
                </div>
              </div>
            )}
            
            {(displayContent?.type === 'browse' || displayContent?.type === 'search') && !help.currentTopic && (
              <div className="p-8 h-full flex items-center justify-center">
                <div className="text-center">
                  <BookOpenIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-400 mb-2">
                    {displayContent.type === 'search' 
                      ? (displayContent.content as HelpTopic[]).length === 0 
                        ? 'No results found' 
                        : 'Select a topic to read'
                      : 'Select a topic to get started'
                    }
                  </h2>
                  <p className="text-gray-500">
                    {displayContent.type === 'search' 
                      ? (displayContent.content as HelpTopic[]).length === 0
                        ? 'Try searching with different keywords'
                        : 'Choose from the search results on the left'
                      : 'Browse topics by category or search for specific help'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Only show when not onboarding */}
        {!help.isOnboarding && (
          <div className="border-t border-gray-700 p-4">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <div className="flex items-center gap-4">
                <span>Need more help?</span>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={help.startOnboarding}
                  className="text-blue-400 p-0 h-auto"
                >
                  Take the guided tour
                </Button>
              </div>
              <div>
                Version {help.helpContent.meta.version}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS for highlighting */}
      <style jsx global>{`
        .help-highlight {
          position: relative;
          z-index: 45;
        }
        .help-highlight::before {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          background: rgba(59, 130, 246, 0.1);
          pointer-events: none;
          animation: help-highlight-pulse 2s infinite;
        }
        @keyframes help-highlight-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}