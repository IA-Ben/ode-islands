"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useMobile } from '@/contexts/MobileContext';
import NotificationCenter from './NotificationCenter';
import ScoreBadge from './ScoreBadge';
import DataSaverToggle from './DataSaverToggle';
import { useState } from 'react';

export type Phase = 'before' | 'event' | 'after';

interface PhaseNavigationProps {
  currentPhase: Phase;
}

export default function PhaseNavigation({ currentPhase }: PhaseNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const { isMobile, navigationCollapsed, setNavigationCollapsed, isDataSaverEnabled, toggleDataSaver } = useMobile();
  const [showDataSaverToggle, setShowDataSaverToggle] = useState(false);

  const handlePhaseChange = (phase: Phase) => {
    if (phase === currentPhase) return;
    
    // Navigate to the appropriate phase route
    switch (phase) {
      case 'before':
        router.push('/before/chapter-1');
        break;
      case 'event':
        router.push('/event');
        break;
      case 'after':
        router.push('/after');
        break;
    }
  };

  const handleProgressClick = () => {
    router.push('/progress');
  };

  const phases = [
    {
      id: 'before' as Phase,
      label: 'Before',
      description: 'Pre-event content',
    },
    {
      id: 'event' as Phase,
      label: 'Event', 
      description: 'Live event supplement',
    },
    {
      id: 'after' as Phase,
      label: 'After',
      description: 'Post-event content',
    }
  ];

  const isProgressPage = pathname === '/progress';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-white/10">
      <div className="container mx-auto px-4">
        <nav className="py-4">
          {/* Top row with essential controls */}
          <div className="flex items-center justify-between">
            {/* Phase Navigation - Hidden when collapsed on mobile */}
            <div className={`flex items-center space-x-8 ${isMobile && navigationCollapsed ? 'hidden' : ''}`}>
              {phases.map((phase, index) => (
                <div key={phase.id} className="flex items-center">
                  <button
                    onClick={() => handlePhaseChange(phase.id)}
                    className={`relative px-6 py-3 text-lg font-medium transition-all duration-300 ${
                      currentPhase === phase.id
                        ? 'text-white scale-105'
                        : 'text-white/60 hover:text-white/90 hover:scale-102'
                    } ${isMobile ? 'px-3 py-2 text-base' : ''}`}
                    style={{
                      color: currentPhase === phase.id ? theme.colors.primary : undefined
                    }}
                  >
                    {phase.label}
                    
                    {/* Active indicator */}
                    {currentPhase === phase.id && (
                      <div 
                        className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                    )}
                    
                    {/* Subtle description on hover - hide on mobile when collapsed */}
                    {!(isMobile && navigationCollapsed) && (
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-black/80 text-xs text-white/80 rounded opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                        {phase.description}
                      </div>
                    )}
                  </button>
                  
                  {/* Separator */}
                  {index < phases.length - 1 && (
                    <div className="mx-4 h-6 w-px bg-white/20" />
                  )}
                </div>
              ))}
            </div>

            {/* Mobile current phase indicator - show when collapsed */}
            {isMobile && navigationCollapsed && (
              <div className="flex items-center">
                <span className="text-white/90 font-medium" style={{ color: theme.colors.primary }}>
                  {phases.find(p => p.id === currentPhase)?.label}
                </span>
              </div>
            )}

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2">
              {/* Mobile Navigation Toggle */}
              {isMobile && (
                <button
                  onClick={() => setNavigationCollapsed(!navigationCollapsed)}
                  className="p-2 text-white/80 hover:text-white transition-colors md:hidden"
                  aria-label="Toggle navigation menu"
                >
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${navigationCollapsed ? '' : 'rotate-90'}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              
              {/* Fan Score Badge - Always visible but compact on mobile */}
              <ScoreBadge 
                compact={isMobile}
                showLevel={true}
                showPosition={false}
                onClick={handleProgressClick}
                className="hover:scale-105 transition-transform duration-200"
              />
              
              {/* Notification Center - Hidden when collapsed on mobile */}
              <div className={isMobile && navigationCollapsed ? 'hidden' : ''}>
                <NotificationCenter />
              </div>

              {/* Progress Dashboard Button - Hidden when collapsed on mobile */}
              <button
                onClick={handleProgressClick}
                className={`relative px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg border ${
                  isProgressPage
                    ? 'text-white border-blue-500 bg-blue-500/20'
                    : 'text-white/60 border-white/20 hover:text-white/90 hover:border-white/40 hover:bg-white/5'
                } ${isMobile && navigationCollapsed ? 'hidden' : ''}`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="hidden sm:inline">Progress</span>
                </div>
                
                {/* Progress page description on hover */}
                <div className="absolute top-full right-0 mt-2 px-3 py-1 bg-black/80 text-xs text-white/80 rounded opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  View your journey progress
                </div>
              </button>
            </div>
          </div>
          
          {/* Mobile expanded menu - shown when not collapsed */}
          {isMobile && !navigationCollapsed && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex flex-col space-y-4">
                {/* Quick actions for mobile */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleProgressClick}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-all duration-300 rounded-lg border ${
                      isProgressPage
                        ? 'text-white border-blue-500 bg-blue-500/20'
                        : 'text-white/60 border-white/20 hover:text-white/90 hover:border-white/40 hover:bg-white/5'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>View Progress</span>
                  </button>
                </div>
                
                {/* Data Saver Toggle for mobile users */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <DataSaverToggle 
                    compact={true} 
                    showLabel={true}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}