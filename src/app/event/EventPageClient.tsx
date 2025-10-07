"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import UnifiedTopNav from '@/components/UnifiedTopNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import HelpSystem from '@/components/HelpSystem';
import { SectionScaffold } from '@/components/SectionScaffold';
import { EventHub, type FeaturedCard, type NowNextItem } from '@/components/event/EventHub';
import { EventLane, type EventLaneCard } from '@/components/event/EventLane';
import { GlobalHUD, type Tier } from '@/components/event/GlobalHUD';
import ScoreToast from '@/components/ScoreToast';
import type { ScoreToastData } from '@/@typings/fanScore';
import { selectFeaturedCards, type FeaturedCardWithRules, type UserContext } from '@/lib/event/cardSelection';
import { useFanScore } from '@/hooks/useFanScore';
import dynamic from 'next/dynamic';

const EventDashboard = dynamic(() => import('@/components/EventDashboard'), {
  loading: () => <div className="p-8 text-white/60">Loading dashboard...</div>
});

const EventInteractiveHub = dynamic(() => import('@/components/EventInteractiveHub'), {
  loading: () => <div className="p-8 text-white/60">Loading interactive features...</div>
});

const QRScanner = dynamic(() => import('@/components/QRScanner'), {
  ssr: false,
  loading: () => null
});

// Types
interface LiveEvent {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  isActive: boolean | null;
  settings?: string | null;
  createdBy?: string | null;
  createdAt: string | null;
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

interface InitialData {
  session: SessionData;
  events: LiveEvent[];
  activeEvent: LiveEvent | null;
  userType: 'admin' | 'audience';
  error?: string;
}

interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  permissions?: string[];
}

interface EventPageClientProps {
  initialData: InitialData;
}

