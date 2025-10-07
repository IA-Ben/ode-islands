"use client";

import { 
  Ticket,
  MapPin,
  Calendar,
  BookOpen,
  Film,
  Sparkles,
  Trophy,
  MessageSquare,
  Play,
  Heart,
  Share2,
  LucideIcon
} from "lucide-react";
import type { BeforeLaneCard } from "../BeforeLane";

interface BeforeCardProps {
  card: BeforeLaneCard;
  onAction?: (action: string, card: BeforeLaneCard) => void;
}

const cardTypeIcons: Record<string, LucideIcon> = {
  // Plan lane
  "tickets": Ticket,
  "venue-travel": MapPin,
  "schedule-preview": Calendar,
  "safety-info": Heart,
  // Discover lane
  "immersive-chapter": BookOpen,
  "trailer": Film,
  "lore": Sparkles,
  "daily-drop": Play,
  // Community lane
  "challenge": Trophy,
  "polls": MessageSquare,
  "leaderboard": Trophy,
  "social": Share2,
};

export function BeforeCard({ card, onAction }: BeforeCardProps) {
  const handleAction = () => {
    if (onAction) {
      onAction("view", card);
    }
  };

  // Route to specialized card components based on type
  // For now, use generic fallback for all cards
  // Specialized components can be added later (e.g., ChapterTileCard, TicketCard, etc.)
  
  const IconComponent = cardTypeIcons[card.type] || BookOpen;

  return (
    <button
      onClick={handleAction}
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-fuchsia-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 text-left w-full"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/0 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {card.imageUrl && (
        <div className="relative w-full h-40 overflow-hidden">
          <img
            src={card.imageUrl}
            alt={card.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        </div>
      )}
      
      <div className="relative p-5 space-y-3">
        <div className="w-10 h-10 rounded-lg bg-fuchsia-500/20 group-hover:bg-fuchsia-500/30 flex items-center justify-center transition-colors duration-300">
          <IconComponent className="w-6 h-6 text-fuchsia-400" />
        </div>
        
        {card.subtitle && (
          <div className="text-xs font-medium text-fuchsia-400 uppercase tracking-wide">
            {card.subtitle}
          </div>
        )}
        
        <h3 className="text-xl font-bold text-white group-hover:text-fuchsia-300 transition-colors leading-tight">
          {card.title}
        </h3>
        
        {card.description && (
          <p className="text-sm text-slate-300 line-clamp-2">
            {card.description}
          </p>
        )}
      </div>
    </button>
  );
}
