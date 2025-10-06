"use client";

import { useState, useEffect } from "react";
import { WalletCards, QrCode, Crown, Award, Sparkles } from "lucide-react";

export type Tier = "Bronze" | "Silver" | "Gold";

export interface GlobalHUDProps {
  newItemsCount?: number;
  currentPoints?: number;
  currentTier?: Tier;
  nextTierThreshold?: number;
  onWalletClick?: () => void;
  onQuickScan?: () => void;
  onPulse?: boolean;
}

interface WalletBadgeProps {
  newItemsCount: number;
  onClick: () => void;
  pulse: boolean;
}

interface PointsRingProps {
  currentPoints: number;
  currentTier: Tier;
  nextTierThreshold: number;
}

interface QuickQRButtonProps {
  onClick: () => void;
}

const tierConfig: Record<Tier, { color: string; glowColor: string; icon: any }> = {
  Bronze: {
    color: "from-amber-600 to-amber-700",
    glowColor: "shadow-amber-500/30",
    icon: Award,
  },
  Silver: {
    color: "from-slate-400 to-slate-500",
    glowColor: "shadow-slate-400/30",
    icon: Crown,
  },
  Gold: {
    color: "from-yellow-500 to-yellow-600",
    glowColor: "shadow-yellow-500/40",
    icon: Sparkles,
  },
};

function WalletBadge({ newItemsCount, onClick, pulse }: WalletBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center justify-center w-14 h-14 rounded-2xl
        bg-white/10 backdrop-blur-md border border-white/20
        hover:bg-white/15 hover:border-white/30 hover:scale-105
        transition-all duration-200
        shadow-lg
        ${pulse ? 'animate-pulse' : ''}
      `}
      aria-label={`Open wallet${newItemsCount > 0 ? ` (${newItemsCount} new items)` : ''}`}
    >
      <WalletCards className="w-6 h-6 text-white" />
      
      {newItemsCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-fuchsia-600 text-white text-xs font-bold shadow-lg shadow-fuchsia-500/50 animate-bounce">
          {newItemsCount > 9 ? '9+' : newItemsCount}
        </span>
      )}
    </button>
  );
}

function PointsRing({ currentPoints, currentTier, nextTierThreshold }: PointsRingProps) {
  const config = tierConfig[currentTier];
  const TierIcon = config.icon;
  const progress = Math.min((currentPoints / nextTierThreshold) * 100, 100);
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative">
      <button
        className={`
          relative flex flex-col items-center justify-center w-20 h-20 rounded-2xl
          bg-white/10 backdrop-blur-md border border-white/20
          hover:bg-white/15 hover:border-white/30 hover:scale-105
          transition-all duration-200
          shadow-lg ${config.glowColor}
        `}
        aria-label={`${currentTier} tier: ${currentPoints} of ${nextTierThreshold} points`}
      >
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 64 64"
        >
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="3"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="url(#tierGradient)"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
          <defs>
            <linearGradient id="tierGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={currentTier === 'Gold' ? '#fbbf24' : currentTier === 'Silver' ? '#cbd5e1' : '#f59e0b'} />
              <stop offset="100%" stopColor={currentTier === 'Gold' ? '#f59e0b' : currentTier === 'Silver' ? '#94a3b8' : '#d97706'} />
            </linearGradient>
          </defs>
        </svg>
        
        <div className="relative z-10 flex flex-col items-center gap-0.5">
          <TierIcon className="w-5 h-5 text-white" />
          <div className="text-xs font-bold text-white leading-none">
            {currentPoints}
          </div>
        </div>
      </button>
    </div>
  );
}

function QuickQRButton({ onClick }: QuickQRButtonProps) {
  return (
    <button
      onClick={onClick}
      className="
        flex items-center justify-center w-16 h-16 rounded-full
        bg-gradient-to-br from-fuchsia-600 to-fuchsia-700
        hover:from-fuchsia-700 hover:to-fuchsia-800
        text-white shadow-2xl shadow-fuchsia-500/40
        hover:shadow-fuchsia-500/60 hover:scale-110
        transition-all duration-200
        active:scale-95
      "
      aria-label="Quick QR Scan"
    >
      <QrCode className="w-8 h-8" />
    </button>
  );
}

export function GlobalHUD({
  newItemsCount = 0,
  currentPoints = 0,
  currentTier = "Bronze",
  nextTierThreshold = 100,
  onWalletClick,
  onQuickScan,
  onPulse = false,
}: GlobalHUDProps) {
  const [shouldPulse, setShouldPulse] = useState(false);

  useEffect(() => {
    if (onPulse) {
      setShouldPulse(true);
      const timer = setTimeout(() => setShouldPulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [onPulse]);

  const handleWalletClick = () => {
    if (onWalletClick) {
      onWalletClick();
    }
  };

  const handleQuickScan = () => {
    if (onQuickScan) {
      onQuickScan();
    }
  };

  return (
    <>
      <div className="fixed top-20 right-4 z-40 flex items-start gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
        <PointsRing
          currentPoints={currentPoints}
          currentTier={currentTier}
          nextTierThreshold={nextTierThreshold}
        />
        
        <WalletBadge
          newItemsCount={newItemsCount}
          onClick={handleWalletClick}
          pulse={shouldPulse || newItemsCount > 0}
        />
      </div>

      <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <QuickQRButton onClick={handleQuickScan} />
      </div>
    </>
  );
}
