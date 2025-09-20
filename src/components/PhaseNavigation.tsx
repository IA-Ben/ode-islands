"use client";

import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useMobile } from '@/contexts/MobileContext';
import { useAuth } from '@/hooks/useAuth';
import NotificationCenter from './NotificationCenter';
import ScoreBadge from './ScoreBadge';
import DataSaverToggle from './DataSaverToggle';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export type Phase = 'before' | 'event' | 'after';

interface PhaseNavigationProps {
  currentPhase: Phase;
}

export default function PhaseNavigation({ currentPhase }: PhaseNavigationProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { isMobile, navigationCollapsed, setNavigationCollapsed, isDataSaverEnabled, toggleDataSaver } = useMobile();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showDataSaverToggle, setShowDataSaverToggle] = useState(false);

  const handlePhaseChange = (phase: Phase) => {
    if (phase === currentPhase) return;
    
    // Navigate to the appropriate phase route
    switch (phase) {
      case 'before':
        router.push('/before');
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
              {/* Login/Progress Toggle */}
              {!isLoading && (
                <>
                  {isAuthenticated ? (
                    // Show Progress button with score when authenticated
                    <button
                      onClick={handleProgressClick}
                      className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200"
                    >
                      <ScoreBadge 
                        compact={true}
                        showLevel={true}
                        showPosition={false}
                        className=""
                      />
                      <span className="text-sm font-medium">Progress</span>
                    </button>
                  ) : (
                    // Show Login button when not authenticated
                    <Button
                      onClick={() => router.push('/auth/login')}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-lg"
                    >
                      Login
                    </Button>
                  )}
                </>
              )}

              {/* Memory Wallet Link - Only show when authenticated */}
              {isAuthenticated && (
                <button
                  onClick={() => router.push('/memory-wallet')}
                  className="p-2 text-white/80 hover:text-white transition-colors hover:bg-white/10 rounded-lg"
                  aria-label="Memory Wallet"
                  title="Memory Wallet"
                >
                  <svg 
                    className="w-5 h-5"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" 
                    />
                  </svg>
                </button>
              )}
              
              {/* Notification Center - Hidden when collapsed on mobile */}
              <div className={isMobile && navigationCollapsed ? 'hidden' : ''}>
                <NotificationCenter />
              </div>

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
            </div>
          </div>
          
          {/* Mobile expanded menu - shown when not collapsed */}
          {isMobile && !navigationCollapsed && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex flex-col space-y-4">
                {/* Quick actions for mobile - ScoreBadge already handles progress */}
                <div className="flex items-center justify-between">
                  {/* Progress functionality is now handled by the ScoreBadge component above */}
                  <div className="text-white/60 text-sm">
                    Tap your score badge to view detailed progress
                  </div>
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