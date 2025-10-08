"use client";

import { useState } from 'react';
import { EventNavigation } from '@/components/event/EventNavigation';
import { EventHomeDemo } from '@/components/event/EventHomeDemo';
import { EventLaneDemo } from '@/components/event/EventLaneDemo';
import { GlobalHUDDemo } from '@/components/event/GlobalHUDDemo';
import {
  sampleNowNext,
  sampleEventConfig,
  infoLaneCards,
  interactLaneCards,
  rewardsLaneCards,
  allSampleCards,
  samplePointsProgress
} from '@/data/eventSampleData';
import type { CardLane, QuickAction, PointsProgress } from '@/types/event';

export default function EventDemoPage() {
  const [currentView, setCurrentView] = useState<'home' | CardLane>('home');
  const [points, setPoints] = useState(samplePointsProgress);
  const [newMemories, setNewMemories] = useState(0);
  const [walletCount, setWalletCount] = useState(12);

  // Get featured cards (first 3 for demo)
  const featuredCards = allSampleCards.filter(card =>
    ['ar-scene-1', 'qr-scan-1', 'merch-1'].includes(card.id)
  );

  const handleViewChange = (view: 'home' | CardLane) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickAction = (action: QuickAction) => {
    console.log('Quick action:', action);

    // Demo actions
    switch (action) {
      case 'scan':
        alert('📱 QR Scanner opened (demo)');
        // Award points for scanning
        awardPoints(20, 'QR Scan');
        break;
      case 'map':
        setCurrentView('info');
        break;
      case 'schedule':
        setCurrentView('info');
        break;
      case 'offers':
        setCurrentView('rewards');
        break;
      case 'wallet':
        alert(`💎 Wallet: ${walletCount} memories collected!`);
        setNewMemories(0); // Reset pulse
        break;
    }
  };

  const handleCardAction = (cardId: string, action: string) => {
    console.log('Card action:', cardId, action);

    const card = allSampleCards.find(c => c.id === cardId);
    if (!card) return;

    // Demo actions based on card type
    switch (card.type) {
      case 'ar':
        alert('🎭 AR Experience launched! (demo)\nCapture your moment and save to wallet.');
        if (card.award?.trigger === 'onComplete') {
          awardPoints(card.award.points || 50, 'AR Completion');
          addMemory();
        }
        break;

      case 'qr':
        alert('📷 QR Scanner ready! (demo)\nScan venue stamps to collect points.');
        if (card.award?.points) {
          awardPoints(card.award.points, 'QR Scan');
        }
        break;

      case 'wearables':
        alert('⌚ LED Wristband paired! (demo)\nYour wearable is now synced.');
        if (card.award?.points) {
          awardPoints(card.award.points, 'Wearable Paired');
        }
        break;

      case 'ai':
        alert('🤖 AI Video Creator opened! (demo)\nCreate and share your AI-enhanced moments.');
        break;

      case 'merch':
        alert('🛍️ Merch Store opened! (demo)\nBrowse tour exclusives with your tier discount.');
        break;

      case 'food-beverage':
        alert('🍕 F&B Order placed! (demo)\nPick up at Food Court - Counter 3 in 10 mins.');
        if (card.award?.trigger === 'onOrderComplete') {
          awardPoints(card.award.points || 10, 'F&B Order');
        }
        break;

      default:
        alert(`${card.title} activated! (demo)`);
    }
  };

  const awardPoints = (amount: number, reason: string) => {
    const newTotal = points.current + amount;
    const updatedPoints: PointsProgress = {
      ...points,
      current: newTotal
    };

    // Check if tier changed
    if (newTotal >= 500 && points.tier === 'Silver') {
      updatedPoints.tier = 'Gold';
      updatedPoints.nextTier = undefined;
      alert(`🎉 Tier Up! You're now GOLD tier!`);
    } else if (points.nextTier) {
      updatedPoints.nextTier = {
        ...points.nextTier,
        remaining: points.nextTier.threshold - newTotal
      };
    }

    setPoints(updatedPoints);
    console.log(`✨ +${amount} points for ${reason}`);
  };

  const addMemory = () => {
    setWalletCount(prev => prev + 1);
    setNewMemories(prev => prev + 1);
  };

  const handleEnterLane = (lane: 'info' | 'interact' | 'rewards') => {
    setCurrentView(lane);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <EventNavigation
        currentView={currentView}
        onViewChange={handleViewChange}
        onQuickAction={handleQuickAction}
        walletCount={walletCount}
        tier={points.tier}
        quickActions={sampleEventConfig.quickActions}
      />

      {/* Global HUD */}
      <GlobalHUDDemo
        pointsProgress={points}
        newMemoryCount={newMemories}
        demoMode={true}
      />

      {/* Content */}
      {currentView === 'home' && (
        <EventHomeDemo
          nowNext={sampleNowNext}
          featuredCards={featuredCards}
          safetyBanner={sampleEventConfig.safetyBanner}
          onEnterLane={handleEnterLane}
          onCardAction={handleCardAction}
        />
      )}

      {currentView === 'info' && (
        <EventLaneDemo
          lane="info"
          cards={infoLaneCards}
          onCardAction={handleCardAction}
          onAwardPoints={awardPoints}
        />
      )}

      {currentView === 'interact' && (
        <EventLaneDemo
          lane="interact"
          cards={interactLaneCards}
          onCardAction={handleCardAction}
          onAwardPoints={awardPoints}
        />
      )}

      {currentView === 'rewards' && (
        <EventLaneDemo
          lane="rewards"
          cards={rewardsLaneCards}
          onCardAction={handleCardAction}
          onAwardPoints={awardPoints}
        />
      )}
    </div>
  );
}
