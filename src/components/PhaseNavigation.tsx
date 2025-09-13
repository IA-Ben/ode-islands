"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

export type Phase = 'before' | 'event' | 'after';

interface PhaseNavigationProps {
  currentPhase: Phase;
}

export default function PhaseNavigation({ currentPhase }: PhaseNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

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
        <nav className="flex items-center justify-between py-4">
          {/* Phase Navigation */}
          <div className="flex items-center space-x-8">
            {phases.map((phase, index) => (
              <div key={phase.id} className="flex items-center">
                <button
                  onClick={() => handlePhaseChange(phase.id)}
                  className={`relative px-6 py-3 text-lg font-medium transition-all duration-300 ${
                    currentPhase === phase.id
                      ? 'text-white scale-105'
                      : 'text-white/60 hover:text-white/90 hover:scale-102'
                  }`}
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
                  
                  {/* Subtle description on hover */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-black/80 text-xs text-white/80 rounded opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                    {phase.description}
                  </div>
                </button>
                
                {/* Separator */}
                {index < phases.length - 1 && (
                  <div className="mx-4 h-6 w-px bg-white/20" />
                )}
              </div>
            ))}
          </div>

          {/* Progress Dashboard Button */}
          <div>
            <button
              onClick={handleProgressClick}
              className={`relative px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg border ${
                isProgressPage
                  ? 'text-white border-blue-500 bg-blue-500/20'
                  : 'text-white/60 border-white/20 hover:text-white/90 hover:border-white/40 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Progress</span>
              </div>
              
              {/* Progress page description on hover */}
              <div className="absolute top-full right-0 mt-2 px-3 py-1 bg-black/80 text-xs text-white/80 rounded opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                View your journey progress
              </div>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}