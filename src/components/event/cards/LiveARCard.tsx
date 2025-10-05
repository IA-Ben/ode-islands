"use client";

import { Camera, Lock, Sparkles } from "lucide-react";
import { EventCard } from "./EventCard";

export interface LiveARCardProps {
  mode: "markerless" | "marker";
  sceneId: string;
  unlockRule?: {
    type: "always" | "location" | "time" | "purchase";
    isUnlocked: boolean;
    message?: string;
  };
  awardMemory?: {
    templateId: string;
    points: number;
  };
  title?: string;
  subtitle?: string;
  image?: string;
  size?: "S" | "M" | "L";
  onClick?: () => void;
  analyticsTag?: string;
}

export function LiveARCard({
  mode,
  sceneId,
  unlockRule = { type: "always", isUnlocked: true },
  awardMemory,
  title = "AR Experience",
  subtitle = "Augmented Reality",
  image,
  size = "M",
  onClick,
  analyticsTag,
}: LiveARCardProps) {
  const isLocked = !unlockRule.isUnlocked;

  const handleClick = () => {
    if (!isLocked && onClick) {
      onClick();
    }
  };

  return (
    <EventCard
      title={title}
      subtitle={subtitle}
      image={image}
      size={size}
      icon={<Camera className="w-6 h-6" />}
      onClick={handleClick}
      isLocked={isLocked}
      hasMemoryAward={!!awardMemory}
      analyticsTag={analyticsTag || `ar-card-${sceneId}`}
      theme="fuchsia"
    >
      {isLocked && unlockRule.message && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
          <Lock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300">{unlockRule.message}</p>
        </div>
      )}

      {!isLocked && (
        <>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <div className="px-2 py-1 rounded-md bg-white/5 text-xs font-medium">
              {mode === "markerless" ? "Markerless" : "Marker-based"}
            </div>
            <span className="text-slate-500">•</span>
            <span>Scene ID: {sceneId}</span>
          </div>

          {awardMemory && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-300">
                Earn {awardMemory.points} points + memory
              </p>
            </div>
          )}

          <button
            onClick={handleClick}
            className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 text-white font-semibold hover:from-fuchsia-700 hover:to-fuchsia-800 transition-all duration-200 shadow-lg shadow-fuchsia-500/25"
          >
            Launch AR
          </button>
        </>
      )}
    </EventCard>
  );
}
