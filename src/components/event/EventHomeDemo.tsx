"use client";

import { useState } from 'react';
import { AlertCircle, CheckCircle, Clock, Sparkles, ArrowRight } from 'lucide-react';
import type { BaseCard, NowNextHero, SafetyBanner } from '@/types/event';

interface EventHomeDemoProps {
  nowNext: NowNextHero;
  featuredCards: BaseCard[];
  safetyBanner?: SafetyBanner;
  onEnterLane: (lane: 'info' | 'interact' | 'rewards') => void;
  onCardAction: (cardId: string, action: string) => void;
}

export function EventHomeDemo({
  nowNext,
  featuredCards,
  safetyBanner,
  onEnterLane,
  onCardAction
}: EventHomeDemoProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Strip */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 p-8 shadow-2xl">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Now at {nowNext.venue}
                  </h1>
                  <div className="flex items-center gap-2">
                    {safetyBanner && (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                        safetyBanner.status === 'ok'
                          ? 'bg-green-500/20 text-green-100'
                          : safetyBanner.status === 'notice'
                          ? 'bg-yellow-500/20 text-yellow-100'
                          : 'bg-red-500/20 text-red-100'
                      }`}>
                        {safetyBanner.status === 'ok' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        <span>{safetyBanner.copy}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Now & Next */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nowNext.now && (
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
                    <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="font-semibold">NOW</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {nowNext.now.title}
                    </h3>
                    <p className="text-white/60 text-sm">{nowNext.now.time}</p>
                  </div>
                )}

                {nowNext.next && (
                  <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold">UP NEXT</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {nowNext.next.title}
                    </h3>
                    <p className="text-white/60 text-sm">{nowNext.next.time}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Decorative gradient orbs */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-pink-500/30 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl"></div>
          </div>
        </section>

        {/* Featured Rail */}
        {featuredCards.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-fuchsia-400" />
              <h2 className="text-xl font-bold text-white">Featured</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredCards.map((card) => (
                <div
                  key={card.id}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-fuchsia-500/50 transition-all duration-300 hover:scale-105 cursor-pointer"
                  onClick={() => onCardAction(card.id, card.actions[0]?.action || 'view')}
                >
                  {card.imageUrl && (
                    <div className="aspect-video w-full overflow-hidden">
                      <img
                        src={card.imageUrl}
                        alt={card.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-fuchsia-300 transition-colors">
                      {card.title}
                    </h3>
                    {card.subtitle && (
                      <p className="text-white/60 text-sm mb-3">{card.subtitle}</p>
                    )}

                    {card.actions[0] && (
                      <button className="flex items-center gap-2 text-fuchsia-400 text-sm font-medium group-hover:gap-3 transition-all">
                        <span>{card.actions[0].label}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}

                    {/* Award badge */}
                    {card.award?.enabled && (
                      <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        +{card.award.points}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Lane Shortcuts */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <h2 className="text-xl font-bold text-white mb-4">Explore</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => onEnterLane('info')}
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
              onClick={() => onEnterLane('interact')}
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
              onClick={() => onEnterLane('rewards')}
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
