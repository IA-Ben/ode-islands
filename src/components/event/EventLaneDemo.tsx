"use client";

import { useState } from 'react';
import { ChevronRight, Award, Clock, MapPin, QrCode, Sparkles, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { BaseCard, CardLane } from '@/types/event';

interface EventLaneDemoProps {
  lane: CardLane;
  cards: BaseCard[];
  onCardAction: (cardId: string, action: string) => void;
  onAwardPoints?: (points: number, reason: string) => void;
}

const laneConfig = {
  info: {
    title: 'Info',
    subtitle: 'Everything you need to know',
    icon: '📋',
    gradient: 'from-blue-600 to-cyan-600'
  },
  interact: {
    title: 'Interact',
    subtitle: 'Engage and collect',
    icon: '✨',
    gradient: 'from-fuchsia-600 to-purple-600'
  },
  rewards: {
    title: 'Rewards',
    subtitle: 'Perks and purchases',
    icon: '🎁',
    gradient: 'from-amber-600 to-orange-600'
  }
};

const cardIcons: Record<string, any> = {
  schedule: Clock,
  map: MapPin,
  ar: Sparkles,
  qr: QrCode,
  merch: ShoppingBag,
  'food-beverage': UtensilsCrossed
};

export function EventLaneDemo({
  lane,
  cards,
  onCardAction,
  onAwardPoints
}: EventLaneDemoProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const config = laneConfig[lane];

  const handleCardClick = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const handleAction = (card: BaseCard, actionType: string) => {
    onCardAction(card.id, actionType);

    // Award points if configured
    if (card.award?.enabled && card.award.trigger === 'onOpen' && onAwardPoints) {
      onAwardPoints(card.award.points || 0, card.title);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Lane Header */}
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${config.gradient} p-8 mb-6 shadow-2xl`}>
          <div className="relative z-10">
            <div className="text-6xl mb-4">{config.icon}</div>
            <h1 className="text-4xl font-bold text-white mb-2">{config.title}</h1>
            <p className="text-white/80">{config.subtitle}</p>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* Cards List */}
        <div className="space-y-4">
          {cards.map((card) => {
            const Icon = cardIcons[card.type] || Sparkles;
            const isExpanded = expandedCard === card.id;

            return (
              <div
                key={card.id}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 transition-all duration-300 ${
                  isExpanded ? 'ring-2 ring-fuchsia-500' : 'hover:border-fuchsia-500/50'
                }`}
              >
                {/* Card Header */}
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => handleCardClick(card.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">
                          {card.title}
                        </h3>
                        {card.subtitle && (
                          <p className="text-white/60 text-sm">{card.subtitle}</p>
                        )}

                        {/* Award Badge */}
                        {card.award?.enabled && (
                          <div className="inline-flex items-center gap-1 mt-2 bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full text-xs font-bold">
                            <Award className="w-3 h-3" />
                            <span>+{card.award.points} points</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-5 h-5 text-white/40 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    {card.description && (
                      <p className="text-white/70 text-sm mb-4 pl-16">
                        {card.description}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pl-16">
                      {card.actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAction(card, action.action)}
                          className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                            action.type === 'primary'
                              ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white hover:shadow-lg hover:shadow-fuchsia-500/50'
                              : action.type === 'secondary'
                              ? 'bg-white/10 text-white hover:bg-white/20'
                              : 'text-fuchsia-400 hover:text-fuchsia-300'
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>

                    {/* Demo Params Display */}
                    {card.params && Object.keys(card.params).length > 0 && (
                      <div className="mt-4 pl-16">
                        <details className="text-xs text-white/40">
                          <summary className="cursor-pointer hover:text-white/60">
                            Card Parameters
                          </summary>
                          <pre className="mt-2 p-2 bg-black/20 rounded overflow-x-auto">
                            {JSON.stringify(card.params, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {cards.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-white mb-2">
              No cards available
            </h3>
            <p className="text-white/60">
              Check back later for more content
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
