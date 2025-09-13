"use client";

import PhaseNavigation from "@/components/PhaseNavigation";
import { useTheme } from '@/contexts/ThemeContext';

export default function AfterPage() {
  const { theme } = useTheme();

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <PhaseNavigation currentPhase="after" />
      
      <div className="h-full pt-20 flex flex-col items-center justify-center text-center px-8">
        {/* Background gradient */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at center, ${theme.colors.secondary}40 0%, transparent 50%)`
          }}
        />
        
        <div className="relative z-10 max-w-2xl">
          {/* Phase indicator */}
          <div 
            className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-8 border"
            style={{ 
              color: theme.colors.secondary,
              borderColor: theme.colors.secondary + '40',
              backgroundColor: theme.colors.secondary + '10'
            }}
          >
            After Phase
          </div>
          
          {/* Main content */}
          <h1 
            className="text-4xl md:text-6xl font-bold mb-6"
            style={{ color: theme.colors.secondary }}
          >
            After Event
          </h1>
          
          <h2 className="text-xl md:text-2xl text-white/80 mb-8 font-medium">
            Post-Event Content
          </h2>
          
          <p className="text-lg text-white/60 mb-12 leading-relaxed">
            This phase delivers content after your event concludes. 
            Features for reflection, sharing experiences, continued engagement, 
            and post-event analysis will be built here.
          </p>
          
          {/* Feature preview cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <div className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
              <h3 
                className="text-lg font-medium mb-3"
                style={{ color: theme.colors.secondary }}
              >
                Event Memories
              </h3>
              <p className="text-white/60 text-sm">
                Curated highlights and memorable moments from the event
              </p>
            </div>
            
            <div className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
              <h3 
                className="text-lg font-medium mb-3"
                style={{ color: theme.colors.secondary }}
              >
                Share & Reflect
              </h3>
              <p className="text-white/60 text-sm">
                Tools for sharing experiences and reflecting on the journey
              </p>
            </div>
            
            <div className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
              <h3 
                className="text-lg font-medium mb-3"
                style={{ color: theme.colors.secondary }}
              >
                Continued Journey
              </h3>
              <p className="text-white/60 text-sm">
                Extended content and ways to continue the experience
              </p>
            </div>
            
            <div className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
              <h3 
                className="text-lg font-medium mb-3"
                style={{ color: theme.colors.secondary }}
              >
                Community Connection
              </h3>
              <p className="text-white/60 text-sm">
                Connect with other participants and build lasting connections
              </p>
            </div>
          </div>
          
          <div className="mt-12 text-sm text-white/40">
            Coming soon - After phase features will be developed based on post-event needs
          </div>
        </div>
      </div>
    </div>
  );
}