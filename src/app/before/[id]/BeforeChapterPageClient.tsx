"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { LazyClientCardWrapper } from '@/components/LazyComponentWrapper';
import Footer from "@/components/Footer";
import UnifiedTopNav from "@/components/UnifiedTopNav";
import { useFanScore } from '@/hooks/useFanScore';
import LoadingScreen from '@/components/LoadingScreen';
import type { CardData } from '@/@typings';
import dynamic from 'next/dynamic';

const UserScoreModal = dynamic(() => import('@/components/UserScoreModal'), {
  ssr: false,
  loading: () => null
});

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

interface BeforeChapterPageClientProps {
  user: UserData | null;
}

export default function BeforeChapterPageClient({ user }: BeforeChapterPageClientProps) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { scoreData } = useFanScore();
  const chapterId = params.id as string;

  const [interacted, setInteracted] = useState<boolean>(false);
  const [index, setIndex] = useState<number>(0);
  const [loadedCards, setLoadedCards] = useState<number>(1); // Start with only first card loaded
  const [isUserScoreOpen, setIsUserScoreOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapterIdMap, setChapterIdMap] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Get return path from URL params or default to /before
  const returnTo = searchParams?.get('returnTo') || '/before';

  // Page fade-in effect
  useEffect(() => {
    const timer = setTimeout(() => setPageReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch chapters and build ID map
  useEffect(() => {
    async function fetchChapters() {
      try {
        const response = await fetch('/api/chapters');
        if (response.ok) {
          const chapters = await response.json();
          const map: Record<string, string> = {};
          chapters.forEach((ch: any) => {
            if (ch.order === 1) map['chapter-1'] = ch.id;
            if (ch.order === 2) map['chapter-2'] = ch.id;
            if (ch.order === 3) map['chapter-3'] = ch.id;
          });
          setChapterIdMap(map);
        }
      } catch (error) {
        console.error('Failed to fetch chapters:', error);
      }
    }
    fetchChapters();
  }, []);

  // Fetch cards for current chapter from database
  useEffect(() => {
    async function fetchCards() {
      if (!chapterIdMap[chapterId]) {
        return; // Wait for chapter ID map
      }

      setLoading(true);
      try {
        const dbChapterId = chapterIdMap[chapterId];
        const response = await fetch(`/api/chapters/${dbChapterId}`);
        if (response.ok) {
          const data = await response.json();
          // Extract card content from storyCards
          const cardData = data.storyCards.map((sc: any) => sc.content);
          setCards(cardData);

          // Check if there's a card parameter in URL for preview
          const cardParam = searchParams?.get('card');
          if (cardParam) {
            const cardIndex = parseInt(cardParam, 10);
            if (!isNaN(cardIndex) && cardIndex >= 0 && cardIndex < cardData.length) {
              setIndex(cardIndex);
              setLoadedCards(Math.max(loadedCards, cardIndex + 2));
              // Scroll to card after a short delay to ensure DOM is ready
              setTimeout(() => scrollToCard(cardIndex), 100);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch cards:', error);
        setCards([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCards();
  }, [chapterId, chapterIdMap]);

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

  const handleReturn = () => {
    router.push(decodeURIComponent(returnTo));
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

  // Redirect to chapter 1 if invalid chapter
  useEffect(() => {
    if (!loading && cards.length === 0 && chapterId !== "chapter-1") {
      router.push("/before/chapter-1");
    }
  }, [cards.length, chapterId, router, loading]);

  const scrollToCard = useCallback((cardIndex: number) => {
    if (containerRef.current) {
      const cardHeight = containerRef.current.clientHeight;
      containerRef.current.scrollTo({
        top: cardIndex * cardHeight,
        behavior: "smooth",
      });
    }
  }, []);

  const onPrev = useCallback(() => {
    const newIndex = Math.max(0, index - 1);
    setIndex(newIndex);
    scrollToCard(newIndex);
  }, [index, scrollToCard]);

  const onNext = useCallback(() => {
    if (!interacted) {
      setInteracted(true);
    }
    const newIndex = Math.min(cards.length - 1, index + 1);
    setIndex(newIndex);
    scrollToCard(newIndex);
    
    // Progressively load next cards (load 2 cards ahead)
    if (newIndex + 2 > loadedCards) {
      setLoadedCards(Math.min(cards.length, newIndex + 2));
    }
  }, [interacted, index, cards.length, scrollToCard, loadedCards]);

  const onFirst = useCallback(() => {
    setIndex(0);
    scrollToCard(0);
  }, [scrollToCard]);

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!interacted) return;
      
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        onPrev();
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        onNext();
      } else if (event.key === "Home") {
        onFirst();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNext, onPrev, onFirst, interacted]);

  // Handle scroll events to update current card
  useEffect(() => {
    const handleScroll = () => {
      if (!interacted || !containerRef.current) return;
      
      const scrollTop = containerRef.current.scrollTop;
      const cardHeight = containerRef.current.clientHeight;
      const newCardIndex = Math.round(scrollTop / cardHeight);
      if (
        newCardIndex !== index &&
        newCardIndex >= 0 &&
        newCardIndex < cards.length
      ) {
        setIndex(newCardIndex);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [index, cards.length, interacted]);

  if (loading || cards.length === 0) {
    return (
      <div className="w-full h-screen bg-slate-900 flex items-center justify-center">
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
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {isNavigating && <LoadingScreen />}
      <div className={`w-full h-screen relative overflow-hidden transition-opacity duration-500 ${pageReady ? 'opacity-100' : 'opacity-0'}`}>
        {/* Pink Logo Circle Return Button */}
        <button
          onClick={handleReturn}
          className="fixed top-6 left-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 hover:from-fuchsia-600 hover:to-fuchsia-700 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
          aria-label="Return to Discover"
        >
          <div className="text-xl font-bold text-white group-hover:scale-110 transition-transform">
            OI
          </div>
        </button>
        
        <UserScoreModal
          isOpen={isUserScoreOpen}
          onClose={() => setIsUserScoreOpen(false)}
          source="tier_pill"
        />
        
        <MemoryWalletModal
          isOpen={isWalletOpen}
          onClose={() => setIsWalletOpen(false)}
        />
        
        <div
        ref={containerRef}
        className={`scroll-container w-full h-full snap-y snap-mandatory scrollbar-hide ${
          interacted ? "overflow-y-auto" : "overflow-y-hidden"
        }`}
        style={{
          WebkitOverflowScrolling: interacted ? 'touch' : 'auto',
          overscrollBehavior: 'none',
          touchAction: interacted ? 'pan-y' : 'none',
        }}
        onTouchMove={interacted ? undefined : (e) => e.preventDefault()}
        onWheel={interacted ? undefined : (e) => e.preventDefault()}
      >
        {cards.slice(0, loadedCards).map((card, cardIndex) => (
          <div key={cardIndex} className="snap-start w-full">
            <LazyClientCardWrapper 
              componentProps={{ data: card, active: cardIndex === index }}
            />
          </div>
        ))}
        {loadedCards < cards.length && (
          <div className="snap-start w-full h-screen flex items-center justify-center bg-black">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
      
        <Footer
          index={index}
          currentCard={cards[index]}
          totalCards={cards.length}
          interacted={interacted}
          onFirst={onFirst}
          onNext={onNext}
        />
      </div>
    </>
  );
}