export default function EventPageClient({ initialData }: EventPageClientProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const { scoreData } = useFanScore();
  const [user] = useState<UserData | null>(initialData.session.user || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialData.error || null);
  const [events, setEvents] = useState<LiveEvent[]>(initialData.events);
  const [session] = useState<SessionData>(initialData.session);
  const [activeEvent, setActiveEvent] = useState<LiveEvent | null>(initialData.activeEvent);
  
  // Navigation handlers for UnifiedTopNav
  const handlePhaseChange = (phase: "before" | "event" | "after") => {
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

  const handleOpenWallet = () => {
    router.push('/memory-wallet');
  };

  const handleOpenQR = () => {
    setIsQRScannerOpen(true);
  };

  const handleSwitchMode = (nextMode: "app" | "admin") => {
    if (nextMode === 'admin') {
      router.push('/admin');
    }
  };

  // Calculate tier from fan score level
  const getTierFromLevel = (level: number): "Bronze" | "Silver" | "Gold" => {
    if (level >= 8) return "Gold";
    if (level >= 4) return "Silver";
    return "Bronze";
  };

  const points = scoreData?.currentScore?.totalScore || 0;
  const level = scoreData?.currentScore?.level || 1;
  const tier = getTierFromLevel(level);
  
  const [activeView, setActiveView] = useState<'audience' | 'dashboard' | 'interactive'>(() => {
    if (initialData.userType === 'admin') {
      return 'dashboard';
    }
    return 'audience';
  });
  
  const [view, setView] = useState<'hub' | 'lane'>('hub');
  const [currentLane, setCurrentLane] = useState<'info' | 'interact' | 'rewards' | null>(null);
  
  // Fan Score and Memory Wallet state
  const [currentPoints, setCurrentPoints] = useState(0);
  const [currentTier, setCurrentTier] = useState<Tier>('Bronze');
  const [nextTierThreshold, setNextTierThreshold] = useState(100);
  const [newItemsCount, setNewItemsCount] = useState(0);
  const [hudPulse, setHudPulse] = useState(false);
  
  // Toast notifications
  const [toasts, setToasts] = useState<ScoreToastData[]>([]);
  
  // QR Scanner state
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  
  // Demo mode state
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Event lane cards state
  const [infoLaneCards, setInfoLaneCards] = useState<EventLaneCard[]>([]);
  const [interactLaneCards, setInteractLaneCards] = useState<EventLaneCard[]>([]);
  const [rewardsLaneCards, setRewardsLaneCards] = useState<EventLaneCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState<string | null>(null);
  
  // Featured cards state
  const [featuredCardsPool, setFeaturedCardsPool] = useState<FeaturedCardWithRules[]>([]);
  const [featuredCardsLoading, setFeaturedCardsLoading] = useState(true);
  const [featuredCardsError, setFeaturedCardsError] = useState<string | null>(null);
  
  // Debouncing for memory awards
  const awardingRef = useRef<Set<string>>(new Set());
  const csrfTokenRef = useRef<string | null>(null);

  // Optimized CSRF token fetching (only when needed)
  const fetchCSRFToken = async () => {
    if (!session.isAuthenticated) return null;
    
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.csrfToken) {
          csrfTokenRef.current = data.csrfToken;
          return data.csrfToken;
        }
      }
    } catch (err) {
      console.error('Failed to fetch CSRF token:', err);
    }
    return null;
  };

  // Fetch fan score data
  const fetchFanScore = useCallback(async () => {
    if (!session.isAuthenticated) return;

    try {
      const response = await fetch('/api/fan-score', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.scoreData) {
          const { currentScore } = data.scoreData;
          setCurrentPoints(currentScore.totalScore || 0);
          
          const level = currentScore.level || 1;
          if (level <= 3) {
            setCurrentTier('Bronze');
            setNextTierThreshold(250);
          } else if (level <= 6) {
            setCurrentTier('Silver');
            setNextTierThreshold(2000);
          } else {
            setCurrentTier('Gold');
            setNextTierThreshold(8000);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch fan score:', error);
    }
  }, [session.isAuthenticated]);

  // Show toast notification
  const showToast = useCallback((toastData: ScoreToastData) => {
    setToasts(prev => [...prev, toastData]);
  }, []);

  // Dismiss toast
  const dismissToast = useCallback((index: number) => {
    setToasts(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Award memory function with debouncing
  const awardMemory = useCallback(async (
    templateId: string,
    source: string,
    points: number,
    metadata?: Record<string, any>
  ) => {
    if (!session.isAuthenticated) {
      console.warn('User not authenticated, cannot award memory');
      return;
    }

    const awardKey = `${templateId}-${source}`;
    
    if (awardingRef.current.has(awardKey)) {
      console.log('Memory award already in progress for:', awardKey);
      return;
    }

    awardingRef.current.add(awardKey);

    try {
      let token = csrfTokenRef.current;
      if (!token) {
        token = await fetchCSRFToken();
      }

      const response = await fetch('/api/memory-wallet/award', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-CSRF-Token': token } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          templateId,
          source,
          points,
          eventId: activeEvent?.id,
          metadata
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setNewItemsCount(prev => prev + 1);
        setHudPulse(true);
        setTimeout(() => setHudPulse(false), 500);

        setCurrentPoints(data.totalPoints || currentPoints + points);
        
        showToast({
          points,
          activityType: 'memory_collection',
          title: 'Memory Saved!',
          description: `+${points} pts`,
          duration: 3000
        });

        fetchFanScore();
      } else if (response.status === 409) {
        console.log('Memory already collected from this source');
      } else {
        console.error('Failed to award memory:', data.message);
      }
    } catch (error) {
      console.error('Error awarding memory:', error);
    } finally {
      setTimeout(() => {
        awardingRef.current.delete(awardKey);
      }, 1000);
    }
  }, [session.isAuthenticated, activeEvent, currentPoints, fetchCSRFToken, fetchFanScore, showToast]);

  // Optimized events fetching (only for admins when needed)
  const fetchEvents = async () => {
    if (!session.isAdmin) return;
    
    try {
      const response = await fetch('/api/events', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        throw new Error('Failed to fetch events');
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError('Failed to load events');
    }
  };

  // Optimized active event finding (cached and efficient)
  const findActiveEvent = async (): Promise<LiveEvent | null> => {
    try {
      const response = await fetch('/api/events?isActive=true', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const activeEvents = data.events || [];
        
        const now = new Date();
        const currentEvent = activeEvents.find((event: LiveEvent) => {
          const startTime = new Date(event.startTime);
          const endTime = new Date(event.endTime);
          return startTime <= now && now <= endTime && event.isActive;
        });
        
        return currentEvent || (activeEvents.length > 0 ? activeEvents[0] : null);
      } else {
        console.warn('Failed to fetch active events');
        return null;
      }
    } catch (err) {
      console.error('Failed to find active event:', err);
      return null;
    }
  };

  // Initialize CSRF token and fan score for authenticated users
  useEffect(() => {
    if (session.isAuthenticated) {
      fetchCSRFToken();
      fetchFanScore();
    }
  }, [session.isAuthenticated, fetchFanScore]);

  // Fetch event lane cards on mount
  useEffect(() => {
    async function fetchEventCards() {
      setCardsLoading(true);
      setCardsError(null);
      
      try {
        const [infoResponse, interactResponse, rewardsResponse] = await Promise.all([
          fetch('/api/event/cards?laneKey=info'),
          fetch('/api/event/cards?laneKey=interact'),
          fetch('/api/event/cards?laneKey=rewards'),
        ]);

        const [infoData, interactData, rewardsData] = await Promise.all([
          infoResponse.json(),
          interactResponse.json(),
          rewardsResponse.json(),
        ]);

        if (infoData.success) {
          setInfoLaneCards(infoData.cards || []);
        }
        if (interactData.success) {
          setInteractLaneCards(interactData.cards || []);
        }
        if (rewardsData.success) {
          setRewardsLaneCards(rewardsData.cards || []);
        }

        if (!infoData.success || !interactData.success || !rewardsData.success) {
          console.warn('Some lane cards failed to load');
        }
      } catch (error) {
        console.error('Failed to fetch event cards:', error);
        setCardsError('Failed to load event cards');
      } finally {
        setCardsLoading(false);
      }
    }

    fetchEventCards();
  }, []);

  // Fetch featured cards from API
  useEffect(() => {
    async function fetchFeaturedCards() {
      try {
        setFeaturedCardsLoading(true);
        
        // Build params - only include zone if we have a real zone context
        // TODO: Get actual zone from location/QR scan/event state when available
        const params = new URLSearchParams({
          context: 'event_hub',
          userTier: currentTier,
          currentTime: new Date().toISOString()
        });
        // Note: Zone parameter omitted - will be added when real zone tracking is implemented
        
        const response = await fetch(`/api/featured/rules?${params.toString()}`);
        const data = await response.json();
        
        if (data.success && data.cards) {
          // Transform cards to add ctaAction handlers
          const cardsWithActions = data.cards.map((card: any) => ({
            ...card,
            ctaLabel: card.ctaLabel || 'Learn More',
            ctaAction: () => {
              // Map action types to real handlers
              switch(card.ctaAction) {
                case 'enter_lane':
                  if (card.ctaTarget === 'info' || card.ctaTarget === 'interact' || card.ctaTarget === 'rewards') {
                    handleEnterLane(card.ctaTarget as 'info' | 'interact' | 'rewards');
                  }
                  break;
                case 'open_url':
                  if (card.ctaTarget) {
                    window.open(card.ctaTarget, '_blank');
                  }
                  break;
                default:
                  console.log(`Featured card clicked: ${card.id}`);
              }
            }
          }));
          setFeaturedCardsPool(cardsWithActions);
        } else {
          setFeaturedCardsPool([]);
        }
      } catch (error) {
        console.error('Failed to fetch featured cards:', error);
        setFeaturedCardsError('Failed to load featured content');
        setFeaturedCardsPool([]);
      } finally {
        setFeaturedCardsLoading(false);
      }
    }
    
    fetchFeaturedCards();
  }, [currentTier]);

  // Refresh active event periodically (only for audience view)
  useEffect(() => {
    if (activeView === 'audience') {
      const interval = setInterval(async () => {
        const currentEvent = await findActiveEvent();
        setActiveEvent(currentEvent);
      }, 30000); // 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [activeView]);

  const backgroundGradient = useMemo(() => 
    `radial-gradient(ellipse at center, ${theme.colors.primary}40 0%, transparent 50%)`,
    [theme.colors.primary]
  );

  const userContext: UserContext = useMemo(() => ({
    currentTier,
    currentTime: new Date(),
    userZone: undefined,
  }), [currentTier]);

  const selectedFeaturedCards = useMemo(() => {
    if (featuredCardsLoading || featuredCardsPool.length === 0) {
      return [];
    }
    
    const result = selectFeaturedCards(featuredCardsPool, userContext);
    console.log('Selected featured cards:', result);
    return result.layoutHint === 'fallback' ? [] : result.selectedCards;
  }, [featuredCardsPool, userContext, featuredCardsLoading]);

  const mockNowNextItems: NowNextItem[] = useMemo(() => [
    {
      id: 'now-1',
      title: 'Opening Ceremony',
      time: '7:00 PM',
      description: 'Welcome to the Ode Islands experience',
      isLive: true
    },
    {
      id: 'next-1',
      title: 'Main Performance',
      time: '7:30 PM',
      description: 'Live music and immersive storytelling',
      isNext: true
    },
    {
      id: 'next-2',
      title: 'Interactive AR Experience',
      time: '8:15 PM',
      description: 'Explore the islands through augmented reality'
    }
  ], []);


  const handleEnterLane = (lane: 'info' | 'interact' | 'rewards') => {
    setCurrentLane(lane);
    setView('lane');
  };

  const handleBackToHub = () => {
    setView('hub');
    setCurrentLane(null);
  };

  const handleCardClick = useCallback((card: EventLaneCard) => {
    console.log('Card clicked:', card);
    
    const pointsMap: Record<string, number> = {
      'live-ar': 50,
      'qr-scan': 20,
      'f&b': 10,
      'merch': 20,
      'user-media': 10,
      'ai-create': 10,
    };
    
    const points = pointsMap[card.type] || 0;
    
    if (points > 0 && session.isAuthenticated) {
      const templateId = `template-${card.type}`;
      const source = card.id;
      
      if (isDemoMode || card.type === 'qr-scan' || card.type === 'live-ar') {
        awardMemory(templateId, source, points, {
          action: 'open',
          cardType: card.type,
          cardTitle: card.title
        });
      }
    }
    
    if (card.type === 'qr-scan') {
      setIsQRScannerOpen(true);
    }
  }, [session.isAuthenticated, isDemoMode, awardMemory]);
  
  const handleQRResult = useCallback((result: { text: string }) => {
    console.log('QR scan result:', result.text);
    setIsQRScannerOpen(false);
    
    if (session.isAuthenticated) {
      awardMemory('template-qr-scan', `qr-${Date.now()}`, 20, {
        action: 'scan',
        qrData: result.text
      });
    }
  }, [session.isAuthenticated, awardMemory]);
  
  const handleQRError = useCallback((error: string) => {
    console.error('QR scan error:', error);
    setIsQRScannerOpen(false);
  }, []);

  const handleQuickAction = (action: 'scan' | 'map' | 'schedule' | 'offers' | 'wallet') => {
    console.log('Quick action:', action);
    if (action === 'scan') {
      handleEnterLane('interact');
    } else if (action === 'map' || action === 'schedule') {
      handleEnterLane('info');
    } else if (action === 'offers') {
      handleEnterLane('rewards');
    } else if (action === 'wallet') {
      router.push('/memory-wallet');
    }
  };

  // Error state with retry functionality
  if (error) {
    return (
      <div className="h-full pt-20 flex flex-col items-center justify-center text-center px-8">
        <Card className="bg-red-500/10 border-red-500/20 max-w-md">
          <CardHeader>
            <CardTitle className="text-red-400">Error Loading Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-300 mb-4">{error}</p>
            <Button 
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchEvents().then(() => {
                  setLoading(false);
                  setActiveView('dashboard');
                });
              }}
              variant="outline"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Audience view
  if (activeView === 'audience') {
    if (!activeEvent) {
      return (
        <div className="h-full pt-20 flex flex-col items-center justify-center text-center px-8">
          <div 
            className="absolute inset-0 opacity-20"
            style={{ background: backgroundGradient }}
          />
          
          <div className="relative z-10 max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">No Live Event</h2>
            <p className="text-white/60 text-lg mb-8 leading-relaxed">
              There's currently no active event happening. Check back when an event is live to join the interactive experience.
            </p>
            <Button
              onClick={async () => {
                setLoading(true);
                const currentEvent = await findActiveEvent();
                setActiveEvent(currentEvent);
                setLoading(false);
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Check Again
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <>
        <UnifiedTopNav
          mode="app"
          user={user}
          currentPhase="event"
          onPhaseChange={handlePhaseChange}
          walletNewCount={newItemsCount}
          points={points}
          tier={tier}
          onOpenWallet={handleOpenWallet}
          onOpenQR={handleOpenQR}
          onSwitchMode={handleSwitchMode}
          isDemoMode={isDemoMode}
          onToggleDemo={() => setIsDemoMode(prev => !prev)}
        />
        {view === 'hub' && (
          <EventHub
            onEnterLane={handleEnterLane}
            featuredCards={selectedFeaturedCards}
            nowNextItems={mockNowNextItems}
            onQuickAction={handleQuickAction}
          />
        )}
        
        {view === 'lane' && currentLane && (
          <EventLane
            lane={currentLane}
            cards={
              currentLane === 'info' 
                ? infoLaneCards 
                : currentLane === 'interact' 
                ? interactLaneCards 
                : rewardsLaneCards
            }
            onBack={handleBackToHub}
            onCardClick={handleCardClick}
          />
        )}
        
        <ScoreToast
          toasts={toasts}
          onDismiss={dismissToast}
          position="top-right"
        />
        
        <QRScanner
          isOpen={isQRScannerOpen}
          onClose={() => setIsQRScannerOpen(false)}
          onResult={handleQRResult}
          onError={handleQRError}
        />
        
        <HelpSystem userRole="audience" />
      </>
    );
  }

  // Admin dashboard view
  if (activeView === 'dashboard') {
    return (
      <>
        <EventDashboard 
          events={events}
          session={session!}
          onEventsUpdate={fetchEvents}
          theme={theme}
        />
        
        <HelpSystem userRole="admin" />
        
        {/* Navigation buttons */}
        <div className="fixed top-20 right-4 z-50 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView('audience')}
            className="bg-black/50 text-white/60 hover:text-white hover:bg-black/70 text-xs block"
          >
            👥 Audience View
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView('interactive')}
            className="bg-black/50 text-white/60 hover:text-white hover:bg-black/70 text-xs block"
          >
            🎯 Interactive Choices
          </Button>
        </div>
      </>
    );
  }

  // Interactive view
  if (activeView === 'interactive') {
    if (!activeEvent) {
      return (
        <div className="h-full pt-20 flex flex-col items-center justify-center text-center px-8">
          <div 
            className="absolute inset-0 opacity-20"
            style={{ background: backgroundGradient }}
          />
          
          <div className="relative z-10 max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">No Active Event</h2>
            <p className="text-white/60 text-lg mb-8 leading-relaxed">
              Interactive choices require an active event. Please wait for an event to start.
            </p>
            <Button
              onClick={() => setActiveView('audience')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Back to Event Hub
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <>
        <EventInteractiveHub
          event={activeEvent}
          session={session!}
          theme={theme}
        />
        
        {/* Navigation buttons */}
        <div className="fixed top-20 right-4 z-50 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView('audience')}
            className="bg-black/50 text-white/60 hover:text-white hover:bg-black/70 text-xs block"
          >
            👥 Audience View
          </Button>
          
          {session?.isAuthenticated && session?.isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetchEvents().then(() => setActiveView('dashboard'));
              }}
              className="bg-black/50 text-white/60 hover:text-white hover:bg-black/70 text-xs block"
            >
              ⚙️ Operator Console
            </Button>
          )}
        </div>
      </>
    );
  }

  return null;
}