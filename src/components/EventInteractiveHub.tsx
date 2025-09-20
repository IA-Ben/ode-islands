"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import InteractiveChoiceSystem from './InteractiveChoiceSystem';

interface LiveEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  settings?: string;
}

interface SessionData {
  isAuthenticated: boolean;
  userId?: string;
  isAdmin?: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
  };
}

interface InteractiveChoice {
  id: string;
  title: string;
  description?: string;
  choiceType: 'multi_choice' | 'ranking' | 'preference_scale' | 'grouped_choices' | 'collaborative_board';
  choices: any[];
  maxSelections?: number;
  minSelections: number;
  allowCustomInput: boolean;
  visualizationType: 'bar_chart' | 'pie_chart' | 'word_cloud' | 'live_grid';
  showLiveResults: boolean;
  showPercentages: boolean;
  animateResults: boolean;
  timeLimit?: number;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  showResults: boolean;
  feedbackMessage?: string;
  themeSettings?: any;
}

interface EventInteractiveHubProps {
  event: LiveEvent;
  session: SessionData;
  theme: any;
}

export default function EventInteractiveHub({ event, session, theme }: EventInteractiveHubProps) {
  const [activeChoices, setActiveChoices] = useState<InteractiveChoice[]>([]);
  const [selectedView, setSelectedView] = useState<'choices' | 'admin' | 'results'>('choices');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch active interactive choices for this event
  useEffect(() => {
    const fetchActiveChoices = async () => {
      try {
        const response = await fetch(`/api/cms/interactive-choices?eventId=${event.id}&status=active`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setActiveChoices(data.choices || []);
        } else {
          throw new Error('Failed to fetch interactive choices');
        }
      } catch (err) {
        console.error('Error fetching interactive choices:', err);
        setError('Failed to load interactive features');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveChoices();
    
    // Set up polling for real-time updates every 30 seconds
    const interval = setInterval(fetchActiveChoices, 30000);
    
    return () => clearInterval(interval);
  }, [event.id]);

  const handleResponseSubmit = (response: any) => {
    // Refresh choices to get updated statistics
    // In a real implementation, this could be optimized with WebSocket updates
    setTimeout(() => {
      const fetchChoices = async () => {
        try {
          const response = await fetch(`/api/cms/interactive-choices?eventId=${event.id}&status=active`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            setActiveChoices(data.choices || []);
          }
        } catch (err) {
          console.error('Error refreshing choices:', err);
        }
      };
      
      fetchChoices();
    }, 1000);
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-black relative overflow-y-auto">
        <div className="h-full pt-20 flex flex-col items-center justify-center text-center px-8">
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(ellipse at center, ${theme.colors.primary}40 0%, transparent 50%)`
            }}
          />
          
          <div className="relative z-10">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2" style={{ borderColor: theme.colors.primary }}></div>
            <p className="text-white/60 mt-4">Loading Interactive Experience...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-black relative overflow-y-auto">
        <div className="h-full pt-20 flex flex-col items-center justify-center text-center px-8">
          <Card className="bg-red-500/10 border-red-500/20 max-w-md">
            <CardHeader>
              <CardTitle className="text-red-400">Error Loading Interactive Features</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-300 mb-4">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-red-500/40 text-red-400 hover:bg-red-500/10"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black relative overflow-y-auto">
      {/* Background gradient effect */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(ellipse at center, ${theme.colors.primary}40 0%, transparent 70%)`
        }}
      />
      
      <div className="relative z-10 container mx-auto px-4 py-8 pt-24 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Interactive Experience Hub
          </h1>
          <p className="text-white/60 text-lg">
            Participate in live choices and group decisions for "{event.title}"
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-1">
            <Button
              variant={selectedView === 'choices' ? 'default' : 'ghost'}
              onClick={() => setSelectedView('choices')}
              className="text-white"
            >
              🎯 Active Choices
            </Button>
            
            {session.isAuthenticated && session.isAdmin && (
              <>
                <Button
                  variant={selectedView === 'admin' ? 'default' : 'ghost'}
                  onClick={() => setSelectedView('admin')}
                  className="text-white ml-2"
                >
                  ⚙️ Admin Panel
                </Button>
                <Button
                  variant={selectedView === 'results' ? 'default' : 'ghost'}
                  onClick={() => setSelectedView('results')}
                  className="text-white ml-2"
                >
                  📊 Results View
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        {selectedView === 'choices' && (
          <div className="space-y-6">
            {activeChoices.length === 0 ? (
              <Card className="bg-white/5 border-white/10 text-center">
                <CardContent className="p-8">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-xl font-bold text-white mb-2">No Active Choices</h3>
                  <p className="text-white/60">
                    There are currently no interactive choices available. Check back when the event host activates new group decision opportunities.
                  </p>
                </CardContent>
              </Card>
            ) : (
              activeChoices.map((choice) => (
                <InteractiveChoiceSystem
                  key={choice.id}
                  choice={choice}
                  userId={session.userId}
                  isAdmin={session.isAdmin}
                  onResponseSubmit={handleResponseSubmit}
                  className="bg-white/5 border-white/10 text-white"
                />
              ))
            )}
          </div>
        )}

        {selectedView === 'admin' && session.isAuthenticated && session.isAdmin && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Admin Panel - Interactive Choices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-white/60 text-center py-8">
                <p className="mb-4">Admin panel for creating and managing interactive choices will be implemented here.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    📝 Create New Choice
                  </Button>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    📊 View Analytics
                  </Button>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    ⏱️ Schedule Choice
                  </Button>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    🎨 Theme Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedView === 'results' && session.isAuthenticated && session.isAdmin && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Results Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-white/60 text-center py-8">
                <p className="mb-4">Comprehensive results and analytics dashboard will be implemented here.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">{activeChoices.length}</div>
                    <div>Active Choices</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                      {activeChoices.reduce((sum, choice) => sum + (choice as any).totalResponses || 0, 0)}
                    </div>
                    <div>Total Responses</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">Live</div>
                    <div>Event Status</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Event Status Bar */}
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <div className="bg-black/70 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-2 max-w-md mx-auto">
            <div className="flex items-center justify-between text-white/60 text-sm">
              <span>
                🎪 {event.title}
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                Live Event
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}