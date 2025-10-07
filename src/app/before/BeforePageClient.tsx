"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BeforeHub } from "@/components/before/BeforeHub";
import { BeforeLane, type BeforeLaneCard } from "@/components/before/BeforeLane";
import UnifiedTopNav from "@/components/UnifiedTopNav";
import { useFanScore } from "@/hooks/useFanScore";
import LoadingScreen from "@/components/LoadingScreen";
import dynamic from "next/dynamic";
import data from "../data/ode-islands.json";

// Hook to fetch cards from API
function useBeforeCards(lane: "plan" | "discover" | "community" | "bts" | null) {
  const [cards, setCards] = useState<BeforeLaneCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchSucceeded, setFetchSucceeded] = useState(false);
  const activeLaneRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lane) {
      setCards([]);
      setFetchSucceeded(false);
      setLoading(false);
      return;
    }

    // Track the active lane to prevent race conditions
    activeLaneRef.current = lane;

    const fetchCards = async () => {
      const currentLane = lane; // Capture lane value for this fetch
      setLoading(true);
      setFetchSucceeded(false);
      
      try {
        const response = await fetch(`/api/before/cards?lane=${currentLane}`);
        
        // Ignore response if lane changed while fetching
        if (activeLaneRef.current !== currentLane) {
          return;
        }
        
        if (response.ok) {
          const data = await response.json();
          // Transform API cards to BeforeLaneCard format
          const transformedCards: BeforeLaneCard[] = data.cards.map((card: any) => ({
            id: card.id,
            type: card.type,
            title: card.title,
            subtitle: card.subtitle || undefined,
            size: card.size || "M",
            imageUrl: card.imageUrl || undefined,
            description: card.summary || undefined,
          }));
          setCards(transformedCards);
          setFetchSucceeded(true); // Mark fetch as successful even if empty
        }
      } catch (error) {
        // Ignore error if lane changed while fetching
        if (activeLaneRef.current !== currentLane) {
          return;
        }
        console.error('Error fetching before cards:', error);
        setFetchSucceeded(false); // Mark fetch as failed
      } finally {
        // Only update loading state if still on same lane
        if (activeLaneRef.current === currentLane) {
          setLoading(false);
        }
      }
    };

    fetchCards();
  }, [lane]);

  return { cards, loading, fetchSucceeded };
}

