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
        <nav className="flex items-center justify-center py-4">
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
        </nav>
      </div>
    </div>
  );
}