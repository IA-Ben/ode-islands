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
  award?: {
    enabled: boolean;
    points?: number;
    trigger?: string;
  };
}

interface EventLaneProps {
  lane: "info" | "interact" | "rewards";
  cards: EventLaneCard[];
  onBack: () => void;
  onCardClick: (card: EventLaneCard) => void;
  isAdmin?: boolean; // Optional: only show admin links when true
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

export function EventLane({ lane, cards, onBack, onCardClick, isAdmin = false }: EventLaneProps) {
  const config = laneConfig[lane];
  const LaneIcon = config.icon;
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  // Admin configuration mapping for each lane
  const adminConfigLinks: Record<string, string> = {
    info: '/admin/cards?scope=event&lane=info',
    interact: '/admin/cards?scope=event&lane=interact',
    rewards: '/admin/cards?scope=event&lane=rewards',
  };
  
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

  const handleCardToggle = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const handleCardAction = (card: EventLaneCard) => {
    onCardClick(card);
  };

  // Convert lane config to match demo gradients
  const laneGradients = {
    info: 'from-blue-600 to-cyan-600',
    interact: 'from-fuchsia-600 to-purple-600',
    rewards: 'from-amber-600 to-orange-600'
  };

  const laneEmojis = {
    info: '📋',
    interact: '✨',
    rewards: '🎁'
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pb-20">
      {/* Lane Header with Demo Styling */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${laneGradients[lane]} p-8 mb-6 shadow-2xl`}>
        <div className="relative z-10">
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            aria-label="Back to hub"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Hub</span>
          </button>

          <div className="text-6xl mb-4">{laneEmojis[lane]}</div>
          <h1 className="text-4xl font-bold text-white mb-2">{config.title}</h1>
          <p className="text-white/80">{config.description}</p>
        </div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Original sticky header kept for scroll behavior */}
      <header className="hidden sticky top-0 z-20 backdrop-blur-lg bg-slate-900/80 border-b border-white/10">
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

      {/* Cards List with Expandable System */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {cards.map((card, index) => {
            const isExpanded = expandedCard === card.id;

            return (
              <div
                key={card.id}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 transition-all duration-300 ${
                  isExpanded ? 'ring-2 ring-fuchsia-500' : 'hover:border-fuchsia-500/50'
                }`}
              >
                {/* Card Header - Clickable to expand */}
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => handleCardToggle(card.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${laneGradients[lane]} flex items-center justify-center flex-shrink-0`}>
                        <div className="text-white">
                          {getCardIcon(card)}
                        </div>
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">
                          {card.title}
                        </h3>
                        {card.subtitle && (
                          <p className="text-sm text-white/60">{card.subtitle}</p>
                        )}
                      </div>
                    </div>

                    {/* Award Badge */}
                    {card.award?.enabled && card.award.points && (
                      <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        +{card.award.points}
                      </div>
                    )}

                    {/* Expand/Collapse Icon */}
                    <button
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      <svg
                        className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Card Image */}
                    {card.imageUrl && (
                      <div className="relative w-full h-48 rounded-xl overflow-hidden">
                        <img
                          src={card.imageUrl}
                          alt={card.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Description */}
                    {card.description && (
                      <p className="text-sm text-white/80 leading-relaxed">
                        {card.description}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardAction(card);
                        }}
                        className={`flex-1 py-3 px-4 rounded-xl bg-gradient-to-r ${laneGradients[lane]} text-white font-semibold hover:scale-105 transition-all duration-200 shadow-lg`}
                      >
                        Open
                      </button>

                      {card.type === 'qr-scan' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardAction(card);
                          }}
                          className="py-3 px-4 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-all duration-200"
                        >
                          Scan Now
                        </button>
                      )}
                    </div>

                    {/* Metadata badges */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <span className="px-2 py-1 rounded-md bg-white/5 text-xs text-white/60">
                        {card.type.replace(/-/g, ' ')}
                      </span>
                      <span className="px-2 py-1 rounded-md bg-white/5 text-xs text-white/60">
                        Size: {card.size}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Empty State */}
          {cards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className={`w-20 h-20 rounded-2xl ${config.iconBg} flex items-center justify-center`}>
                <LaneIcon className={`w-10 h-10 ${config.iconColor}`} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-white">No content yet</h3>
                <p className="text-sm text-slate-400 mb-6">
                  Check back later for new {config.title.toLowerCase()} content
                </p>
                
                {/* Admin Configuration Link - Only shown to admins */}
                {isAdmin && (
                  <a
                    href={adminConfigLinks[lane]}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-br ${config.gradientBg} border ${config.borderColor} ${config.hoverBorder} text-white hover:scale-105 transition-all duration-200 font-medium shadow-lg ${config.shadowColor}`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Configure in Admin</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
