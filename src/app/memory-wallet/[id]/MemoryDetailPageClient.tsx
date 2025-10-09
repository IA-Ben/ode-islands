"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import UnifiedTopNav from '@/components/UnifiedTopNav';
import { useFanScore } from '@/hooks/useFanScore';
import { 
  getMemory, 
  shareMemory, 
  formatCollectedDate, 
  getRarityColor,
  getRarityTextColor,
  getTypeIcon 
} from '@/lib/walletCms';
import type { MemoryDetail } from '@/types/memory';

interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  permissions?: string[];
}

interface MemoryDetailPageClientProps {
  user: UserData | null;
}

export default function MemoryDetailPageClient({ user }: MemoryDetailPageClientProps) {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { scoreData } = useFanScore();
  const [memory, setMemory] = useState<MemoryDetail | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'shared' | 'copied'>('idle');

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
    console.log('QR scanner opened');
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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && params.id) {
      fetchMemoryDetail();
    }
  }, [isAuthenticated, params.id]);

  const fetchMemoryDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getMemory(params.id as string);
      if (result) {
        setMemory(result.memory);
        setIsLocked(result.isLocked);
      } else {
        setError('Failed to load memory details');
      }
    } catch (err) {
      console.error('Error fetching memory:', err);
      setError('Failed to load memory details');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!memory) return;
    
    setShareStatus('sharing');
    const success = await shareMemory(memory);
    const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    setShareStatus(success ? (hasNativeShare ? 'shared' : 'copied') : 'idle');
    
    // Reset status after 3 seconds
    if (success) {
      setTimeout(() => setShareStatus('idle'), 3000);
    }
  };

  const handleARReplay = () => {
    if (memory?.arItemId) {
      // Navigate to AR viewer with the AR item ID
      router.push(`/before/ar?itemId=${memory.arItemId}`);
    }
  };

  if (authLoading || loading) {
    return (
      <>
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
          onSwitchMode={handleSwitchMode}
        />
        <div className="min-h-screen bg-slate-900 pt-20 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Loading Skeleton */}
            <div className="animate-pulse">
              <div className="h-8 w-24 bg-gray-800 rounded mb-6"></div>
              <div className="aspect-video bg-gray-800 rounded-lg mb-6"></div>
              <div className="h-10 bg-gray-800 rounded w-2/3 mb-4"></div>
              <div className="h-20 bg-gray-800 rounded mb-4"></div>
              <div className="flex gap-4">
                <div className="h-12 w-32 bg-gray-800 rounded"></div>
                <div className="h-12 w-32 bg-gray-800 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
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
          onSwitchMode={handleSwitchMode}
        />
        <div className="min-h-screen bg-slate-900 pt-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Button 
              onClick={() => router.push('/memory-wallet')}
              className="bg-white text-black hover:bg-gray-200"
            >
              Back to Wallet
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (!memory) {
    return (
      <>
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
          onSwitchMode={handleSwitchMode}
        />
        <div className="min-h-screen bg-slate-900 pt-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-white/60 mb-4">Memory not found</p>
            <Button 
              onClick={() => router.push('/memory-wallet')}
              className="bg-white text-black hover:bg-gray-200"
            >
              Back to Wallet
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
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
        onSwitchMode={handleSwitchMode}
      />
      <div className="min-h-screen bg-slate-900 pt-20 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/memory-wallet')}
            className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Wallet
          </button>

          {isLocked ? (
            // Locked View
            <div className="text-center">
              <div className="relative w-48 h-48 mx-auto mb-8">
                <div className="absolute inset-0 bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-24 h-24 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-4">{memory.title}</h1>
              
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="text-2xl">{getTypeIcon(memory.type)}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRarityColor(memory.rarity)}`}>
                  {memory.rarity}
                </span>
                <span className="text-yellow-500 flex items-center gap-1">
                  <span className="text-lg">⭐</span>
                  {memory.points} pts
                </span>
              </div>

              {memory.chapterTitle && (
                <p className="text-white/60 mb-2">
                  {memory.chapterTitle}
                  {memory.subChapterTitle && ` • ${memory.subChapterTitle}`}
                </p>
              )}

              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mt-8 mb-6">
                <h2 className="text-xl font-semibold text-white mb-3">How to Unlock</h2>
                <p className="text-white/80">
                  {memory.unlockRule || 'Complete the required action to unlock this memory.'}
                </p>
                {memory.source && (
                  <p className="text-white/60 mt-3">Source: {memory.source}</p>
                )}
              </div>

              <Button
                onClick={() => router.push('/memory-wallet')}
                className="bg-white text-black hover:bg-gray-200 px-8 py-3"
              >
                Back to Collection
              </Button>
            </div>
          ) : (
            // Owned View
            <div>
              {/* Hero Image/Video */}
              {memory.heroUrl && (
                <div className="relative aspect-video mb-6 rounded-lg overflow-hidden bg-gray-900">
                  {memory.mediaType === 'video' ? (
                    <video
                      src={memory.heroUrl}
                      controls
                      className="w-full h-full object-cover"
                      poster={memory.thumbnail}
                    />
                  ) : (
                    <Image
                      src={memory.heroUrl}
                      alt={memory.alt || memory.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 1024px"
                      priority
                    />
                  )}
                </div>
              )}

              {/* Title and Metadata */}
              <div className="mb-6">
                <h1 className="text-4xl font-bold text-white mb-4">{memory.title}</h1>
                
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getTypeIcon(memory.type)}</span>
                    <span className="text-white/60">{memory.type}</span>
                  </div>
                  
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRarityColor(memory.rarity)}`}>
                    {memory.rarity}
                  </span>
                  
                  <span className="text-yellow-500 flex items-center gap-1">
                    <span className="text-lg">⭐</span>
                    {memory.points} points
                  </span>
                </div>

                {memory.chapterTitle && (
                  <p className="text-white/60">
                    {memory.chapterTitle}
                    {memory.subChapterTitle && ` • ${memory.subChapterTitle}`}
                  </p>
                )}

                {memory.collectedAt && (
                  <p className="text-green-500 text-sm mt-2">
                    ✓ Collected on {formatCollectedDate(memory.collectedAt)}
                  </p>
                )}
              </div>

              {/* Description */}
              {memory.description && (
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
                  <h2 className="text-xl font-semibold text-white mb-3">Description</h2>
                  <p className="text-white/80 whitespace-pre-wrap">{memory.description}</p>
                </div>
              )}

              {/* Tags */}
              {memory.tags && memory.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {memory.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-800 text-white/80 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* User Notes */}
              {memory.userNotes && (
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Your Notes</h3>
                  <p className="text-white/80 whitespace-pre-wrap">{memory.userNotes}</p>
                </div>
              )}

              {/* Credits and License */}
              {(memory.credits || memory.license) && (
                <div className="text-white/60 text-sm mb-6">
                  {memory.credits && <p>Credits: {memory.credits}</p>}
                  {memory.license && <p>License: {memory.license}</p>}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={handleShare}
                  disabled={shareStatus === 'sharing'}
                  className="bg-white text-black hover:bg-gray-200 px-6 py-3 min-h-[48px]"
                >
                  {shareStatus === 'sharing' ? 'Sharing...' :
                   shareStatus === 'shared' ? '✓ Shared!' :
                   shareStatus === 'copied' ? '✓ Link Copied!' :
                   'Share Memory'}
                </Button>

                {memory.arItemId && (
                  <Button
                    onClick={handleARReplay}
                    className="bg-purple-600 text-white hover:bg-purple-700 px-6 py-3 min-h-[48px]"
                  >
                    🔮 AR Replay
                  </Button>
                )}

                {memory.isFavorite && (
                  <span className="flex items-center gap-2 text-yellow-500 px-4">
                    <span className="text-xl">⭐</span>
                    Favorited
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
