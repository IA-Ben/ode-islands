"use client";

import { Camera, Image, Hash, Sparkles } from "lucide-react";
import { EventCard } from "./EventCard";

export interface MediaTemplate {
  id: string;
  name: string;
  type: "frame" | "filter" | "sticker";
  thumbnail?: string;
}

export interface UserMediaCardProps {
  templates: MediaTemplate[];
  stickers?: string[];
  hashtags?: string[];
  consentFlow?: {
    required: boolean;
    message: string;
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

export function UserMediaCard({
  templates,
  stickers = [],
  hashtags = [],
  consentFlow,
  awardMemory,
  title = "Capture & Share",
  subtitle = "Create Your Memory",
  image,
  size = "M",
  onClick,
  analyticsTag,
}: UserMediaCardProps) {
  const previewTemplates = templates.slice(0, 3);

  return (
    <EventCard
      title={title}
      subtitle={subtitle}
      image={image}
      size={size}
      icon={<Camera className="w-6 h-6" />}
      onClick={onClick}
      hasMemoryAward={!!awardMemory}
      analyticsTag={analyticsTag || "user-media-card"}
      theme="fuchsia"
    >
      {templates.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-white">Available Templates:</div>
          <div className="grid grid-cols-3 gap-2">
            {previewTemplates.map((template) => (
              <div
                key={template.id}
                className="aspect-square rounded-lg bg-white/5 border border-white/10 overflow-hidden"
              >
                {template.thumbnail ? (
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-6 h-6 text-slate-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
          {templates.length > 3 && (
            <div className="text-xs text-center text-slate-400">
              +{templates.length - 3} more templates
            </div>
          )}
        </div>
      )}

      {hashtags.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
          <Hash className="w-4 h-4 text-fuchsia-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-white mb-1">Share with:</div>
            <div className="flex flex-wrap gap-1">
              {hashtags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-0.5 rounded-md bg-fuchsia-500/20 text-fuchsia-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {awardMemory && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            Share to earn {awardMemory.points} points + memory
          </p>
        </div>
      )}

      {consentFlow && consentFlow.required && (
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-300">{consentFlow.message}</p>
        </div>
      )}

      <button
        onClick={onClick}
        className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 text-white font-semibold hover:from-fuchsia-700 hover:to-fuchsia-800 transition-all duration-200 shadow-lg shadow-fuchsia-500/25"
      >
        Capture & Share
      </button>
    </EventCard>
  );
}
