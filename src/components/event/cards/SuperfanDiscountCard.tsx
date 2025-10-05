"use client";

import { Trophy, Star, ChevronRight } from "lucide-react";
import { EventCard } from "./EventCard";

export interface Tier {
  id: string;
  name: string;
  threshold: number;
  benefits: string[];
}

export interface SuperfanDiscountCardProps {
  tiers: Tier[];
  currentTier: string;
  currentPoints: number;
  progressRules?: {
    nextTier?: Tier;
    pointsToNext?: number;
    tasksToNext?: string[];
  };
  title?: string;
  subtitle?: string;
  image?: string;
  size?: "S" | "M" | "L";
  onClick?: () => void;
  analyticsTag?: string;
}

export function SuperfanDiscountCard({
  tiers,
  currentTier,
  currentPoints,
  progressRules,
  title = "Superfan Progress",
  subtitle = "Level Up",
  image,
  size = "M",
  onClick,
  analyticsTag,
}: SuperfanDiscountCardProps) {
  const currentTierData = tiers.find(t => t.id === currentTier);
  const progressPercent = progressRules?.nextTier && progressRules.pointsToNext
    ? Math.min(100, ((currentPoints - (currentTierData?.threshold || 0)) / progressRules.pointsToNext) * 100)
    : 100;

  return (
    <EventCard
      title={title}
      subtitle={subtitle}
      image={image}
      size={size}
      icon={<Trophy className="w-6 h-6" />}
      onClick={onClick}
      analyticsTag={analyticsTag || "superfan-discount-card"}
      theme="amber"
    >
      {currentTierData && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Star className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-300">
                {currentTierData.name}
              </div>
              <div className="text-xs text-slate-400">
                {currentPoints} points
              </div>
            </div>
          </div>
        </div>
      )}

      {progressRules?.nextTier && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Progress to {progressRules.nextTier.name}</span>
            <span className="text-amber-400 font-semibold">
              {Math.round(progressPercent)}%
            </span>
          </div>

          <div className="relative w-full h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {progressRules.pointsToNext && progressRules.pointsToNext > 0 && (
            <div className="text-xs text-slate-400 text-center">
              {progressRules.pointsToNext} points to next tier
            </div>
          )}
        </div>
      )}

      {progressRules?.tasksToNext && progressRules.tasksToNext.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-white">Tasks to unlock next tier:</div>
          {progressRules.tasksToNext.slice(0, 2).map((task, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300"
            >
              <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{task}</span>
            </div>
          ))}
          {progressRules.tasksToNext.length > 2 && (
            <div className="text-xs text-center text-slate-500">
              +{progressRules.tasksToNext.length - 2} more tasks
            </div>
          )}
        </div>
      )}

      {currentTierData && currentTierData.benefits.length > 0 && (
        <div className="pt-2 border-t border-white/10">
          <div className="text-xs font-semibold text-white mb-2">Your Benefits:</div>
          <div className="space-y-1">
            {currentTierData.benefits.slice(0, 2).map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-slate-300">
                <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </EventCard>
  );
}
