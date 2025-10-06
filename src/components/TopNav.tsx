"use client";

import { useState } from "react";
import { QrCode, Crown, WalletCards, Shield, LogOut, ScanLine, ChevronDown, User } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFanScore } from '@/hooks/useFanScore';
import UserScoreModal from './UserScoreModal';

export type Phase = "before" | "event" | "after";

interface TopNavProps {
  currentPhase: Phase;
}

export default function TopNav({ currentPhase }: TopNavProps) {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { scoreData } = useFanScore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [userScoreOpen, setUserScoreOpen] = useState(false);

  const handlePhaseChange = (phase: Phase) => {
    if (phase === currentPhase) return;
    
    switch (phase) {
      case 'before':
        router.push('/before');
        break;
      case 'event':
        router.push('/event');
        break;
      case 'after':
        router.push('/after');
        break;
    }
  };

  const handleOpenWallet = () => {
    if (!isAuthenticated) {
      window.location.href = '/api/login?returnTo=/memory-wallet';
      return;
    }
    router.push('/memory-wallet');
  };

  const handleOpenQR = () => {
    if (!isAuthenticated) {
      window.location.href = '/api/login?returnTo=/event';
      return;
    }
    setQrScannerOpen(true);
  };

  const handleOpenAdmin = () => {
    router.push('/admin/cms');
  };

  const handleSignOut = () => {
    window.location.href = '/api/logout';
  };

  const getTierName = (level: number): "Bronze" | "Silver" | "Gold" => {
    if (level >= 8) return "Gold";
    if (level >= 4) return "Silver";
    return "Bronze";
  };

  const points = scoreData?.currentScore?.totalScore || 0;
  const level = scoreData?.currentScore?.level || 1;
  const tier = getTierName(level);
  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : "Guest";

  const tabBase =
    "px-4 py-2 rounded-full text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400";
  const tabActive =
    "bg-fuchsia-600 text-white shadow";
  const tabIdle =
    "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <>
      <header className="w-full sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-3 sm:px-4">
          <div className="h-14 flex items-center gap-2">
            {/* LEFT: Brand */}
            <div className="flex items-center gap-2 min-w-[110px]">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500" />
              <span className="hidden sm:block text-sm font-semibold tracking-wide text-slate-900 dark:text-white">
                Ode Islands
              </span>
            </div>

            {/* CENTER: Timeline Tabs */}
            <nav
              aria-label="Experience timeline"
              className="mx-auto flex items-center gap-1 bg-slate-100/70 dark:bg-slate-800/60 rounded-full p-1"
            >
              <button
                onClick={() => handlePhaseChange("before")}
                className={`${tabBase} ${currentPhase === "before" ? tabActive : tabIdle}`}
                aria-current={currentPhase === "before" ? "page" : undefined}
              >
                Before
              </button>
              <button
                onClick={() => handlePhaseChange("event")}
                className={`${tabBase} ${currentPhase === "event" ? tabActive : tabIdle}`}
                aria-current={currentPhase === "event" ? "page" : undefined}
              >
                Event
              </button>
              <button
                onClick={() => handlePhaseChange("after")}
                className={`${tabBase} ${currentPhase === "after" ? tabActive : tabIdle}`}
                aria-current={currentPhase === "after" ? "page" : undefined}
              >
                After
              </button>
            </nav>

            {/* RIGHT: Global Controls */}
            <div className="flex items-center gap-2 ml-auto">
              {isAuthenticated ? (
                <>
                  {/* Wallet */}
                  <button
                    onClick={handleOpenWallet}
                    className="relative inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:shadow-sm transition"
                    aria-label="Open Memory Wallet"
                  >
                    <WalletCards className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                    <span className="hidden sm:inline text-sm font-medium text-slate-900 dark:text-white">Wallet</span>
                  </button>

                  {/* Progress (tier ring + points) */}
                  <button
                    onClick={() => setUserScoreOpen(true)}
                    className="relative group flex items-center gap-2 px-3 py-2 rounded-xl bg-fuchsia-600 text-white shadow hover:bg-fuchsia-700 transition"
                    aria-label="Progress and tier"
                    title={`${tier} • ${points} pts`}
                  >
                    <div className="grid place-items-center w-6 h-6 rounded-full bg-white/15">
                      <Crown className="w-4 h-4" />
                    </div>
                    <span className="hidden md:inline text-sm font-semibold">{tier}</span>
                    <span className="hidden md:inline text-xs opacity-90">• {points} pts</span>
                  </button>

                  {/* Quick QR */}
                  <button
                    onClick={handleOpenQR}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 transition"
                    aria-label="Scan QR Code"
                  >
                    <ScanLine className="w-5 h-5" />
                    <span className="hidden sm:inline text-sm">Scan</span>
                  </button>

                  {/* Admin (role-gated) */}
                  {isAdmin && (
                    <button
                      onClick={handleOpenAdmin}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition"
                      aria-label="Open Admin"
                    >
                      <Shield className="w-5 h-5" />
                      <span className="hidden sm:inline text-sm">Admin</span>
                    </button>
                  )}

                  {/* Profile menu */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(v => !v)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 grid place-items-center">
                        <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      </div>
                      <span className="hidden sm:inline text-sm text-slate-900 dark:text-white">{userName}</span>
                      <ChevronDown className="w-4 h-4 opacity-70 text-slate-700 dark:text-slate-300" />
                    </button>

                    {menuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setMenuOpen(false)}
                        />
                        <div
                          role="menu"
                          className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden z-20"
                        >
                          <button
                            onClick={handleSignOut}
                            role="menuitem"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-900 dark:text-white"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <button
                  onClick={() => window.location.href = '/api/login'}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700 transition font-medium text-sm"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* QR Scanner Modal (placeholder - will integrate existing QRScanner component) */}
      {qrScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Scan QR Code</h2>
              <button
                onClick={() => setQrScannerOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              QR Scanner integration coming soon. This will use the existing QRScanner component.
            </p>
            <button
              onClick={() => setQrScannerOpen(false)}
              className="mt-4 w-full px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl hover:bg-black dark:hover:bg-slate-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* User Score Modal */}
      <UserScoreModal
        isOpen={userScoreOpen}
        onClose={() => setUserScoreOpen(false)}
        source="tier_pill"
      />
    </>
  );
}
