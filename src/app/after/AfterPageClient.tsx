"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UnifiedTopNav from "@/components/UnifiedTopNav";
import { useFanScore } from '@/hooks/useFanScore';
import { AfterHub, type FeaturedAfterCard, type WelcomeHeroData } from '@/components/after/AfterHub';
import { AfterLane, type AfterLaneCard } from '@/components/after/AfterLane';
import LoadingScreen from '@/components/LoadingScreen';
import dynamic from 'next/dynamic';
import type { Tier } from '@/components/event/GlobalHUD';

const MemoryWalletModal = dynamic(() => import('@/components/MemoryWalletModal'), {
  ssr: false,
  loading: () => null
});

interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  permissions?: string[];
}

interface AfterPageClientProps {
  user: UserData | null;
}

export default function AfterPageClient({ user }: AfterPageClientProps) {
  const router = useRouter();
  const { scoreData } = useFanScore();
  const [view, setView] = useState<"hub" | "recap" | "create" | "offers">("hub");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  const handlePhaseChange = (phase: "before" | "event" | "after") => {
    setIsTransitioning(true);
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
    console.log('Fan score modal opened');
  };

  const handleSwitchMode = (nextMode: "app" | "admin") => {
    if (nextMode === 'admin') {
      router.push('/admin');
    }
  };

  const getTier = (level: number): Tier => {
    if (level >= 8) return "Gold";
    if (level >= 4) return "Silver";
    return "Bronze";
  };

  const getNextTier = (tier: Tier): Tier | undefined => {
    if (tier === "Bronze") return "Silver";
    if (tier === "Silver") return "Gold";
    return undefined;
  };

  const points = scoreData?.currentScore?.totalScore || 0;
  const level = scoreData?.currentScore?.level || 1;
  const tier = getTier(level);
  const nextTier = getNextTier(tier);

  // Mock welcome data - in production, this would come from API
  const welcomeData: WelcomeHeroData = {
    userName: user?.firstName || "Friend",
    lastMemory: {
      title: "Opening Night Memories",
      imageUrl: undefined,
    },
    tier,
    pointsToNextTier: nextTier ? 350 : 0,
    nextTier,
  };

  // Mock featured cards - in production, these would come from Featured Rules API
  const featuredCards: FeaturedAfterCard[] = [
    {
      id: "1",
      size: "L",
      title: "Your Event Highlights Reel",
      subtitle: "PERSONALIZED",
      ctaLabel: "Watch Now",
      ctaAction: () => {
        console.log("Watch highlights reel");
      },
    },
  ];

  // Mock lane cards - in production, these would come from Card Library API filtered by lane
  const recapCards: AfterLaneCard[] = [
    {
      id: "r1",
      type: "memory-timeline",
      title: "Memory Timeline",
      subtitle: "RECAP",
      size: "M",
      description: "Relive your journey chronologically with all your collected memories",
    },
    {
      id: "r2",
      type: "set-completion",
      title: "Set Completion",
      subtitle: "ACHIEVEMENTS",
      size: "S",
      description: "Track your collection progress and unlock badges",
    },
    {
      id: "r3",
      type: "badges",
      title: "Badge Collection",
      subtitle: "REWARDS",
      size: "S",
      description: "View all earned badges and achievements",
    },
    {
      id: "r4",
      type: "highlights-reel",
      title: "Smart Highlights",
      subtitle: "AI POWERED",
      size: "M",
      description: "Auto-generated highlight reel of your best moments",
    },
    {
      id: "r5",
      type: "photo-drop",
      title: "Official Photo Drop",
      subtitle: "NEW PHOTOS",
      size: "L",
      description: "Professional event photos available for download and sharing",
    },
  ];

  const createCards: AfterLaneCard[] = [
    {
      id: "c1",
      type: "story-epilogues",
      title: "Story Epilogues",
      subtitle: "NEW CHAPTERS",
      size: "M",
      description: "Unlock exclusive post-event story content and endings",
    },
    {
      id: "c2",
      type: "poster-maker",
      title: "Poster Maker",
      subtitle: "CREATE",
      size: "S",
      description: "Design custom posters with your favorite memories",
    },
    {
      id: "c3",
      type: "remix-studio",
      title: "Remix Studio",
      subtitle: "COMING SOON",
      size: "S",
      description: "Create video remixes with AI-powered editing",
    },
    {
      id: "c4",
      type: "photo-editor",
      title: "Photo Editor",
      subtitle: "ENHANCE",
      size: "S",
      description: "Edit and enhance your captured photos with filters and effects",
    },
    {
      id: "c5",
      type: "smart-video-editor",
      title: "Smart Video Editor",
      subtitle: "AI POWERED",
      size: "M",
      description: "Create professional highlight reels with AI-powered editing, captions, and effects",
    },
    {
      id: "c6",
      type: "at-home-ar",
      title: "At-Home AR Experience",
      subtitle: "IMMERSIVE",
      size: "L",
      description: "Bring the magic home with exclusive AR experiences you can enjoy anywhere",
    },
  ];

  const offersCards: AfterLaneCard[] = [
    {
      id: "o1",
      type: "tier-perks",
      title: "Tier Perks",
      subtitle: tier.toUpperCase(),
      size: "M",
      description: `Exclusive rewards for ${tier} tier members`,
    },
    {
      id: "o2",
      type: "next-show",
      title: "Next Event",
      subtitle: "COMING UP",
      size: "S",
      description: "Get early access to tickets for our next experience",
    },
    {
      id: "o3",
      type: "referrals",
      title: "Refer Friends",
      subtitle: "EARN POINTS",
      size: "S",
      description: "Share your experience and earn bonus points",
    },
    {
      id: "o4",
      type: "merch",
      title: "Exclusive Merchandise",
      subtitle: "LIMITED TIME",
      size: "M",
      description: "Official event merchandise with special after-show pricing",
    },
    {
      id: "o5",
      type: "nps-review",
      title: "Share Your Feedback",
      subtitle: "EARN REWARDS",
      size: "L",
      description: "Help us improve! Complete a quick survey and earn bonus points",
    },
  ];

  const handleEnterLane = (lane: "recap" | "create" | "offers") => {
    setView(lane);
  };

  const handleBackToHub = () => {
    setView("hub");
  };

  const handleCardClick = (card: AfterLaneCard) => {
    console.log("Card clicked:", card);
    // In production, this would navigate to card detail view or trigger card action
  };

  const handleQuickAction = (action: "share" | "remix" | "claim" | "wallet") => {
    console.log("Quick action:", action);
    if (action === "wallet") {
      handleOpenWallet();
    }
  };

  return (
    <>
      {isTransitioning && <LoadingScreen />}
      
      <div className="min-h-screen bg-slate-900">
        <UnifiedTopNav
          mode="app"
          currentPhase="after"
          user={user}
          onPhaseChange={handlePhaseChange}
          onOpenWallet={handleOpenWallet}
          onOpenQR={handleOpenQR}
          onOpenScore={handleOpenScore}
          onSwitchMode={handleSwitchMode}
          tier={tier}
          points={points}
        />

        <MemoryWalletModal
          isOpen={isWalletOpen}
          onClose={() => setIsWalletOpen(false)}
        />

        {view === "hub" && (
          <AfterHub
            onEnterLane={handleEnterLane}
            featuredCards={featuredCards}
            welcomeData={welcomeData}
            onQuickAction={handleQuickAction}
          />
        )}

        {view === "recap" && (
          <AfterLane
            lane="recap"
            cards={recapCards}
            onBack={handleBackToHub}
            onCardClick={handleCardClick}
          />
        )}

        {view === "create" && (
          <AfterLane
            lane="create"
            cards={createCards}
            onBack={handleBackToHub}
            onCardClick={handleCardClick}
          />
        )}

        {view === "offers" && (
          <AfterLane
            lane="offers"
            cards={offersCards}
            onBack={handleBackToHub}
            onCardClick={handleCardClick}
          />
        )}
      </div>
    </>
  );
}
