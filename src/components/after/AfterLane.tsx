"use client";

import { useState, useRef } from "react";
import { 
  ArrowLeft, 
  Clock,
  Wand2,
  Tag,
  Film,
  CheckCircle2,
  Trophy,
  Image as ImageIcon,
  BookOpen,
  Palette,
  Users,
  Calendar,
  Ticket,
  Gift,
  RefreshCw
} from "lucide-react";

export interface AfterLaneCard {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  size: "S" | "M" | "L";
  icon?: string;
  imageUrl?: string;
  description?: string;
}

interface AfterLaneProps {
  lane: "recap" | "create" | "offers";
  cards: AfterLaneCard[];
  onBack: () => void;
  onCardClick: (card: AfterLaneCard) => void;
}

const laneConfig = {
  recap: {
    title: "Recap",
    description: "Relive your memories & achievements",
    icon: Clock,
    gradientBg: "from-blue-600/20 to-blue-700/10",
    borderColor: "border-blue-500/20",
    hoverBorder: "hover:border-blue-500/40",
    iconBg: "bg-blue-500/20",
    hoverIconBg: "group-hover:bg-blue-500/30",
    iconColor: "text-blue-400",
    textColor: "text-blue-400",
    hoverTextColor: "group-hover:text-blue-300",
    shadowColor: "hover:shadow-blue-500/20",
    overlayFrom: "from-blue-500/0",
    overlayTo: "to-blue-500/10",
  },
  create: {
    title: "Create",
    description: "Remix, design & share content",
    icon: Wand2,
    gradientBg: "from-purple-600/20 to-purple-700/10",
    borderColor: "border-purple-500/20",
    hoverBorder: "hover:border-purple-500/40",
    iconBg: "bg-purple-500/20",
    hoverIconBg: "group-hover:bg-purple-500/30",
    iconColor: "text-purple-400",
    textColor: "text-purple-400",
    hoverTextColor: "group-hover:text-purple-300",
    shadowColor: "hover:shadow-purple-500/20",
    overlayFrom: "from-purple-500/0",
    overlayTo: "to-purple-500/10",
  },
  offers: {
    title: "Offers",
    description: "Exclusive perks & rewards",
    icon: Tag,
    gradientBg: "from-amber-600/20 to-amber-700/10",
    borderColor: "border-amber-500/20",
    hoverBorder: "hover:border-amber-500/40",
    iconBg: "bg-amber-500/20",
    hoverIconBg: "group-hover:bg-amber-500/30",
    iconColor: "text-amber-400",
    textColor: "text-amber-400",
    hoverTextColor: "group-hover:text-amber-300",
    shadowColor: "hover:shadow-amber-500/20",
    overlayFrom: "from-amber-500/0",
    overlayTo: "to-amber-500/10",
  },
};

const cardTypeIcons: Record<string, any> = {
  // Recap lane
  "memory-timeline": Clock,
  "highlights-reel": Film,
  "set-completion": CheckCircle2,
  "badges": Trophy,
  // Create lane
  "story-epilogues": BookOpen,
  "poster-maker": Palette,
  "remix-studio": Film,
  "photo-editor": ImageIcon,
  // Offers lane
  "tier-perks": Trophy,
  "next-show": Calendar,
  "referrals": Users,
  "merch": Ticket,
  "season-pass": Gift,
};

export function AfterLane({ lane, cards, onBack, onCardClick }: AfterLaneProps) {
  const config = laneConfig[lane];
  const LaneIcon = config.icon;
  
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isAtTop = useRef(true);

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer && scrollContainer.scrollTop === 0) {
      isAtTop.current = true;
      touchStartY.current = e.touches[0].clientY;
    } else {
      isAtTop.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isAtTop.current) return;
    
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || scrollContainer.scrollTop > 0) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - touchStartY.current;

    if (distance > 0) {
      setPullDistance(Math.min(distance, 100));
      if (distance > 20) {
        setIsPulling(true);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isPulling && pullDistance > 60) {
      setTimeout(() => {
        setIsPulling(false);
        setPullDistance(0);
      }, 800);
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
  };

  const getCardIcon = (card: AfterLaneCard) => {
    const IconComponent = cardTypeIcons[card.type] || Clock;
    return <IconComponent className="w-6 h-6" />;
  };

  const getCardSizeClass = (size: "S" | "M" | "L") => {
    switch (size) {
      case "S":
        return "min-h-[180px]";
      case "M":
        return "min-h-[240px]";
      case "L":
        return "min-h-[320px]";
      default:
        return "min-h-[180px]";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-all duration-200 border border-white/10"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center`}>
                  <LaneIcon className={`w-5 h-5 ${config.iconColor}`} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{config.title}</h1>
                  <p className="text-sm text-slate-400">{config.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        ref={scrollContainerRef}
        className="overflow-y-auto"
        style={{ height: 'calc(100vh - 80px)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull to refresh indicator */}
        {isPulling && (
          <div 
            className="flex items-center justify-center py-4 transition-all duration-200"
            style={{ height: `${pullDistance}px` }}
          >
            <RefreshCw 
              className={`w-5 h-5 ${config.iconColor} ${pullDistance > 60 ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${pullDistance * 3.6}deg)` }}
            />
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Cards Grid */}
          {cards.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => onCardClick(card)}
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradientBg} border ${config.borderColor} ${config.hoverBorder} ${config.shadowColor} hover:shadow-xl transition-all duration-300 text-left ${getCardSizeClass(card.size)} ${
                    card.size === "M" ? "sm:col-span-2" : ""
                  } ${
                    card.size === "L" ? "sm:col-span-2 lg:col-span-3" : ""
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${config.overlayFrom} ${config.overlayTo} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  
                  {card.imageUrl && (
                    <div className="relative w-full h-32 overflow-hidden">
                      <img
                        src={card.imageUrl}
                        alt={card.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                    </div>
                  )}
                  
                  <div className="relative p-5 space-y-3">
                    <div className={`w-10 h-10 rounded-lg ${config.iconBg} ${config.hoverIconBg} flex items-center justify-center transition-colors duration-300`}>
                      {getCardIcon(card)}
                    </div>
                    
                    {card.subtitle && (
                      <div className={`text-xs font-medium ${config.textColor} uppercase tracking-wide`}>
                        {card.subtitle}
                      </div>
                    )}
                    
                    <h3 className={`text-xl font-bold text-white ${config.hoverTextColor} transition-colors leading-tight`}>
                      {card.title}
                    </h3>
                    
                    {card.description && (
                      <p className="text-sm text-slate-300 line-clamp-2">
                        {card.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className={`w-20 h-20 rounded-2xl ${config.iconBg} flex items-center justify-center mx-auto mb-4`}>
                <LaneIcon className={`w-10 h-10 ${config.iconColor}`} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No content yet</h3>
              <p className="text-slate-400">Check back later for new {config.title.toLowerCase()} content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
