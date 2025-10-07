"use client";

import { useState, useRef } from "react";
import { 
  ArrowLeft, 
  MapPin,
  Compass,
  Users,
  RefreshCw
} from "lucide-react";
import { BeforeCard } from "./cards/BeforeCard";

export interface BeforeLaneCard {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  size: "S" | "M" | "L";
  icon?: string;
  imageUrl?: string;
  description?: string;
}

interface BeforeLaneProps {
  lane: "plan" | "discover" | "community";
  cards: BeforeLaneCard[];
  onBack: () => void;
  onCardClick: (action: string, card: BeforeLaneCard) => void;
}

const laneConfig = {
  plan: {
    title: "Plan",
    description: "Tickets, travel & logistics",
    icon: MapPin,
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
  discover: {
    title: "Discover",
    description: "Stories, lore & trailers",
    icon: Compass,
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
  community: {
    title: "Community",
    description: "Connect & participate",
    icon: Users,
    gradientBg: "from-emerald-600/20 to-emerald-700/10",
    borderColor: "border-emerald-500/20",
    hoverBorder: "hover:border-emerald-500/40",
    iconBg: "bg-emerald-500/20",
    hoverIconBg: "group-hover:bg-emerald-500/30",
    iconColor: "text-emerald-400",
    textColor: "text-emerald-400",
    hoverTextColor: "group-hover:text-emerald-300",
    shadowColor: "hover:shadow-emerald-500/20",
    overlayFrom: "from-emerald-500/0",
    overlayTo: "to-emerald-500/10",
  },
};


export function BeforeLane({ lane, cards, onBack, onCardClick }: BeforeLaneProps) {
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
    const distance = Math.max(0, currentY - touchStartY.current);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, 100));
      setIsPulling(distance > 60);
    }
  };

  const handleTouchEnd = () => {
    if (isPulling) {
      onBack();
    }
    setPullDistance(0);
    setIsPulling(false);
    isAtTop.current = false;
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-900">
      {/* Fixed Header */}
      <div className="sticky top-[80px] z-40 bg-slate-900/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-3 flex-1">
            <div className={`p-2 rounded-lg ${config.iconBg}`}>
              <LaneIcon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{config.title}</h1>
              <p className="text-sm text-slate-400">{config.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-[80px] left-0 right-0 flex items-center justify-center transition-opacity duration-200 z-30"
          style={{ 
            opacity: pullDistance / 60,
            transform: `translateY(${pullDistance}px)`
          }}
        >
          <div className={`p-3 rounded-full ${config.iconBg} border ${config.borderColor}`}>
            <ArrowLeft className={`w-5 h-5 ${config.iconColor} transition-transform duration-200 ${isPulling ? 'rotate-180' : ''}`} />
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div
        ref={scrollContainerRef}
        className="overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ height: 'calc(100vh - 160px)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-6">
          {cards.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className={`${
                    card.size === "M" ? "sm:col-span-2" : ""
                  } ${
                    card.size === "L" ? "sm:col-span-2 lg:col-span-3" : ""
                  }`}
                >
                  <BeforeCard
                    card={card}
                    onAction={(action, card) => onCardClick(action, card)}
                  />
                </div>
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
