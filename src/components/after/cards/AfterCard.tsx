"use client";

import { ArrowRight, Clock, CheckCircle2, Trophy, BookOpen, Palette, Calendar, Users, Gift, Film, Image as ImageIcon } from "lucide-react";

export interface AfterCardData {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  ctaLabel?: string;
  metadata?: Record<string, any>;
}

interface AfterCardProps {
  card: AfterCardData;
  onAction?: (action: string, card: AfterCardData) => void;
}

const cardTypeIcons: Record<string, any> = {
  // Recap lane
  "memory-timeline": Clock,
  "set-completion": CheckCircle2,
  "badges": Trophy,
  "highlights-reel": Film,
  // Create lane
  "story-epilogues": BookOpen,
  "poster-maker": Palette,
  "remix-studio": Film,
  "photo-editor": ImageIcon,
  // Offers lane
  "tier-perks": Gift,
  "next-show": Calendar,
  "referrals": Users,
};

export function AfterCard({ card, onAction }: AfterCardProps) {
  const IconComponent = cardTypeIcons[card.type] || Clock;
  
  const handleAction = () => {
    if (onAction) {
      onAction("view", card);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-fuchsia-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-fuchsia-500/10">
      {card.imageUrl && (
        <div className="relative w-full h-48 overflow-hidden">
          <img
            src={card.imageUrl}
            alt={card.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        </div>
      )}
      
      <div className="relative p-6 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-fuchsia-500/20 flex items-center justify-center">
          <IconComponent className="w-6 h-6 text-fuchsia-400" />
        </div>
        
        {card.subtitle && (
          <div className="text-xs font-medium text-fuchsia-400 uppercase tracking-wide">
            {card.subtitle}
          </div>
        )}
        
        <h3 className="text-2xl font-bold text-white leading-tight">
          {card.title}
        </h3>
        
        {card.description && (
          <p className="text-slate-300 leading-relaxed">
            {card.description}
          </p>
        )}
        
        {card.ctaLabel && (
          <button
            onClick={handleAction}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-fuchsia-600 text-white font-semibold hover:bg-fuchsia-700 hover:scale-105 transition-all duration-200 shadow-lg shadow-fuchsia-500/25"
          >
            {card.ctaLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
        
        {/* Metadata badges */}
        {card.metadata && (
          <div className="flex flex-wrap gap-2 pt-2">
            {card.metadata.tier && (
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/30">
                {card.metadata.tier} Tier
              </span>
            )}
            {card.metadata.points && (
              <span className="px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-400 text-xs font-medium border border-fuchsia-500/30">
                +{card.metadata.points} pts
              </span>
            )}
            {card.metadata.newContent && (
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/30">
                NEW
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
