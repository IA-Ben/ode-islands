"use client";

import { QrCode, MapPin, Calendar, Tag, Info, Sparkles, Gift, ArrowRight, Clock, WalletCards } from "lucide-react";

export interface FeaturedCard {
  id: string;
  size: "S" | "M" | "L";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaAction?: () => void;
}

export interface NowNextItem {
  id: string;
  title: string;
  time: string;
  description?: string;
  isLive?: boolean;
}

interface EventHubProps {
  onEnterLane: (lane: "info" | "interact" | "rewards") => void;
  featuredCards?: FeaturedCard[];
  nowNextItems?: NowNextItem[];
  onQuickAction?: (action: "scan" | "map" | "schedule" | "offers" | "wallet") => void;
}

export function EventHub({
  onEnterLane,
  featuredCards = [],
  nowNextItems = [],
  onQuickAction,
}: EventHubProps) {
  const handleQuickAction = (action: "scan" | "map" | "schedule" | "offers" | "wallet") => {
    if (onQuickAction) {
      onQuickAction(action);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Quick Actions Bar */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => handleQuickAction("scan")}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 text-white shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 hover:scale-105 transition-all duration-200 font-medium"
              aria-label="Scan QR Code"
            >
              <QrCode className="w-5 h-5" />
              <span className="text-sm">Scan</span>
            </button>
            
            <button
              onClick={() => handleQuickAction("map")}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 text-white hover:bg-white/15 transition-all duration-200 font-medium border border-white/10"
              aria-label="View Map"
            >
              <MapPin className="w-5 h-5" />
              <span className="text-sm">Map</span>
            </button>
            
            <button
              onClick={() => handleQuickAction("schedule")}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 text-white hover:bg-white/15 transition-all duration-200 font-medium border border-white/10"
              aria-label="View Schedule"
            >
              <Calendar className="w-5 h-5" />
              <span className="text-sm">Schedule</span>
            </button>
            
            <button
              onClick={() => handleQuickAction("offers")}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 text-white hover:bg-white/15 transition-all duration-200 font-medium border border-white/10"
              aria-label="View Offers"
            >
              <Tag className="w-5 h-5" />
              <span className="text-sm">Offers</span>
            </button>
            
            <button
              onClick={() => handleQuickAction("wallet")}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 text-white hover:bg-white/15 transition-all duration-200 font-medium border border-white/10"
              aria-label="Open Wallet"
            >
              <WalletCards className="w-5 h-5" />
              <span className="text-sm">Wallet</span>
            </button>
          </div>
        </section>

        {/* Now & Next Section */}
        {nowNextItems.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-fuchsia-400" />
              <h2 className="text-xl font-bold text-white">Now & Next</h2>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {nowNextItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-4 hover:border-fuchsia-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-fuchsia-500/10"
                >
                  {item.isLive && (
                    <div className="absolute top-3 right-3">
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500 text-white text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        LIVE
                      </span>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-fuchsia-400">{item.time}</div>
                    <h3 className="text-lg font-bold text-white leading-tight group-hover:text-fuchsia-300 transition-colors">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-slate-300 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Featured Cards Section */}
        {featuredCards.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">Featured</h2>
            </div>
            
            {/* Hero Layout (single large card) */}
            {featuredCards.length === 1 && featuredCards[0].size === "L" ? (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 shadow-2xl">
                {featuredCards[0].imageUrl && (
                  <div className="relative w-full h-64 sm:h-80 lg:h-96 overflow-hidden">
                    <img
                      src={featuredCards[0].imageUrl}
                      alt={featuredCards[0].title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                  </div>
                )}
                
                <div className="relative p-6 sm:p-8 space-y-4">
                  {featuredCards[0].subtitle && (
                    <div className="text-sm font-medium text-fuchsia-400 uppercase tracking-wide">
                      {featuredCards[0].subtitle}
                    </div>
                  )}
                  
                  <h3 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                    {featuredCards[0].title}
                  </h3>
                  
                  {featuredCards[0].ctaLabel && (
                    <button
                      onClick={featuredCards[0].ctaAction}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-fuchsia-600 text-white font-semibold hover:bg-fuchsia-700 hover:scale-105 transition-all duration-200 shadow-lg shadow-fuchsia-500/25"
                    >
                      {featuredCards[0].ctaLabel}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Carousel/Grid Layout (1-3 medium/small cards) */
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredCards.map((card) => (
                  <div
                    key={card.id}
                    className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-fuchsia-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-fuchsia-500/20 ${
                      card.size === "M" ? "sm:col-span-2 lg:col-span-2" : ""
                    }`}
                  >
                    {card.imageUrl && (
                      <div className="relative w-full h-40 sm:h-48 overflow-hidden">
                        <img
                          src={card.imageUrl}
                          alt={card.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                      </div>
                    )}
                    
                    <div className="relative p-5 space-y-3">
                      {card.subtitle && (
                        <div className="text-xs font-medium text-fuchsia-400 uppercase tracking-wide">
                          {card.subtitle}
                        </div>
                      )}
                      
                      <h3 className="text-xl font-bold text-white leading-tight group-hover:text-fuchsia-300 transition-colors">
                        {card.title}
                      </h3>
                      
                      {card.ctaLabel && (
                        <button
                          onClick={card.ctaAction}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-fuchsia-600 transition-all duration-200"
                        >
                          {card.ctaLabel}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* All Lanes Entry Chips */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 pb-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white">Explore</h2>
            <p className="text-sm text-slate-400 mt-1">Choose your path through the experience</p>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            <button
              onClick={() => onEnterLane("info")}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-700/10 border border-blue-500/20 p-6 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors duration-300">
                  <Info className="w-6 h-6 text-blue-400" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Info</h3>
                  <p className="text-sm text-slate-300">Event details, stories & content</p>
                </div>
                
                <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                  <span>Explore</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            <button
              onClick={() => onEnterLane("interact")}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600/20 to-fuchsia-700/10 border border-fuchsia-500/20 p-6 hover:border-fuchsia-500/40 hover:shadow-xl hover:shadow-fuchsia-500/20 transition-all duration-300 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/0 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative space-y-3">
                <div className="w-12 h-12 rounded-xl bg-fuchsia-500/20 flex items-center justify-center group-hover:bg-fuchsia-500/30 transition-colors duration-300">
                  <Sparkles className="w-6 h-6 text-fuchsia-400" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Interact</h3>
                  <p className="text-sm text-slate-300">Polls, Q&A, live chat & more</p>
                </div>
                
                <div className="flex items-center gap-2 text-fuchsia-400 text-sm font-medium">
                  <span>Join In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            <button
              onClick={() => onEnterLane("rewards")}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600/20 to-amber-700/10 border border-amber-500/20 p-6 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors duration-300">
                  <Gift className="w-6 h-6 text-amber-400" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Rewards</h3>
                  <p className="text-sm text-slate-300">Collect memories & earn prizes</p>
                </div>
                
                <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                  <span>Collect</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
