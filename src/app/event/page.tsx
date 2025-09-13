"use client";

import PhaseNavigation from "@/components/PhaseNavigation";
import { useTheme } from '@/contexts/ThemeContext';

export default function EventPage() {
  const { theme } = useTheme();

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <PhaseNavigation currentPhase="event" />
      
      <div className="h-full pt-20 flex flex-col items-center justify-center text-center px-8">
        {/* Background gradient */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at center, ${theme.colors.primary}40 0%, transparent 50%)`
          }}
        />
        
        <div className="relative z-10 max-w-2xl">
          {/* Phase indicator */}
          <div 
            className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-8 border"
            style={{ 
              color: theme.colors.primary,
              borderColor: theme.colors.primary + '40',
              backgroundColor: theme.colors.primary + '10'
            }}
          >
            Event Phase
          </div>
          
          {/* Main content */}
          <h1 
            className="text-4xl md:text-6xl font-bold mb-6"
            style={{ color: theme.colors.primary }}
          >
            Live Event
          </h1>
          
          <h2 className="text-xl md:text-2xl text-white/80 mb-8 font-medium">
            Event Supplementation
          </h2>
          
          <p className="text-lg text-white/60 mb-12 leading-relaxed">
            This phase provides live supplementary content during your event. 
            Features for real-time interaction, live polling, AR experiences, 
            and synchronized content delivery will be built here.
          </p>
          
          {/* Feature preview cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <div className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
              <h3 
                className="text-lg font-medium mb-3"
                style={{ color: theme.colors.primary }}
              >
                Live AR Content
              </h3>
              <p className="text-white/60 text-sm">
                Synchronized AR experiences for event participants
              </p>
            </div>
            
            <div className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
              <h3 
                className="text-lg font-medium mb-3"
                style={{ color: theme.colors.primary }}
              >
                Real-time Interaction
              </h3>
              <p className="text-white/60 text-sm">
                Live polls, Q&A, and audience participation features
              </p>
            </div>
            
            <div className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
              <h3 
                className="text-lg font-medium mb-3"
                style={{ color: theme.colors.primary }}
              >
                Event Timeline
              </h3>
              <p className="text-white/60 text-sm">
                Synchronized content delivery based on event progression
              </p>
            </div>
            
            <div className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
              <h3 
                className="text-lg font-medium mb-3"
                style={{ color: theme.colors.primary }}
              >
                Live Data
              </h3>
              <p className="text-white/60 text-sm">
                Real-time data visualization and event metrics
              </p>
            </div>
          </div>
          
          <div className="mt-12 text-sm text-white/40">
            Coming soon - Event phase features will be developed based on specific event requirements
          </div>
        </div>
      </div>
    </div>
  );
}