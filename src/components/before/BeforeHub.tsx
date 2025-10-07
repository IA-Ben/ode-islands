"use client";

import { MapPin, Calendar, Compass, Users, Sparkles, Clock, Film } from "lucide-react";
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
  onEnterLane: (lane: "plan" | "discover" | "community" | "bts") => void;
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
                setActiveTab("discover");
                onEnterLane("discover");
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
                onEnterLane("community");
              }}
              className={`flex-shrink-0 px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                activeTab === "community"
                  ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              Community
            </button>
            <button
              onClick={() => {
                setActiveTab("plan");
                onEnterLane("plan");
              }}
              className={`flex-shrink-0 px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                activeTab === "plan"
                  ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              Plan
            </button>
          </nav>
        </div>
      </div>

      {/* Full-Width Visual Hero */}
      <section className="relative h-[60vh] min-h-[500px] -mt-2 overflow-hidden">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/20 via-purple-600/20 to-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-500/10 via-transparent to-transparent" />
        </div>
        
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-fuchsia-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-300" />
        </div>

        {/* Content */}
        <div className="relative h-full max-w-6xl mx-auto px-4 flex flex-col justify-center items-center text-center">
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Event Countdown */}
            {eventDate && getCountdown() && (
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/20">
                <Clock className="w-5 h-5 text-fuchsia-400" />
                <span className="text-white font-bold text-lg">{getCountdown()}</span>
              </div>
            )}

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-tight">
              Your Journey<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-400">Begins Here</span>
            </h1>
            
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Explore immersive stories, plan your experience, and connect with the community
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                onClick={() => handleQuickAction("tickets")}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 text-white shadow-2xl shadow-fuchsia-500/50 hover:shadow-fuchsia-500/70 hover:scale-105 transition-all duration-200 font-semibold text-lg"
              >
                <Sparkles className="w-6 h-6" />
                <span>Get Tickets</span>
              </button>
              <button
                onClick={() => handleQuickAction("schedule")}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-black/40 backdrop-blur-xl border-2 border-white/30 text-white hover:bg-black/60 hover:border-white/50 transition-all duration-200 font-semibold text-lg"
              >
                <Calendar className="w-6 h-6" />
                <span>Schedule</span>
              </button>
              <button
                onClick={() => handleQuickAction("map")}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-black/40 backdrop-blur-xl border-2 border-white/30 text-white hover:bg-black/60 hover:border-white/50 transition-all duration-200 font-semibold text-lg"
              >
                <MapPin className="w-6 h-6" />
                <span>Venue</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/40 flex items-start justify-center p-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">

        {/* Featured Section - Visual First */}
        {featuredCards.length > 0 ? (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-white mb-2">Featured Experiences</h2>
              <p className="text-lg text-slate-400">Discover what awaits you</p>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-12">
              {featuredCards.map((card, index) => {
                const isLarge = card.size === "L";
                const isMedium = card.size === "M";
                const colSpan = isLarge ? "lg:col-span-12" : isMedium ? "lg:col-span-6" : "lg:col-span-4";
                const height = isLarge ? "h-[500px]" : isMedium ? "h-[400px]" : "h-[350px]";
                
                return (
                  <button
                    key={card.id}
                    onClick={card.ctaAction}
                    className={`group relative overflow-hidden rounded-3xl ${colSpan} ${height} shadow-2xl hover:shadow-fuchsia-500/20 transition-all duration-500 text-left transform hover:scale-[1.02]`}
                  >
                    {/* Full-size background image */}
                    {card.imageUrl ? (
                      <div className="absolute inset-0">
                        <img
                          src={card.imageUrl}
                          alt={card.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/30 via-purple-600/20 to-slate-900" />
                    )}
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/0 via-fuchsia-500/0 to-fuchsia-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Content */}
                    <div className="absolute inset-0 p-8 flex flex-col justify-end">
                      <div className="space-y-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                        {card.subtitle && (
                          <div className="inline-block px-3 py-1 rounded-full bg-fuchsia-500/90 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider">
                            {card.subtitle}
                          </div>
                        )}
                        
                        <h3 className={`font-bold text-white leading-tight ${isLarge ? "text-5xl" : isMedium ? "text-3xl" : "text-2xl"}`}>
                          {card.title}
                        </h3>
                        
                        {card.ctaLabel && (
                          <div className="flex items-center gap-2 text-fuchsia-300 font-semibold text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                            <span>{card.ctaLabel}</span>
                            <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-fuchsia-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Featured Content</h3>
              <p className="text-slate-400 mb-6">Configure featured cards to highlight key experiences</p>
              
              <a
                href="/admin/cms/featured?context=before"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 text-white hover:scale-105 transition-all duration-200 font-medium shadow-lg hover:shadow-fuchsia-500/40"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
                <span>Configure Featured Rules</span>
              </a>
            </div>
          </section>
        )}

        {/* Lane Navigation Cards */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white">Explore</h2>
            <p className="text-sm text-slate-400 mt-1">Prepare for your experience</p>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

            {/* BTS Lane */}
            <button
              onClick={() => onEnterLane("bts")}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600/20 to-fuchsia-700/10 border border-fuchsia-500/20 hover:border-fuchsia-500/40 hover:shadow-fuchsia-500/20 shadow-xl hover:shadow-2xl transition-all duration-300 text-left p-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/0 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative space-y-3">
                <div className="w-12 h-12 rounded-xl bg-fuchsia-500/20 group-hover:bg-fuchsia-500/30 flex items-center justify-center transition-colors duration-300">
                  <Film className="w-6 h-6 text-fuchsia-400" />
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-fuchsia-300 transition-colors">BTS</h3>
                <p className="text-sm text-slate-300">Behind the scenes</p>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
