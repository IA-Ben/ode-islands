"use client";

import { useState, useCallback, useEffect } from 'react';
import helpContent from '@/data/helpContent.json';

export interface HelpTopic {
  id: string;
  title: string;
  category: string;
  content: any;
}

export interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  highlight?: string;
  action: string;
}

export interface HelpSystemState {
  isOpen: boolean;
  currentTopic: HelpTopic | null;
  searchQuery: string;
  category: 'audience' | 'admin' | 'technical' | null;
  isOnboarding: boolean;
  onboardingStep: number;
  contextId: string | null;
}

const ONBOARDING_STORAGE_KEY = 'ode-islands-onboarding-completed';
const HELP_PREFERENCES_KEY = 'ode-islands-help-preferences';

export function useHelp(userRole: 'audience' | 'admin' = 'audience') {
  const [state, setState] = useState<HelpSystemState>({
    isOpen: false,
    currentTopic: null,
    searchQuery: '',
    category: null,
    isOnboarding: false,
    onboardingStep: 0,
    contextId: null,
  });

  // Check if onboarding should be shown
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(`${ONBOARDING_STORAGE_KEY}-${userRole}`);
    if (!hasCompletedOnboarding) {
      // Small delay to let the component mount
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          isOnboarding: true,
          isOpen: true,
          onboardingStep: 0
        }));
      }, 1000);
    }
  }, [userRole]);

  // Open help system
  const openHelp = useCallback((topicId?: string, categoryFilter?: 'audience' | 'admin' | 'technical') => {
    let topic: HelpTopic | null = null;
    
    if (topicId) {
      // Find topic by ID across all categories
      for (const [categoryKey, categoryData] of Object.entries(helpContent.categories)) {
        const foundTopic = categoryData.topics.find((t: any) => t.id === topicId);
        if (foundTopic) {
          topic = foundTopic as HelpTopic;
          break;
        }
      }
    }

    setState(prev => ({
      ...prev,
      isOpen: true,
      currentTopic: topic,
      category: categoryFilter || null,
      isOnboarding: false,
      searchQuery: ''
    }));
  }, []);

  // Close help system
  const closeHelp = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      currentTopic: null,
      isOnboarding: false,
      contextId: null
    }));
  }, []);

  // Search for help topics
  const searchHelp = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      currentTopic: null,
      category: null
    }));
  }, []);

  // Get search results
  const getSearchResults = useCallback((query: string): HelpTopic[] => {
    if (!query.trim()) return [];

    const results: HelpTopic[] = [];
    const queryLower = query.toLowerCase();

    // Search through all categories and topics
    Object.values(helpContent.categories).forEach((category: any) => {
      category.topics.forEach((topic: any) => {
        const titleMatch = topic.title.toLowerCase().includes(queryLower);
        const contentMatch = JSON.stringify(topic.content).toLowerCase().includes(queryLower);
        const categoryMatch = topic.category?.toLowerCase().includes(queryLower);

        if (titleMatch || contentMatch || categoryMatch) {
          results.push(topic as HelpTopic);
        }
      });
    });

    // Also search keywords
    Object.entries(helpContent.searchIndex.keywords).forEach(([keyword, topicIds]: [string, any]) => {
      if (keyword.includes(queryLower)) {
        topicIds.forEach((topicId: string) => {
          // Find and add topics that match keywords
          Object.values(helpContent.categories).forEach((category: any) => {
            const topic = category.topics.find((t: any) => t.id === topicId);
            if (topic && !results.find(r => r.id === topic.id)) {
              results.push(topic as HelpTopic);
            }
          });
        });
      }
    });

    return results;
  }, []);

  // Set category filter
  const setCategoryFilter = useCallback((category: 'audience' | 'admin' | 'technical' | null) => {
    setState(prev => ({
      ...prev,
      category,
      currentTopic: null,
      searchQuery: ''
    }));
  }, []);

  // Show specific topic
  const showTopic = useCallback((topicId: string) => {
    // Find topic across all categories
    let topic: HelpTopic | null = null;
    
    for (const [categoryKey, categoryData] of Object.entries(helpContent.categories)) {
      const foundTopic = categoryData.topics.find((t: any) => t.id === topicId);
      if (foundTopic) {
        topic = foundTopic as HelpTopic;
        break;
      }
    }

    if (topic) {
      setState(prev => ({
        ...prev,
        currentTopic: topic,
        isOnboarding: false
      }));
    }
  }, []);

  // Context-sensitive help
  const showContextHelp = useCallback((contextId: string) => {
    const quickHelpContent = userRole === 'admin' 
      ? helpContent.quickHelp.admin 
      : helpContent.quickHelp.audience;

    const helpText = (quickHelpContent as any)[contextId];
    
    setState(prev => ({
      ...prev,
      contextId,
      isOpen: true,
      currentTopic: helpText ? {
        id: `context-${contextId}`,
        title: 'Quick Help',
        category: 'Context',
        content: { description: helpText }
      } as HelpTopic : null
    }));
  }, [userRole]);

  // Onboarding controls
  const startOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOnboarding: true,
      isOpen: true,
      onboardingStep: 0,
      currentTopic: null
    }));
  }, []);

  const nextOnboardingStep = useCallback(() => {
    const onboardingSteps = userRole === 'admin' 
      ? helpContent.onboarding.admin.steps 
      : helpContent.onboarding.audience.steps;

    setState(prev => {
      const nextStep = prev.onboardingStep + 1;
      if (nextStep >= onboardingSteps.length) {
        // Onboarding complete
        localStorage.setItem(`${ONBOARDING_STORAGE_KEY}-${userRole}`, 'true');
        return {
          ...prev,
          isOnboarding: false,
          isOpen: false,
          onboardingStep: 0
        };
      }
      return {
        ...prev,
        onboardingStep: nextStep
      };
    });
  }, [userRole]);

  const skipOnboarding = useCallback(() => {
    localStorage.setItem(`${ONBOARDING_STORAGE_KEY}-${userRole}`, 'true');
    setState(prev => ({
      ...prev,
      isOnboarding: false,
      isOpen: false,
      onboardingStep: 0
    }));
  }, [userRole]);

  // Get current onboarding step data
  const getCurrentOnboardingStep = useCallback((): OnboardingStep | null => {
    if (!state.isOnboarding) return null;
    
    const onboardingData = userRole === 'admin' 
      ? helpContent.onboarding.admin 
      : helpContent.onboarding.audience;
    
    return onboardingData.steps[state.onboardingStep] || null;
  }, [state.isOnboarding, state.onboardingStep, userRole]);

  // Get topics for current category
  const getTopicsForCategory = useCallback((category: 'audience' | 'admin' | 'technical' | null): HelpTopic[] => {
    if (!category) {
      // Return all topics
      const allTopics: HelpTopic[] = [];
      Object.values(helpContent.categories).forEach((cat: any) => {
        allTopics.push(...cat.topics);
      });
      return allTopics;
    }

    const categoryData = helpContent.categories[category];
    return categoryData ? categoryData.topics as HelpTopic[] : [];
  }, []);

  return {
    // State
    isOpen: state.isOpen,
    currentTopic: state.currentTopic,
    searchQuery: state.searchQuery,
    category: state.category,
    isOnboarding: state.isOnboarding,
    onboardingStep: state.onboardingStep,
    contextId: state.contextId,

    // Actions
    openHelp,
    closeHelp,
    searchHelp,
    setCategoryFilter,
    showTopic,
    showContextHelp,

    // Onboarding
    startOnboarding,
    nextOnboardingStep,
    skipOnboarding,
    getCurrentOnboardingStep,

    // Data helpers
    getSearchResults,
    getTopicsForCategory,
    
    // Content access
    helpContent,
    userRole
  };
}

// Convenience hook for quick context help
export function useContextHelp() {
  const [contextHelp, setContextHelp] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showQuickHelp = useCallback((content: string, duration: number = 3000) => {
    setContextHelp(content);
    setIsVisible(true);
    
    if (duration > 0) {
      setTimeout(() => {
        setIsVisible(false);
      }, duration);
    }
  }, []);

  const hideQuickHelp = useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    contextHelp,
    isVisible,
    showQuickHelp,
    hideQuickHelp
  };
}