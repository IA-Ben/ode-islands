"use client";

import { MapPin, Calendar, Compass, Users, Sparkles, Clock } from "lucide-react";
import { useState } from "react";

export interface FeaturedBeforeCard {
  id: string;
  size: "S" | "M" | "L";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaAction?: () => void;
}

interface BeforeHubProps {
  onEnterLane: (lane: "plan" | "discover" | "community") => void;
  featuredCards?: FeaturedBeforeCard[];
  onQuickAction?: (action: "scan" | "map" | "schedule" | "offers" | "tickets") => void;
  eventDate?: Date;
}

export function BeforeHub({
  onEnterLane,
  featuredCards = [],
  onQuickAction,
  eventDate,
}: BeforeHubProps) {
  const [activeTab, setActiveTab] = useState<"featured" | "plan" | "discover" | "community">("featured");

  const handleQuickAction = (action: "scan" | "map" | "schedule" | "offers" | "tickets") => {
    if (onQuickAction) {
      onQuickAction(action);
    }
  };

  const getCountdown = () => {
    if (!eventDate) return null;
    const now = new Date();
    const diff = eventDate.getTime() - now.getTime();
    if (diff <= 0) return "Event starting soon!";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h until event`;
    return `${hours}h until event`;
  };

  const scrollToSection = (section: "plan" | "discover" | "community") => {
    const element = document.getElementById(`section-${section}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-900">
      {/* Sticky Sub-Navigation */}
      <div className="sticky top-[80px] z-40 bg-slate-900/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide">
            <button
              onClick={() => {
                setActiveTab("featured");
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-shrink-0 px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                activeTab === "featured"
                  ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              Featured
            </button>
            <button
              onClick={() => {
                setActiveTab("plan");
                scrollToSection("plan");
              }}
              className={`flex-shrink-0 px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                activeTab === "plan"
                  ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              Plan
            </button>
            <button
              onClick={() => {
                setActiveTab("discover");
                scrollToSection("discover");
              }}
              className={`flex-shrink-0 px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                activeTab === "discover"
                  ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              Discover
            </button>
            <button
              onClick={() => {
                setActiveTab("community");
                scrollToSection("community");
              }}
              className={`flex-shrink-0 px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                activeTab === "community"
                  ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              Community
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Hero - Event Countdown & Quick Actions */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-6 sm:p-8 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-purple-500/5" />
            
            <div className="relative space-y-6">
              {/* Countdown */}
              {eventDate && getCountdown() && (
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-fuchsia-500/20">
                    <Clock className="w-6 h-6 text-fuchsia-400" />
                  </div>
                  <div>
                    <div className="text-sm text-white/60 font-medium">COUNTDOWN</div>
                    <div className="text-xl font-bold text-white">{getCountdown()}</div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div>
                <div className="text-sm text-white/60 font-medium mb-3">QUICK ACTIONS</div>
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    onClick={() => handleQuickAction("tickets")}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 text-white shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 hover:scale-105 transition-all duration-200 font-medium"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Get Tickets</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction("schedule")}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 font-medium"
                  >
                    <Calendar className="w-5 h-5" />
                    <span>Schedule</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction("map")}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 font-medium"
                  >
                    <MapPin className="w-5 h-5" />
                    <span>Venue Map</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Section */}
        {featuredCards.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">Featured</h2>
              <p className="text-sm text-slate-400 mt-1">Curated experiences to prepare you for the event</p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCards.map((card) => (
                <button
                  key={card.id}
                  onClick={card.ctaAction}
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-fuchsia-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 text-left ${
                    card.size === "L" ? "sm:col-span-2 lg:col-span-3" : ""
                  } ${card.size === "M" ? "sm:col-span-2" : ""}`}
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
                    {card.subtitle && (
                      <div className="text-xs font-medium text-fuchsia-400 uppercase tracking-wide">
                        {card.subtitle}
                      </div>
                    )}
                    
                    <h3 className="text-xl font-bold text-white group-hover:text-fuchsia-300 transition-colors leading-tight">
                      {card.title}
                    </h3>
                    
                    {card.ctaLabel && (
                      <div className="text-sm text-fuchsia-400 font-medium">
                        {card.ctaLabel} →
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Lane Navigation Cards */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white">Explore</h2>
            <p className="text-sm text-slate-400 mt-1">Prepare for your experience</p>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Plan Lane */}
            <button
              onClick={() => onEnterLane("plan")}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-700/10 border border-blue-500/20 hover:border-blue-500/40 hover:shadow-blue-500/20 shadow-xl hover:shadow-2xl transition-all duration-300 text-left p-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 group-hover:bg-blue-500/30 flex items-center justify-center transition-colors duration-300">
                  <MapPin className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">Plan</h3>
                <p className="text-sm text-slate-300">Tickets, travel & logistics</p>
              </div>
            </button>

            {/* Discover Lane */}
            <button
              onClick={() => onEnterLane("discover")}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/20 to-purple-700/10 border border-purple-500/20 hover:border-purple-500/40 hover:shadow-purple-500/20 shadow-xl hover:shadow-2xl transition-all duration-300 text-left p-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 flex items-center justify-center transition-colors duration-300">
                  <Compass className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">Discover</h3>
                <p className="text-sm text-slate-300">Stories, lore & trailers</p>
              </div>
            </button>

            {/* Community Lane */}
            <button
              onClick={() => onEnterLane("community")}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600/20 to-emerald-700/10 border border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-emerald-500/20 shadow-xl hover:shadow-2xl transition-all duration-300 text-left p-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 group-hover:bg-emerald-500/30 flex items-center justify-center transition-colors duration-300">
                  <Users className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">Community</h3>
                <p className="text-sm text-slate-300">Connect & participate</p>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
