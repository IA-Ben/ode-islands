"use client";

import { useState, useRef } from "react";
import { 
  ArrowLeft, 
  Info, 
  Sparkles, 
  Gift,
  Calendar,
  MapPin,
  Building,
  Shield,
  Camera,
  QrCode,
  Watch,
  Wand2,
  Upload,
  Trophy,
  Tag,
  ShoppingBag,
  Coffee,
  RefreshCw
} from "lucide-react";

export interface EventLaneCard {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  size: "S" | "M" | "L";
  icon?: string;
  imageUrl?: string;
  description?: string;
}

interface EventLaneProps {
  lane: "info" | "interact" | "rewards";
  cards: EventLaneCard[];
  onBack: () => void;
  onCardClick: (card: EventLaneCard) => void;
}

const laneConfig = {
  info: {
    title: "Info",
    description: "Event details, stories & content",
    icon: Info,
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
  interact: {
    title: "Interact",
    description: "Polls, Q&A, live chat & more",
    icon: Sparkles,
    gradientBg: "from-fuchsia-600/20 to-fuchsia-700/10",
    borderColor: "border-fuchsia-500/20",
    hoverBorder: "hover:border-fuchsia-500/40",
    iconBg: "bg-fuchsia-500/20",
    hoverIconBg: "group-hover:bg-fuchsia-500/30",
    iconColor: "text-fuchsia-400",
    textColor: "text-fuchsia-400",
    hoverTextColor: "group-hover:text-fuchsia-300",
    shadowColor: "hover:shadow-fuchsia-500/20",
    overlayFrom: "from-fuchsia-500/0",
    overlayTo: "to-fuchsia-500/10",
  },
  rewards: {
    title: "Rewards",
    description: "Collect memories & earn prizes",
    icon: Gift,
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
  // Info lane
  schedule: Calendar,
  map: MapPin,
  venue: Building,
  safety: Shield,
  // Interact lane
  "live-ar": Camera,
  "qr-scan": QrCode,
  wearables: Watch,
  "ai-create": Wand2,
  "user-media": Upload,
  // Rewards lane
  "points-superfan": Trophy,
  discounts: Tag,
  merch: ShoppingBag,
  "f&b": Coffee,
};

export function EventLane({ lane, cards, onBack, onCardClick }: EventLaneProps) {
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
      // Trigger refresh action - in a real implementation this would reload cards
      setTimeout(() => {
        setIsPulling(false);
        setPullDistance(0);
      }, 800);
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
  };

  const getCardIcon = (card: EventLaneCard) => {
    const IconComponent = cardTypeIcons[card.type] || Info;
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
        return "min-h-[200px]";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Lane Header */}
      <header className="sticky top-0 z-20 backdrop-blur-lg bg-slate-900/80 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-all duration-200"
              aria-label="Back to hub"
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
      </header>

      {/* Pull to Refresh Indicator */}
      {isPulling && (
        <div 
          className="flex items-center justify-center py-4 transition-all duration-300"
          style={{ 
            transform: `translateY(${Math.min(pullDistance - 20, 40)}px)`,
            opacity: Math.min(pullDistance / 60, 1)
          }}
        >
          <div className={`flex items-center gap-2 ${config.textColor}`}>
            <RefreshCw className={`w-5 h-5 ${pullDistance > 60 ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">
              {pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}

      {/* Card Rail */}
      <div
        ref={scrollContainerRef}
        className="h-[calc(100vh-120px)] overflow-y-auto snap-y snap-mandatory scroll-smooth"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="snap-start animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <button
                onClick={() => onCardClick(card)}
                className={`w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradientBg} border ${config.borderColor} ${config.hoverBorder} transition-all duration-300 hover:shadow-xl ${config.shadowColor} text-left ${getCardSizeClass(card.size)}`}
              >
                {/* Background overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${config.overlayFrom} ${config.overlayTo} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                {/* Card Image (if available) */}
                {card.imageUrl && (
                  <div className="relative w-full h-32 overflow-hidden">
                    <img
                      src={card.imageUrl}
                      alt={card.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                  </div>
                )}
                
                {/* Card Content */}
                <div className={`relative p-6 space-y-3 ${card.imageUrl ? 'pt-4' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {card.subtitle && (
                        <div className={`text-xs font-medium ${config.textColor} uppercase tracking-wide`}>
                          {card.subtitle}
                        </div>
                      )}
                      
                      <h3 className={`text-xl font-bold text-white leading-tight ${config.hoverTextColor} transition-colors`}>
                        {card.title}
                      </h3>
                      
                      {card.description && (
                        <p className="text-sm text-slate-300 line-clamp-2">
                          {card.description}
                        </p>
                      )}
                    </div>
                    
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${config.iconBg} ${config.hoverIconBg} flex items-center justify-center group-hover:scale-110 transition-all duration-300`}>
                      <div className={config.iconColor}>
                        {getCardIcon(card)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Size indicator badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 uppercase tracking-wider">
                      {card.type.replace(/-/g, ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded-md bg-white/5 text-xs font-medium ${config.textColor}`}>
                      {card.size}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          ))}
          
          {/* Empty State */}
          {cards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className={`w-20 h-20 rounded-2xl ${config.iconBg} flex items-center justify-center`}>
                <LaneIcon className={`w-10 h-10 ${config.iconColor}`} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-white">No cards yet</h3>
                <p className="text-sm text-slate-400">
                  Check back later for {config.title.toLowerCase()} content
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
