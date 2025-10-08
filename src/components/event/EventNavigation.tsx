"use client";

import { useState } from 'react';
import { Home, Info, Sparkles, Gift, QrCode, MapPin, Calendar, Tag, WalletCards, User } from 'lucide-react';
import type { CardLane, QuickAction } from '@/types/event';

interface EventNavigationProps {
  currentView: 'home' | CardLane;
  onViewChange: (view: 'home' | CardLane) => void;
  onQuickAction: (action: QuickAction) => void;
  walletCount?: number;
  tier?: string;
  quickActions?: QuickAction[];
}

export function EventNavigation({
  currentView,
  onViewChange,
  onQuickAction,
  walletCount = 0,
  tier = 'Bronze',
  quickActions = ['scan', 'map', 'schedule', 'offers', 'wallet']
}: EventNavigationProps) {
  const [topSection, setTopSection] = useState<'before' | 'event' | 'after'>('event');

  return (
    <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-lg border-b border-white/10">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Main Navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTopSection('before')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              topSection === 'before'
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Before
          </button>
          <button
            onClick={() => setTopSection('event')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              topSection === 'event'
                ? 'bg-fuchsia-600 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Event
          </button>
          <button
            onClick={() => setTopSection('after')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              topSection === 'after'
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            After
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Wallet with Badge */}
          <button
            onClick={() => onQuickAction('wallet')}
            className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Open Wallet"
          >
            <WalletCards className="w-5 h-5 text-white" />
            {walletCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-fuchsia-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {walletCount > 9 ? '9+' : walletCount}
              </span>
            )}
          </button>

          {/* Tier Pill */}
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold">
            {tier}
          </div>

          {/* Scan */}
          <button
            onClick={() => onQuickAction('scan')}
            className="p-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 transition-colors"
            aria-label="Scan QR"
          >
            <QrCode className="w-5 h-5 text-white" />
          </button>

          {/* Profile */}
          <button
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Profile"
          >
            <User className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Event Sub-Menu */}
      {topSection === 'event' && (
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => onViewChange('home')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              currentView === 'home'
                ? 'bg-white text-slate-900'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
          <button
            onClick={() => onViewChange('info')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              currentView === 'info'
                ? 'bg-white text-slate-900'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Info</span>
          </button>
          <button
            onClick={() => onViewChange('interact')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              currentView === 'interact'
                ? 'bg-white text-slate-900'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Interact</span>
          </button>
          <button
            onClick={() => onViewChange('rewards')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              currentView === 'rewards'
                ? 'bg-white text-slate-900'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Rewards</span>
          </button>
        </div>
      )}

      {/* Quick Actions (if on home) */}
      {topSection === 'event' && currentView === 'home' && (
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide border-t border-white/5 pt-3">
          {quickActions.includes('scan') && (
            <button
              onClick={() => onQuickAction('scan')}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 text-white shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 hover:scale-105 transition-all duration-200"
            >
              <QrCode className="w-4 h-4" />
              <span className="text-sm font-medium">Scan</span>
            </button>
          )}
          {quickActions.includes('map') && (
            <button
              onClick={() => onQuickAction('map')}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 transition-all"
            >
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">Map</span>
            </button>
          )}
          {quickActions.includes('schedule') && (
            <button
              onClick={() => onQuickAction('schedule')}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Schedule</span>
            </button>
          )}
          {quickActions.includes('offers') && (
            <button
              onClick={() => onQuickAction('offers')}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 transition-all"
            >
              <Tag className="w-4 h-4" />
              <span className="text-sm font-medium">Offers</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
