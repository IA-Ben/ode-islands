"use client";

import { Wand2, Sparkles, Video } from "lucide-react";
import { EventCard } from "./EventCard";

export interface AICreationCardProps {
  captionStyles?: string[];
  promptSeeds?: string[];
  clipLength?: number;
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

export function AICreationCard({
  captionStyles = [],
  promptSeeds = [],
  clipLength,
  awardMemory,
  title = "AI Creation Studio",
  subtitle = "Create with AI",
  image,
  size = "M",
  onClick,
  analyticsTag,
}: AICreationCardProps) {
  return (
    <EventCard
      title={title}
      subtitle={subtitle}
      image={image}
      size={size}
      icon={<Wand2 className="w-6 h-6" />}
      onClick={onClick}
      hasMemoryAward={!!awardMemory}
      analyticsTag={analyticsTag || "ai-creation-card"}
      theme="fuchsia"
      badge={{ type: "CUSTOM", label: "AI POWERED", color: "bg-gradient-to-r from-purple-500 to-fuchsia-500" }}
    >
      {captionStyles.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-white">Caption Styles:</div>
          <div className="flex flex-wrap gap-2">
            {captionStyles.slice(0, 4).map((style, index) => (
              <div
                key={index}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/30 text-xs font-medium text-purple-300"
              >
                {style}
              </div>
            ))}
          </div>
          {captionStyles.length > 4 && (
            <div className="text-xs text-slate-400">
              +{captionStyles.length - 4} more styles
            </div>
          )}
        </div>
      )}

      {promptSeeds.length > 0 && (
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs font-semibold text-white mb-2">Inspiration Prompts:</div>
          <div className="space-y-1">
            {promptSeeds.slice(0, 2).map((seed, index) => (
              <div
                key={index}
                className="text-xs text-slate-300 italic"
              >
                "{seed}"
              </div>
            ))}
          </div>
          {promptSeeds.length > 2 && (
            <div className="text-xs text-slate-500 mt-1">
              +{promptSeeds.length - 2} more prompts
            </div>
          )}
        </div>
      )}

      {clipLength && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20">
          <Video className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
          <p className="text-sm text-fuchsia-300">
            Generate {clipLength}s video clips
          </p>
        </div>
      )}

      {awardMemory && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            Create & share to earn {awardMemory.points} points + memory
          </p>
        </div>
      )}

      <button
        onClick={onClick}
        className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:via-fuchsia-700 hover:to-pink-700 transition-all duration-200 shadow-lg shadow-fuchsia-500/25"
      >
        <span className="flex items-center justify-center gap-2">
          <Wand2 className="w-5 h-5" />
          Create with AI
        </span>
      </button>
    </EventCard>
  );
}
