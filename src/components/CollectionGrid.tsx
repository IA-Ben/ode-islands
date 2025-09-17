"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Type definitions matching our database schema
interface CollectibleDefinition {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  type: 'story_card' | 'chapter_stamp' | 'show_activation';
  shape: 'rectangle' | 'circle' | 'hexagon';
  gridPosition: number; // 1-12
  gridRow: number; // 1-4
  gridColumn: number; // 1-3
  imageUrl?: string;
  thumbnailUrl?: string;
  silhouetteUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  unlockTrigger: string;
  unlockConditions?: any;
  triggerSourceId?: string;
  isBonus: boolean;
  bonusType?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  fullContentUrl?: string;
  contentType?: string;
  caption?: string;
}

interface UserCollectible {
  id: string;
  userId: string;
  collectibleId: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  unlockContext?: any;
  animationViewed: boolean;
  lastViewedAt?: string;
  viewCount: number;
  isFavorite: boolean;
  userNotes?: string;
}

interface CollectibleProgress {
  id: string;
  userId: string;
  eventId: string;
  totalCollectibles: number;
  unlockedCount: number;
  completionPercentage: number;
  hasCompletedGrid: boolean;
  completionCelebrationViewed: boolean;
  completedAt?: string;
  firstUnlockAt?: string;
  lastUnlockAt?: string;
}

interface CollectionGridProps {
  eventId: string;
  className?: string;
}

// Placeholder data for development and fallback
const createPlaceholderCollectibles = (eventId: string): CollectibleDefinition[] => [
  // Row 1
  { id: '1', eventId, name: 'Opening Story', description: 'The beginning of your journey', type: 'story_card', shape: 'rectangle', gridPosition: 1, gridRow: 1, gridColumn: 1, primaryColor: '#3B82F6', accentColor: '#1E40AF', unlockTrigger: 'chapter_complete', isBonus: false, rarity: 'common' },
  { id: '2', eventId, name: 'Chapter 1', description: 'First milestone reached', type: 'chapter_stamp', shape: 'circle', gridPosition: 2, gridRow: 1, gridColumn: 2, primaryColor: '#10B981', accentColor: '#047857', unlockTrigger: 'chapter_complete', isBonus: false, rarity: 'common' },
  { id: '3', eventId, name: 'Live Moment', description: 'Real-time activation', type: 'show_activation', shape: 'hexagon', gridPosition: 3, gridRow: 1, gridColumn: 3, primaryColor: '#F59E0B', accentColor: '#D97706', unlockTrigger: 'event_attend', isBonus: true, rarity: 'rare' },
  // Row 2  
  { id: '4', eventId, name: 'Memory Card', description: 'A treasured moment', type: 'story_card', shape: 'rectangle', gridPosition: 4, gridRow: 2, gridColumn: 1, primaryColor: '#8B5CF6', accentColor: '#7C3AED', unlockTrigger: 'card_view', isBonus: false, rarity: 'common' },
  { id: '5', eventId, name: 'Chapter 2', description: 'Second achievement', type: 'chapter_stamp', shape: 'circle', gridPosition: 5, gridRow: 2, gridColumn: 2, primaryColor: '#EF4444', accentColor: '#DC2626', unlockTrigger: 'chapter_complete', isBonus: false, rarity: 'common' },
  { id: '6', eventId, name: 'Epic Activation', description: 'Legendary moment', type: 'show_activation', shape: 'hexagon', gridPosition: 6, gridRow: 2, gridColumn: 3, primaryColor: '#EC4899', accentColor: '#DB2777', unlockTrigger: 'poll_answer', isBonus: true, rarity: 'epic' },
  // Row 3
  { id: '7', eventId, name: 'Journey Tale', description: 'Your story unfolds', type: 'story_card', shape: 'rectangle', gridPosition: 7, gridRow: 3, gridColumn: 1, primaryColor: '#06B6D4', accentColor: '#0891B2', unlockTrigger: 'card_view', isBonus: false, rarity: 'common' },
  { id: '8', eventId, name: 'Chapter 3', description: 'Third milestone', type: 'chapter_stamp', shape: 'circle', gridPosition: 8, gridRow: 3, gridColumn: 2, primaryColor: '#84CC16', accentColor: '#65A30D', unlockTrigger: 'chapter_complete', isBonus: false, rarity: 'common' },
  { id: '9', eventId, name: 'Special Event', description: 'Unique experience', type: 'show_activation', shape: 'hexagon', gridPosition: 9, gridRow: 3, gridColumn: 3, primaryColor: '#F97316', accentColor: '#EA580C', unlockTrigger: 'event_attend', isBonus: false, rarity: 'rare' },
  // Row 4
  { id: '10', eventId, name: 'Final Story', description: 'The conclusion', type: 'story_card', shape: 'rectangle', gridPosition: 10, gridRow: 4, gridColumn: 1, primaryColor: '#6366F1', accentColor: '#4F46E5', unlockTrigger: 'card_view', isBonus: false, rarity: 'common' },
  { id: '11', eventId, name: 'Completion', description: 'Journey complete', type: 'chapter_stamp', shape: 'circle', gridPosition: 11, gridRow: 4, gridColumn: 2, primaryColor: '#14B8A6', accentColor: '#0D9488', unlockTrigger: 'chapter_complete', isBonus: true, rarity: 'legendary' },
  { id: '12', eventId, name: 'Master Key', description: 'Ultimate unlock', type: 'show_activation', shape: 'hexagon', gridPosition: 12, gridRow: 4, gridColumn: 3, primaryColor: '#A855F7', accentColor: '#9333EA', unlockTrigger: 'manual', isBonus: true, rarity: 'legendary' },
];

