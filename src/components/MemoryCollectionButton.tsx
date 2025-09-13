'use client';

import React, { useState, useEffect } from 'react';
import { useMemoryCollection } from '../hooks/useMemoryCollection';
import type { CardData } from '@/@typings';

interface MemoryCollectionButtonProps {
  cardData: CardData;
  cardId?: string;
  chapterId?: string;
  active: boolean;
  theme?: CardData['theme'];
  className?: string;
}

const MemoryCollectionButton: React.FC<MemoryCollectionButtonProps> = ({
  cardData,
  cardId,
  chapterId,
  active,
  theme,
  className = '',
}) => {
  const { isCollecting, isCollected, collectMemory, checkExistingMemory, error, clearError } = useMemoryCollection();
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasCheckedExisting, setHasCheckedExisting] = useState(false);

  // Check if memory collection is enabled for this card
  const memoryConfig = cardData.memory;
  const isEnabled = memoryConfig?.enabled === true; // Default to disabled unless explicitly enabled
  
  // Critical: Don't render if cardId is missing to prevent bad data
  if (!cardId) {
    console.warn('MemoryCollectionButton: cardId is required but missing. Skipping render to prevent data corruption.');
    return null;
  }

  // Check for existing memory when card becomes active
  useEffect(() => {
    if (active && isEnabled && cardId && !hasCheckedExisting) {
      checkExistingMemory({
        sourceType: 'card',
        sourceId: cardId,
      }).then((alreadyCollected) => {
        setHasCheckedExisting(true);
        // If memory already exists and auto-collect is enabled, show success briefly
        if (alreadyCollected && memoryConfig?.autoCollect) {
          setShowSuccess(true);
          const timer = setTimeout(() => setShowSuccess(false), 3000);
          return () => clearTimeout(timer);
        }
      });
    }
  }, [active, isEnabled, cardId, hasCheckedExisting, checkExistingMemory, memoryConfig?.autoCollect]);

  // Auto-collect if configured to do so (but only after checking existing)
  useEffect(() => {
    if (active && memoryConfig?.autoCollect && !isCollected && isEnabled && hasCheckedExisting) {
      handleCollectMemory();
    }
  }, [active, memoryConfig?.autoCollect, isCollected, isEnabled, hasCheckedExisting]);

  // Show success feedback briefly
  useEffect(() => {
    if (isCollected) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isCollected]);

  const handleCollectMemory = async () => {
    if (!cardData || isCollecting || isCollected) return;

    // Generate memory title from card content
    const memoryTitle = memoryConfig?.title || 
      cardData.text?.title || 
      cardData.text?.subtitle || 
      'Memory from The Ode Islands';

    // Generate memory description
    const memoryDescription = memoryConfig?.description || 
      cardData.text?.description || 
      cardData.text?.subtitle ||
      'A special moment captured from your journey';

    // Determine category based on card content
    let category = memoryConfig?.category;
    if (!category) {
      if (cardData.ar) category = 'AR Experience';
      else if (cardData.playcanvas) category = 'Interactive';
      else if (cardData.video) category = 'Video';
      else if (cardData.image) category = 'Visual';
      else if (cardData.poll) category = 'Poll';
      else if (cardData.quiz) category = 'Quiz';
      else category = 'Story';
    }

    // Collect tags
    const tags = memoryConfig?.tags || [];

    // Build source metadata
    const sourceMetadata = {
      ...memoryConfig?.sourceMetadata,
      cardId,
      chapterId,
      hasAR: !!cardData.ar,
      hasPlayCanvas: !!cardData.playcanvas,
      hasVideo: !!cardData.video,
      hasImage: !!cardData.image,
      hasPoll: !!cardData.poll,
      hasQuiz: !!cardData.quiz,
      theme: theme,
    };

    // Collection context
    const collectionContext = {
      cardTitle: cardData.text?.title,
      cardSubtitle: cardData.text?.subtitle,
      chapter: chapterId,
      collectedAt: new Date().toISOString(),
    };

    await collectMemory({
      sourceType: 'card',
      sourceId: cardId,
      title: memoryTitle,
      description: memoryDescription,
      category,
      tags,
      sourceMetadata,
      collectionContext,
    });
  };

  // Don't render if memory collection is disabled
  if (!isEnabled) return null;

  // Auto-collect cards don't show button but show error if any
  if (memoryConfig?.autoCollect) {
    if (error) {
      return (
        <div className={`flex items-center justify-between h-14 px-4 rounded-full bg-red-500/20 border border-red-500 text-red-200 text-sm ${className}`}
             style={{
               opacity: 0,
               animation: active ? "animButtonIn 0.6s 1.4s ease forwards" : "none",
             }}>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={clearError}
            className="ml-2 p-1 rounded hover:bg-red-500/30 transition-colors"
            aria-label="Dismiss error"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      );
    }
    
    return showSuccess ? (
      <div className={`flex items-center justify-center h-14 px-6 rounded-full bg-green-500 text-white text-base font-semibold ${className}`}>
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Memory Collected!
      </div>
    ) : null;
  }

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Error Message */}
      {error && (
        <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-red-500/20 border border-red-500 text-red-200 text-sm max-w-md"
             style={{
               opacity: 0,
               animation: active ? "animButtonIn 0.6s 1.2s ease forwards" : "none",
             }}>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="ml-2 p-1 rounded hover:bg-red-500/30 transition-colors flex-shrink-0"
            aria-label="Dismiss error"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Memory Collection Button */}
      <button
        onClick={handleCollectMemory}
        disabled={isCollecting || isCollected}
        className={`flex items-center justify-center h-14 px-6 rounded-full cursor-pointer text-base font-semibold transition-all duration-300 ${
          isCollected 
            ? 'bg-green-500 text-white' 
            : theme?.invert
              ? "bg-black hover:bg-black/80 text-white disabled:bg-black/50"
              : "bg-white hover:bg-white/80 text-black disabled:bg-white/50"
        } ${className}`}
        style={{
          backgroundColor: isCollected ? '#10B981' : theme?.cta || undefined,
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          opacity: 0,
          animation: active ? "animButtonIn 0.6s 1.4s ease forwards" : "none",
        }}
        aria-label={isCollected ? 'Memory collected' : isCollecting ? 'Collecting memory...' : 'Collect memory'}
      >
        {isCollecting ? (
          <>
            <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Collecting...
          </>
        ) : isCollected ? (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Collected!
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Collect Memory
        </>
        )}
      </button>
    </div>
  );
};

export default MemoryCollectionButton;