// Hook to fetch featured cards
function useFeaturedCards(tier: string) {
  const [cards, setCards] = useState<BeforeLaneCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedCards = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/before/cards?featured=true&tier=${tier}`);
        if (response.ok) {
          const data = await response.json();
          const transformedCards: BeforeLaneCard[] = data.cards.map((card: any) => ({
            id: card.id,
            type: card.type,
            title: card.title,
            subtitle: card.subtitle || undefined,
            size: card.size || "L",
            imageUrl: card.imageUrl || undefined,
            description: card.summary || undefined,
          }));
          setCards(transformedCards);
        }
      } catch (error) {
        console.error('Error fetching featured cards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedCards();
  }, [tier]);

  return { cards, loading };
}

const UserScoreModal = dynamic(() => import('@/components/UserScoreModal'), {
  ssr: false,
  loading: () => null
});

const MemoryWalletModal = dynamic(() => import('@/components/MemoryWalletModal'), {
  ssr: false,
  loading: () => null
});

type ChapterData = {
  [key: string]: any[];
};

const chapterData: ChapterData = data as ChapterData;

interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  permissions?: string[];
}

interface BeforePageClientProps {
  user: UserData | null;
}

export default function BeforePageClient({ user }: BeforePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { scoreData } = useFanScore();
  
  const [currentView, setCurrentView] = useState<"hub" | "plan" | "discover" | "community" | "bts">("hub");
  const [discoverTab, setDiscoverTab] = useState<"all" | "bts" | "concept-art" | "stories">("all");
  const [isUserScoreOpen, setIsUserScoreOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedCard, setSelectedCard] = useState<(BeforeLaneCard & { action?: string }) | null>(null);
  
  // Calculate tier from fan score level first
  const points = scoreData?.currentScore?.totalScore || 0;
  const level = scoreData?.currentScore?.level || 1;
  const getTier = (level: number): "Bronze" | "Silver" | "Gold" => {
    if (level >= 8) return "Gold";
    if (level >= 4) return "Silver";
    return "Bronze";
  };
  const tier = getTier(level);
  
  // Fetch cards from API based on current lane view
  const laneToFetch = currentView !== "hub" ? currentView : null;
  const { cards: apiCards, loading: cardsLoading, fetchSucceeded } = useBeforeCards(laneToFetch);
  
  // Fetch featured cards for the hub view
  const { cards: apiFeaturedCards, loading: featuredLoading } = useFeaturedCards(tier);

  // Restore view from URL params on mount
  useEffect(() => {
    const view = searchParams?.get('view');
    if (view && (view === 'plan' || view === 'discover' || view === 'community' || view === 'bts')) {
      setCurrentView(view);
    }
  }, [searchParams]);

  // Navigation handlers for UnifiedTopNav
  const handlePhaseChange = (phase: "before" | "event" | "after") => {
    setIsNavigating(true);
    setTimeout(() => {
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
    }, 300);
  };

  const handleOpenWallet = () => {
    setIsWalletOpen(true);
  };

  const handleOpenQR = () => {
    console.log('QR scanner opened');
  };

  const handleOpenScore = () => {
    setIsUserScoreOpen(true);
  };

  const handleSwitchMode = (nextMode: "app" | "admin") => {
    if (nextMode === 'admin') {
      router.push('/admin');
    }
  };

  // Card click handler - defined early so featured cards can reference it
  const handleCardClick = (action: string, card: BeforeLaneCard) => {
    if (card.type === "immersive-chapter") {
      // Navigate to the chapter reader with return path
      const returnPath = `/before?view=${currentView}`;
      router.push(`/before/${card.id}?returnTo=${encodeURIComponent(returnPath)}`);
    } else {
      // Open card detail modal for non-chapter cards, preserving action
      setSelectedCard({ ...card, action } as BeforeLaneCard);
    }
  };

  // Extract chapter tiles from JSON data
  const getChapterTiles = (): BeforeLaneCard[] => {
    const chapters = Object.keys(chapterData);
    return chapters.map((chapterId, index) => {
      const firstCard = chapterData[chapterId][0];
      const title = firstCard?.text?.title || `Chapter ${index + 1}`;
      const subtitle = firstCard?.text?.subtitle || "IMMERSIVE STORY";
      
      return {
        id: chapterId,
        type: "immersive-chapter",
        title,
        subtitle,
        size: "M" as const,
        description: `Experience the ${chapterId.replace('-', ' ')} of your journey`,
      };
    });
  };

  // Define card data for each lane
  const planCards: BeforeLaneCard[] = [
    {
      id: "p1",
      type: "tickets",
      title: "Get Your Tickets",
      subtitle: "ESSENTIAL",
      size: "M",
      description: "Secure your spot at the event with early bird pricing",
    },
    {
      id: "p2",
      type: "venue-travel",
      title: "Venue & Travel Info",
      subtitle: "PLAN AHEAD",
      size: "S",
      description: "Directions, parking, and transportation options",
    },
    {
      id: "p3",
      type: "schedule-preview",
      title: "Event Schedule",
      subtitle: "YOUR NIGHT",
      size: "S",
      description: "Preview the full event timeline and plan your experience",
    },
    {
      id: "p4",
      type: "safety-info",
      title: "Safety & Access",
      subtitle: "IMPORTANT",
      size: "M",
      description: "Important safety information and accessibility details",
    },
  ];

  const discoverCards: BeforeLaneCard[] = [
    ...getChapterTiles(),
    {
      id: "d1",
      type: "trailer",
      title: "Official Trailer",
      subtitle: "WATCH NOW",
      size: "L",
      description: "Get a sneak peek of what awaits you at the event",
    },
    {
      id: "d2",
      type: "lore",
      title: "Story & Lore",
      subtitle: "WORLDBUILDING",
      size: "S",
      description: "Dive deep into the story behind the experience",
    },
    {
      id: "d3",
      type: "daily-drop",
      title: "Daily Drop",
      subtitle: "24H EXCLUSIVE",
      size: "S",
      description: "Today's exclusive content unlocked just for you",
    },
  ];

  const communityCards: BeforeLaneCard[] = [
    {
      id: "cm1",
      type: "challenge",
      title: "Pre-Event Challenge",
      subtitle: "EARN REWARDS",
      size: "M",
      description: "Complete tasks to earn points and exclusive rewards",
    },
    {
      id: "cm2",
      type: "polls",
      title: "Community Polls",
      subtitle: "HAVE YOUR SAY",
      size: "S",
      description: "Vote on event features and share your preferences",
    },
    {
      id: "cm3",
      type: "leaderboard",
      title: "Leaderboard",
      subtitle: "TOP FANS",
      size: "S",
      description: "See who's leading the pre-event engagement",
    },
    {
      id: "cm4",
      type: "social",
      title: "Connect with Others",
      subtitle: "COMMUNITY",
      size: "M",
      description: "Find friends also attending and plan together",
    },
  ];

  const btsCards: BeforeLaneCard[] = [
    {
      id: "bts1",
      type: "making-of",
      title: "The Making Of",
      subtitle: "EXCLUSIVE",
      size: "L",
      description: "Go behind the curtain to see how this experience came to life",
    },
    {
      id: "bts2",
      type: "creator-interview",
      title: "Meet the Creators",
      subtitle: "INSIGHTS",
      size: "M",
      description: "Hear from the minds behind the magic",
    },
    {
      id: "bts3",
      type: "production-diary",
      title: "Production Diary",
      subtitle: "DAILY UPDATES",
      size: "S",
      description: "Follow the journey from concept to reality",
    },
    {
      id: "bts4",
      type: "concept-art",
      title: "Concept Art Gallery",
      subtitle: "VISUAL DEV",
      size: "S",
      description: "Explore early designs and creative evolution",
    },
  ];

  // Fallback featured cards when CMS is empty
  const fallbackFeaturedCards = [
    {
      id: "f1",
      size: "L" as const,
      title: "Begin Your Journey",
      subtitle: "IMMERSIVE STORY",
      ctaLabel: "Start Chapter 1",
      ctaAction: () => router.push('/before/chapter-1'),
    },
  ];
  
  // Use CMS featured cards if available, fallback to hardcoded
  const featuredCards = apiFeaturedCards.length > 0 ? apiFeaturedCards.map(card => ({
    id: card.id,
    size: card.size,
    title: card.title,
    subtitle: card.subtitle,
    ctaLabel: "Explore",
    ctaAction: () => handleCardClick("view", card),
  })) : fallbackFeaturedCards;

  const handleCardAction = (action: string, card: BeforeLaneCard) => {
    setSelectedCard(null);
    
    // Route based on action first, then card type for full extensibility
    const actionType = action || "view";
    
    // Future actions like "share", "bookmark" would branch here
    if (actionType === "share") {
      // Handle share action
      console.log("Sharing card:", card.type);
      return;
    }
    
    if (actionType === "bookmark") {
      // Handle bookmark action
      console.log("Bookmarking card:", card.type);
      return;
    }
    
    // Default "view" action routes to card-specific destinations
    if (actionType === "view") {
      switch (card.type) {
        case "tickets":
          router.push('/tickets');
          break;
        case "venue-travel":
          router.push('/venue');
          break;
        case "schedule-preview":
          router.push('/schedule');
          break;
        case "safety-info":
          router.push('/safety');
          break;
        case "trailer":
          router.push('/trailer');
          break;
        case "lore":
          router.push('/lore');
          break;
        case "daily-drop":
          router.push('/daily-drop');
          break;
        case "challenge":
          router.push('/challenge');
          break;
        case "polls":
          router.push('/polls');
          break;
        case "leaderboard":
          router.push('/leaderboard');
          break;
        case "social":
          router.push('/community');
          break;
        case "making-of":
          router.push('/bts/making-of');
          break;
        case "creator-interview":
          router.push('/bts/interviews');
          break;
        case "production-diary":
          router.push('/bts/diary');
          break;
        case "concept-art":
          router.push('/bts/concept-art');
          break;
        default:
          console.log("Unknown card type:", card.type);
      }
    }
  };

  const handleQuickAction = (action: string) => {
    console.log('Quick action:', action);
  };

  const handleEnterLane = (lane: "plan" | "discover" | "community" | "bts") => {
    setCurrentView(lane);
  };

  const handleBackToHub = () => {
    setCurrentView("hub");
  };

  const getLaneCards = () => {
    let cards: BeforeLaneCard[] = [];
    
    // If fetch succeeded, use API cards (even if empty - will show empty state with admin link)
    if (fetchSucceeded) {
      cards = apiCards;
    }
    // Only fallback to stub data if fetch failed (not if database is empty)
    else if (!fetchSucceeded && !cardsLoading) {
      switch (currentView) {
        case "plan":
          cards = planCards;
          break;
        case "discover":
          cards = discoverCards;
          break;
        case "community":
          cards = communityCards;
          break;
        case "bts":
          cards = btsCards;
          break;
        default:
          cards = [];
      }
    }
    
    // Filter Discover cards by intra-tab
    if (currentView === "discover" && discoverTab !== "all") {
      return cards.filter(card => {
        switch (discoverTab) {
          case "bts":
            return card.type === "bts-video" || card.type === "bts-playlist";
          case "concept-art":
            return card.type === "concept-art-gallery" || card.type === "concept-art-spotlight";
          case "stories":
            return card.type === "immersive-chapter" || card.type === "continue-chapter";
          default:
            return true;
        }
      });
    }
    
    return cards;
  };

  return (
    <>
      {isNavigating && <LoadingScreen />}
      
      <div className="min-h-screen bg-slate-900">
        <UnifiedTopNav
          mode="app"
          user={user}
          currentPhase="before"
          onPhaseChange={handlePhaseChange}
          walletNewCount={0}
          points={points}
          tier={tier}
          onOpenWallet={handleOpenWallet}
          onOpenQR={handleOpenQR}
          onOpenScore={handleOpenScore}
          onSwitchMode={handleSwitchMode}
        />
        
        <UserScoreModal
          isOpen={isUserScoreOpen}
          onClose={() => setIsUserScoreOpen(false)}
          source="tier_pill"
        />

        <MemoryWalletModal
          isOpen={isWalletOpen}
          onClose={() => setIsWalletOpen(false)}
        />

        {/* Card Detail Modal */}
        {selectedCard && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedCard(null)}
          >
            <div 
              className="relative max-w-2xl w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-white/10 p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedCard(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="space-y-6">
                <div>
                  {selectedCard.subtitle && (
                    <div className="text-sm font-medium text-fuchsia-400 uppercase tracking-wide mb-2">
                      {selectedCard.subtitle}
                    </div>
                  )}
                  <h2 className="text-3xl font-bold text-white">{selectedCard.title}</h2>
                </div>

                {selectedCard.imageUrl && (
                  <div className="relative w-full h-64 rounded-2xl overflow-hidden">
                    <img
                      src={selectedCard.imageUrl}
                      alt={selectedCard.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {selectedCard.description && (
                  <p className="text-lg text-slate-300">{selectedCard.description}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleCardAction(selectedCard.action || "view", selectedCard)}
                    className="flex-1 px-6 py-3 rounded-2xl bg-fuchsia-600 text-white font-semibold hover:bg-fuchsia-700 transition-colors"
                  >
                    {selectedCard.type === "tickets" ? "Get Tickets" :
                     selectedCard.type === "venue-travel" ? "View Details" :
                     selectedCard.type === "schedule-preview" ? "See Schedule" :
                     selectedCard.type === "trailer" ? "Watch Trailer" :
                     selectedCard.type === "lore" ? "Read More" :
                     selectedCard.type === "challenge" ? "Join Challenge" :
                     selectedCard.type === "polls" ? "Vote Now" :
                     selectedCard.type === "leaderboard" ? "View Rankings" :
                     selectedCard.type === "making-of" ? "Watch Now" :
                     selectedCard.type === "creator-interview" ? "Watch Interview" :
                     selectedCard.type === "production-diary" ? "Read Diary" :
                     selectedCard.type === "concept-art" ? "View Gallery" :
                     "Learn More"}
                  </button>
                  <button
                    onClick={() => setSelectedCard(null)}
                    className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === "hub" ? (
          <BeforeHub
            onEnterLane={handleEnterLane}
            featuredCards={featuredCards}
            onQuickAction={handleQuickAction}
            eventDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)} // 7 days from now
          />
        ) : (
          <>
            {/* Discover Intra-Tabs Navigation */}
            {currentView === "discover" && (
              <div className="sticky top-[72px] z-40 bg-slate-900/95 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
                    {[
                      { id: "all", label: "All" },
                      { id: "bts", label: "BTS" },
                      { id: "concept-art", label: "Concept Art" },
                      { id: "stories", label: "Stories" }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setDiscoverTab(tab.id as "all" | "bts" | "concept-art" | "stories")}
                        className={`
                          px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                          ${discoverTab === tab.id
                            ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/25'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
                          }
                        `}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <BeforeLane
              lane={currentView}
              cards={getLaneCards()}
              onBack={handleBackToHub}
              onCardClick={handleCardClick}
              isAdmin={user?.permissions?.includes('*') || false}
            />
          </>
        )}
      </div>
    </>
  );
}
