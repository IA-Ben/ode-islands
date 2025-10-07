"use client";

import { Share2, Wand2, Tag, Clock, Film, Image as ImageIcon, BookOpen, Trophy, RefreshCw, ArrowRight } from "lucide-react";
import type { Tier } from '@/components/event/GlobalHUD';

export interface FeaturedAfterCard {
  id: string;
  size: "S" | "M" | "L";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaAction?: () => void;
}

export interface WelcomeHeroData {
  userName?: string;
  lastMemory?: {
    title: string;
    imageUrl?: string;
  };
  tier: Tier;
  pointsToNextTier: number;
  nextTier?: Tier;
}

interface AfterHubProps {
  onEnterLane: (lane: "recap" | "create" | "offers") => void;
  featuredCards?: FeaturedAfterCard[];
  welcomeData?: WelcomeHeroData;
  onQuickAction?: (action: "share" | "remix" | "claim" | "wallet") => void;
}

export function AfterHub({
  onEnterLane,
  featuredCards = [],
  welcomeData,
  onQuickAction,
}: AfterHubProps) {
  const handleQuickAction = (action: "share" | "remix" | "claim" | "wallet") => {
    if (onQuickAction) {
      onQuickAction(action);
    }
  };

  const tierColors = {
    Bronze: "from-amber-600 to-amber-700",
    Silver: "from-slate-400 to-slate-500",
    Gold: "from-yellow-500 to-yellow-600",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Hero Strip - Welcome Back */}
        {welcomeData && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-6 sm:p-8 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-purple-500/5" />
              
              <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Welcome Message */}
                <div className="lg:col-span-2 space-y-3">
                  <h2 className="text-3xl sm:text-4xl font-bold text-white">
                    Welcome back{welcomeData.userName ? `, ${welcomeData.userName}` : ''}!
                  </h2>
                  <p className="text-white/70 text-lg">
                    Your journey continues. Explore your memories, create something new, and unlock rewards.
                  </p>
                  
                  {/* Last Memory Preview */}
                  {welcomeData.lastMemory && (
                    <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
                      {welcomeData.lastMemory.imageUrl && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          <img 
                            src={welcomeData.lastMemory.imageUrl} 
                            alt={welcomeData.lastMemory.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-fuchsia-400 font-medium mb-1">LATEST MEMORY</div>
                        <div className="text-white font-semibold truncate">{welcomeData.lastMemory.title}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tier Progress */}
                <div className="space-y-3">
                  <div className={`p-4 rounded-xl bg-gradient-to-br ${tierColors[welcomeData.tier]} shadow-lg`}>
                    <div className="text-white/90 text-sm font-medium mb-1">CURRENT TIER</div>
                    <div className="text-2xl font-bold text-white">{welcomeData.tier}</div>
                  </div>
                  
                  {welcomeData.nextTier && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-white/60 text-xs font-medium mb-2">
                        {welcomeData.pointsToNextTier} pts to {welcomeData.nextTier}
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-fuchsia-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(0, Math.min((1 - welcomeData.pointsToNextTier / 500) * 100, 100))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Quick Actions Bar */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => handleQuickAction("share")}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 text-white shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 hover:scale-105 transition-all duration-200 font-medium"
              aria-label="Share Highlights"
            >
              <Share2 className="w-5 h-5" />
              <span className="text-sm">Share</span>
            </button>
            
            <button
              onClick={() => handleQuickAction("remix")}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 text-white hover:bg-white/15 transition-all duration-200 font-medium border border-white/10"
              aria-label="Remix Content"
            >
              <Wand2 className="w-5 h-5" />
              <span className="text-sm">Remix</span>
            </button>
            
            <button
              onClick={() => handleQuickAction("claim")}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 text-white hover:bg-white/15 transition-all duration-200 font-medium border border-white/10"
              aria-label="Claim Perks"
            >
              <Tag className="w-5 h-5" />
              <span className="text-sm">Claim Perks</span>
            </button>
          </div>
        </section>

        {/* Featured Cards Section */}
        {featuredCards.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">For You</h2>
              <p className="text-sm text-slate-400 mt-1">Personalized recommendations based on your journey</p>
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
            <p className="text-sm text-slate-400 mt-1">Continue your post-event journey</p>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            <button
              onClick={() => onEnterLane("recap")}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-700/10 border border-blue-500/20 p-6 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors duration-300">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Recap</h3>
                  <p className="text-sm text-slate-300">Relive your memories & achievements</p>
                </div>
                
                <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                  <span>View</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            <button
              onClick={() => onEnterLane("create")}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/20 to-purple-700/10 border border-purple-500/20 p-6 hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors duration-300">
                  <Wand2 className="w-6 h-6 text-purple-400" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Create</h3>
                  <p className="text-sm text-slate-300">Remix, design & share content</p>
                </div>
                
                <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                  <span>Make</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            <button
              onClick={() => onEnterLane("offers")}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600/20 to-amber-700/10 border border-amber-500/20 p-6 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors duration-300">
                  <Tag className="w-6 h-6 text-amber-400" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Offers</h3>
                  <p className="text-sm text-slate-300">Exclusive perks & rewards</p>
                </div>
                
                <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                  <span>Claim</span>
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