const createPlaceholderUserCollectibles = (): UserCollectible[] => [
  // Mix of unlocked and locked for demonstration
  { id: 'u1', userId: 'demo', collectibleId: '1', isUnlocked: true, animationViewed: true, viewCount: 3, isFavorite: false },
  { id: 'u2', userId: 'demo', collectibleId: '2', isUnlocked: true, animationViewed: true, viewCount: 2, isFavorite: true },
  { id: 'u3', userId: 'demo', collectibleId: '3', isUnlocked: true, animationViewed: false, viewCount: 1, isFavorite: false },
  { id: 'u4', userId: 'demo', collectibleId: '4', isUnlocked: true, animationViewed: true, viewCount: 1, isFavorite: false },
  { id: 'u5', userId: 'demo', collectibleId: '5', isUnlocked: true, animationViewed: true, viewCount: 2, isFavorite: true },
  { id: 'u6', userId: 'demo', collectibleId: '6', isUnlocked: false, animationViewed: false, viewCount: 0, isFavorite: false },
  { id: 'u7', userId: 'demo', collectibleId: '7', isUnlocked: true, animationViewed: true, viewCount: 1, isFavorite: false },
  // 8-12 remain locked for demo purposes
];

const createPlaceholderProgress = (eventId: string): CollectibleProgress => ({
  id: 'progress1',
  userId: 'demo',
  eventId,
  totalCollectibles: 12,
  unlockedCount: 7,
  completionPercentage: 58, // 7/12 * 100
  hasCompletedGrid: false,
  completionCelebrationViewed: false,
  firstUnlockAt: '2024-01-01T10:00:00Z',
  lastUnlockAt: '2024-01-07T15:30:00Z'
});

