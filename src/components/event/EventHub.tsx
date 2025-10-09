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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
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

        {/* Now & Next Hero Strip */}
        {nowNextItems.length > 0 && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 p-8 shadow-2xl">
              <div className="relative z-10">
                <div className="mb-4">
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Live Event
                  </h1>
                </div>

                {/* Now & Next Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {nowNextItems.slice(0, 2).map((item, index) => (
                    <div
                      key={item.id}
                      className={`${
                        item.isLive || index === 0
                          ? 'bg-white/10 backdrop-blur-lg border-white/20'
                          : 'bg-white/5 backdrop-blur-lg border-white/10'
                      } rounded-2xl p-5 border`}
                    >
                      <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                        {item.isLive || index === 0 ? (
                          <>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="font-semibold">NOW</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4" />
                            <span className="font-semibold">UP NEXT</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {item.title}
                      </h3>
                      <p className="text-white/60 text-sm">{item.time}</p>
                      {item.description && (
                        <p className="text-white/50 text-xs mt-2">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Decorative gradient orbs */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-pink-500/30 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl"></div>
            </div>
          </section>
        )}

        {/* Featured Cards Section */}
        {featuredCards.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-fuchsia-400" />
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
                    className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-fuchsia-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-fuchsia-500/20 cursor-pointer ${
                      card.size === "M" ? "sm:col-span-2 lg:col-span-2" : ""
                    }`}
                  >
                    {card.imageUrl && (
                      <div className="relative w-full h-40 sm:h-48 overflow-hidden">
                        <img
                          src={card.imageUrl}
                          alt={card.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-left hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-blue-500/50"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Info</h3>
                <p className="text-blue-100 text-sm">
                  Schedule, maps, venue info & safety
                </p>
              </div>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            </button>

            <button
              onClick={() => onEnterLane("interact")}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600 to-purple-700 p-6 text-left hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-fuchsia-500/50"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">✨</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Interact</h3>
                <p className="text-purple-100 text-sm">
                  AR, QR scans, wearables & AI creation
                </p>
              </div>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            </button>

            <button
              onClick={() => onEnterLane("rewards")}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 p-6 text-left hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-amber-500/50"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🎁</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Rewards</h3>
                <p className="text-orange-100 text-sm">
                  Points, perks, merch & food ordering
                </p>
              </div>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
