"use client";

import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import type { PointsProgress } from '@/types/event';

interface GlobalHUDDemoProps {
  pointsProgress: PointsProgress;
  newMemoryCount?: number;
  demoMode?: boolean;
}

export function GlobalHUDDemo({
  pointsProgress,
  newMemoryCount = 0,
  demoMode = false
}: GlobalHUDDemoProps) {
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [showWalletPulse, setShowWalletPulse] = useState(false);

  // Trigger animations when values change
  useEffect(() => {
    if (pointsProgress.current > 0) {
      setShowPointsAnimation(true);
      setTimeout(() => setShowPointsAnimation(false), 2000);
    }
  }, [pointsProgress.current]);

  useEffect(() => {
    if (newMemoryCount > 0) {
      setShowWalletPulse(true);
      setTimeout(() => setShowWalletPulse(false), 3000);
    }
  }, [newMemoryCount]);

  const progressPercentage = pointsProgress.nextTier
    ? ((pointsProgress.current - (pointsProgress.nextTier.threshold - pointsProgress.nextTier.remaining)) /
       pointsProgress.nextTier.remaining) * 100
    : 100;

  return (
    <div className="fixed top-20 right-4 z-40 space-y-3">
      {/* Demo Mode Toggle */}
      {demoMode && (
        <div className="bg-amber-500 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg">
          🎮 DEMO MODE
        </div>
      )}

      {/* Wallet Pulse Notification */}
      {newMemoryCount > 0 && (
        <div
          className={`bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white px-4 py-3 rounded-2xl shadow-2xl transform transition-all duration-500 ${
            showWalletPulse
              ? 'translate-x-0 opacity-100'
              : 'translate-x-full opacity-0'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Sparkles className="w-5 h-5 animate-spin" />
              <div className="absolute inset-0 bg-white/50 rounded-full animate-ping"></div>
            </div>
            <div>
              <p className="text-sm font-bold">New Memory!</p>
              <p className="text-xs text-white/80">Check your wallet</p>
            </div>
          </div>
        </div>
      )}

      {/* Points Progress Ring */}
      <div
        className={`bg-slate-900/95 backdrop-blur-lg border border-white/10 rounded-2xl p-4 shadow-2xl transition-all duration-500 ${
          showPointsAnimation ? 'scale-110' : 'scale-100'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Progress Ring */}
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="32"
                cy="32"
                r="28"
                className="stroke-slate-700"
                strokeWidth="4"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="32"
                cy="32"
                r="28"
                className="stroke-fuchsia-500 transition-all duration-1000"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercentage / 100)}`}
              />
            </svg>

            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-600 to-purple-600 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Points animation */}
            {showPointsAnimation && (
              <div className="absolute -top-2 -right-2 text-green-400 text-sm font-bold animate-bounce">
                +50
              </div>
            )}
          </div>

          {/* Points Info */}
          <div>
            <div className="text-2xl font-bold text-white">
              {pointsProgress.current}
            </div>
            <div className="text-xs text-white/60">
              {pointsProgress.tier} Tier
            </div>
            {pointsProgress.nextTier && (
              <div className="text-xs text-fuchsia-400 font-medium">
                {pointsProgress.nextTier.remaining} to {pointsProgress.nextTier.name}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {pointsProgress.nextTier && (
          <div className="mt-3">
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-fuchsia-600 to-purple-600 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
