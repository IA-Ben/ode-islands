"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BeforeHub } from "@/components/before/BeforeHub";
import { BeforeLane, type BeforeLaneCard } from "@/components/before/BeforeLane";
import UnifiedTopNav from "@/components/UnifiedTopNav";
import { useFanScore } from "@/hooks/useFanScore";
import LoadingScreen from "@/components/LoadingScreen";
import dynamic from "next/dynamic";
import data from "../data/ode-islands.json";

const UserScoreModal = dynamic(() => import('@/components/UserScoreModal'), {
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
  
  const [currentView, setCurrentView] = useState<"hub" | "plan" | "discover" | "community">("hub");
  const [isUserScoreOpen, setIsUserScoreOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedCard, setSelectedCard] = useState<(BeforeLaneCard & { action?: string }) | null>(null);

  // Restore view from URL params on mount
  useEffect(() => {
    const view = searchParams?.get('view');
    if (view && (view === 'plan' || view === 'discover' || view === 'community')) {
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
    router.push('/memory-wallet');
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

  // Calculate tier from fan score level
  const getTier = (level: number): "Bronze" | "Silver" | "Gold" => {
    if (level >= 8) return "Gold";
    if (level >= 4) return "Silver";
    return "Bronze";
  };

  const points = scoreData?.currentScore?.totalScore || 0;
  const level = scoreData?.currentScore?.level || 1;
  const tier = getTier(level);

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

  // Featured cards (could come from CMS Featured Rules)
  const featuredCards = [
    {
      id: "f1",
      size: "L" as const,
      title: "Begin Your Journey",
      subtitle: "IMMERSIVE STORY",
      ctaLabel: "Start Chapter 1",
      ctaAction: () => router.push('/before/chapter-1'),
    },
  ];

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
        default:
          console.log("Unknown card type:", card.type);
      }
    }
  };

  const handleQuickAction = (action: string) => {
    console.log('Quick action:', action);
  };

  const handleEnterLane = (lane: "plan" | "discover" | "community") => {
    setCurrentView(lane);
  };

  const handleBackToHub = () => {
    setCurrentView("hub");
  };

  const getLaneCards = () => {
    switch (currentView) {
      case "plan":
        return planCards;
      case "discover":
        return discoverCards;
      case "community":
        return communityCards;
      default:
        return [];
    }
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
          <BeforeLane
            lane={currentView}
            cards={getLaneCards()}
            onBack={handleBackToHub}
            onCardClick={handleCardClick}
          />
        )}
      </div>
    </>
  );
}