export default function CollectionGrid({ eventId, className = "" }: CollectionGridProps) {
  const [collectibles, setCollectibles] = useState<CollectibleDefinition[]>(createPlaceholderCollectibles(eventId));
  const [userCollectibles, setUserCollectibles] = useState<UserCollectible[]>(createPlaceholderUserCollectibles());
  const [progress, setProgress] = useState<CollectibleProgress | null>(createPlaceholderProgress(eventId));
  const [loading, setLoading] = useState(false); // Start with false to show grid immediately
  const [error, setError] = useState<string | null>(null);
  const [selectedCollectible, setSelectedCollectible] = useState<CollectibleDefinition | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'timeline' | 'shows'>('all');
  const [animatingCollectibles, setAnimatingCollectibles] = useState<Set<string>>(new Set());
  const [sparkles, setSparkles] = useState<Array<{id: string, collectibleId: string, x: number, y: number}>>([]);
  
  // Track previously unlocked collectibles to prevent animation spam
  const previouslyUnlocked = useRef<Set<string>>(new Set());
  const hasInitiallyLoaded = useRef(false);

  useEffect(() => {
    fetchCollectionData();
  }, [eventId]);

  const fetchCollectionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Attempt to fetch real data, fall back to placeholders on error
      const [collectiblesRes, userCollectiblesRes, progressRes] = await Promise.all([
        fetch(`/api/collectibles/definitions?eventId=${eventId}`).catch(() => null),
        fetch(`/api/collectibles/user?eventId=${eventId}`).catch(() => null),
        fetch(`/api/collectibles/progress?eventId=${eventId}`).catch(() => null)
      ]);

      let hasRealData = false;

      // Try to parse real API responses
      if (collectiblesRes && collectiblesRes.ok) {
        try {
          const collectiblesData = await collectiblesRes.json();
          if (collectiblesData.success) {
            setCollectibles(collectiblesData.collectibles || createPlaceholderCollectibles(eventId));
            hasRealData = true;
          }
        } catch (e) {
          console.log('Using placeholder collectibles data');
        }
      }

      if (userCollectiblesRes && userCollectiblesRes.ok) {
        try {
          const userCollectiblesData = await userCollectiblesRes.json();
          if (userCollectiblesData.success) {
            setUserCollectibles(userCollectiblesData.userCollectibles || createPlaceholderUserCollectibles());
            hasRealData = true;
          }
        } catch (e) {
          console.log('Using placeholder user collectibles data');
        }
      }

      if (progressRes && progressRes.ok) {
        try {
          const progressData = await progressRes.json();
          if (progressData.success) {
            setProgress(progressData.progress || createPlaceholderProgress(eventId));
            hasRealData = true;
          }
        } catch (e) {
          console.log('Using placeholder progress data');
        }
      }

      // If no real data was loaded, ensure placeholders are set
      if (!hasRealData) {
        console.log('API endpoints not available, using demo placeholder data');
        setCollectibles(createPlaceholderCollectibles(eventId));
        setUserCollectibles(createPlaceholderUserCollectibles()); 
        setProgress(createPlaceholderProgress(eventId));
      }

    } catch (err) {
      console.log('Collection data fetch failed, using placeholders:', err);
      // Ensure placeholders are loaded even on complete failure
      setCollectibles(createPlaceholderCollectibles(eventId));
      setUserCollectibles(createPlaceholderUserCollectibles()); 
      setProgress(createPlaceholderProgress(eventId));
    } finally {
      setLoading(false);
    }
  };

  const isCollectibleUnlocked = (collectibleId: string): boolean => {
    const userCollectible = userCollectibles.find(uc => uc.collectibleId === collectibleId);
    return userCollectible?.isUnlocked || false;
  };

  // Track unlock animations when collectible state changes
  useEffect(() => {
    // Skip animations on initial load to prevent animation spam
    if (!hasInitiallyLoaded.current) {
      hasInitiallyLoaded.current = true;
      // Initialize previously unlocked set with current state
      const currentUnlocked = new Set(
        collectibles.filter(c => isCollectibleUnlocked(c.id)).map(c => c.id)
      );
      previouslyUnlocked.current = currentUnlocked;
      return;
    }

    // Get currently unlocked collectibles
    const currentUnlocked = new Set(
      collectibles.filter(c => isCollectibleUnlocked(c.id)).map(c => c.id)
    );
    
    // Find newly unlocked collectibles (current - previous)
    const newlyUnlocked = [...currentUnlocked].filter(id => 
      !previouslyUnlocked.current.has(id)
    );
    
    // Trigger animations only for newly unlocked collectibles
    newlyUnlocked.forEach(collectibleId => {
      const collectible = collectibles.find(c => c.id === collectibleId);
      if (collectible) {
        triggerUnlockAnimation(collectibleId, collectible);
      }
    });
    
    // Update previously unlocked state
    previouslyUnlocked.current = currentUnlocked;
  }, [userCollectibles, collectibles]);

  const triggerUnlockAnimation = (collectibleId: string, collectible: CollectibleDefinition) => {
    // Add to animating set
    setAnimatingCollectibles(prev => new Set(prev).add(collectibleId));
    
    // Create sparkle particles
    const newSparkles = Array.from({ length: 8 }, (_, i) => ({
      id: `sparkle-${collectibleId}-${i}-${Date.now()}`,
      collectibleId,
      x: (Math.random() - 0.5) * 100,
      y: (Math.random() - 0.5) * 100,
    }));
    
    setSparkles(prev => [...prev, ...newSparkles]);
    
    // Remove animation state after animation completes
    setTimeout(() => {
      setAnimatingCollectibles(prev => {
        const newSet = new Set(prev);
        newSet.delete(collectibleId);
        return newSet;
      });
      
      // Remove sparkles
      setSparkles(prev => prev.filter(s => s.collectibleId !== collectibleId));
    }, 1000); // Animation duration matches CSS
  };

  const getShapeClasses = (shape: string, isUnlocked: boolean, collectibleId?: string): string => {
    const baseClasses = "relative flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer";
    const lockedClasses = "bg-white/5 border-2 border-dashed border-white/20";
    const unlockedClasses = "bg-gradient-to-br shadow-lg";
    
    const shapeSpecific = {
      rectangle: "aspect-[4/3] rounded-xl",
      circle: "aspect-square rounded-full",
      hexagon: "aspect-square" // Will use custom clip-path for hexagon
    };

    const stateClasses = isUnlocked ? unlockedClasses : lockedClasses;
    
    // Add combined animation class if this collectible is currently animating
    const isAnimating = collectibleId && animatingCollectibles.has(collectibleId);
    const animationClasses = isAnimating ? "mw-unlock-anim" : "";
    
    return `${baseClasses} ${shapeSpecific[shape as keyof typeof shapeSpecific]} ${stateClasses} ${animationClasses}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'story_card':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'chapter_stamp':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
      case 'show_activation':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderCollectibleSlot = (collectible: CollectibleDefinition) => {
    const isUnlocked = isCollectibleUnlocked(collectible.id);
    const userCollectible = userCollectibles.find(uc => uc.collectibleId === collectible.id);
    const collectibleSparkles = sparkles.filter(s => s.collectibleId === collectible.id);
    
    return (
      <div
        key={collectible.id}
        className={getShapeClasses(collectible.shape, isUnlocked, collectible.id)}
        style={{
          clipPath: collectible.shape === 'hexagon' ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : undefined,
          background: isUnlocked && collectible.primaryColor 
            ? `linear-gradient(135deg, ${collectible.primaryColor}, ${collectible.accentColor || collectible.primaryColor})`
            : undefined
        }}
        onClick={() => isUnlocked && setSelectedCollectible(collectible)}
      >
        {/* Sparkle Particles */}
        {collectibleSparkles.map(sparkle => (
          <div
            key={sparkle.id}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              '--dx': `${sparkle.x}px`,
              '--dy': `${sparkle.y}px`,
              animation: 'sparkleParticle 1s ease-out forwards',
            } as React.CSSProperties}
          />
        ))}
        {isUnlocked ? (
          <div className="flex flex-col items-center justify-center p-2 text-white">
            {collectible.thumbnailUrl ? (
              <img 
                src={collectible.thumbnailUrl} 
                alt={collectible.name}
                className="w-8 h-8 rounded object-cover mb-1"
              />
            ) : (
              getTypeIcon(collectible.type)
            )}
            <span className="text-xs font-medium text-center truncate w-full">
              {collectible.name}
            </span>
            {collectible.isBonus && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                <svg className="w-2 h-2 text-yellow-900" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            )}
            {userCollectible?.isFavorite && (
              <div className="absolute top-1 left-1 text-red-400">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-white/30">
            {getTypeIcon(collectible.type)}
            <div className="text-xs mt-1 opacity-50">Locked</div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/10 rounded w-1/3"></div>
          <div className="h-4 bg-white/10 rounded w-1/2"></div>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square bg-white/10 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-red-400">
          <p className="text-lg font-medium mb-2">Failed to Load Collection</p>
          <p className="text-sm text-white/60 mb-4">{error}</p>
          <Button onClick={fetchCollectionData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Memory Wallet
              </CardTitle>
              <p className="text-white/60 mt-1">Collect memories from your journey</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/60">Collected</div>
              <div className="text-lg font-semibold text-white">
                {progress?.unlockedCount || 0} / {progress?.totalCollectibles || 12} Memories
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/10 rounded-full h-3 mt-4">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ 
                width: `${progress?.completionPercentage || 0}%` 
              }}
            >
              {(progress?.completionPercentage || 0) > 15 && (
                <span className="text-xs text-white font-medium">
                  {progress?.completionPercentage || 0}%
                </span>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 mt-6 bg-white/5 rounded-lg p-1">
            {[
              { id: 'all', label: 'All Memories', icon: '🗂️' },
              { id: 'timeline', label: 'Timeline', icon: '📅' },
              { id: 'shows', label: 'My Shows', icon: '🎭' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'all' | 'timeline' | 'shows')}
                className={`flex-1 px-4 py-2 rounded-md transition-all text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Collection Grid */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            {Array.from({ length: 12 }, (_, index) => {
              const position = index + 1;
              const collectible = collectibles.find(c => c.gridPosition === position);
              
              if (collectible) {
                return renderCollectibleSlot(collectible);
              }
              
              // Empty slot
              return (
                <div 
                  key={`empty-${position}`}
                  className="aspect-square bg-white/5 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center"
                >
                  <div className="text-white/20 text-xs">
                    Slot {position}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completion Celebration */}
          {progress?.hasCompletedGrid && (
            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
              <div className="text-center">
                <div className="text-2xl mb-2">🎉</div>
                <div className="text-lg font-semibold text-white mb-1">Collection Complete!</div>
                <div className="text-sm text-white/80">You've collected all memories from this event</div>
                <Button className="mt-3" variant="outline">
                  Export Passport
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal Placeholder */}
      {selectedCollectible && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-white/10 backdrop-blur-lg border border-white/20 max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {selectedCollectible.name}
                <button 
                  onClick={() => setSelectedCollectible(null)}
                  className="text-white/60 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-white/80">
                {selectedCollectible.description}
              </div>
              {selectedCollectible.fullContentUrl && (
                <img 
                  src={selectedCollectible.fullContentUrl} 
                  alt={selectedCollectible.name}
                  className="w-full rounded-lg mt-4"
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}