"use client";

import { useState, useEffect } from "react";
import {
  QrCode,
  Crown,
  WalletCards,
  Shield,
  LogOut,
  ScanLine,
  ChevronDown,
  User,
  LayoutDashboard,
  BookOpen,
  Calendar,
  CreditCard,
  Gift,
  Wallet,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  ArrowLeftRight,
  Menu,
  X,
  Loader2,
} from "lucide-react";

export type Mode = "app" | "admin";

interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  permissions?: string[];
}

interface UnifiedTopNavProps {
  mode: Mode;
  user?: UserData | null;
  // App state
  currentPhase?: "before" | "event" | "after";
  onPhaseChange?: (phase: "before" | "event" | "after") => void;
  walletNewCount?: number;
  points?: number;
  tier?: "Bronze" | "Silver" | "Gold";
  onOpenWallet?: () => void;
  onOpenQR?: () => void;
  onOpenScore?: () => void;
  // Admin state
  currentAdminSection?: string;
  onAdminSectionChange?: (section: string) => void;
  // Mode switch
  onSwitchMode: (nextMode: Mode) => void;
  // Demo mode
  isDemoMode?: boolean;
  onToggleDemo?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  permissions: string[];
}

const adminNavItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    permissions: ["content:view"],
  },
  {
    id: "story",
    label: "Story",
    icon: BookOpen,
    permissions: ["story:view", "story:create", "story:edit"],
  },
  {
    id: "events",
    label: "Events",
    icon: Calendar,
    permissions: ["events:view", "events:create", "events:edit"],
  },
  {
    id: "cards",
    label: "Cards",
    icon: CreditCard,
    permissions: ["cards:view", "cards:create", "cards:edit"],
  },
  {
    id: "rewards",
    label: "Rewards",
    icon: Gift,
    permissions: ["rewards:view", "rewards:create"],
  },
  {
    id: "wallet",
    label: "Wallet",
    icon: Wallet,
    permissions: ["users:manage_wallet"],
  },
  {
    id: "users",
    label: "Users",
    icon: Users,
    permissions: ["users:view"],
  },
  {
    id: "orders",
    label: "Orders",
    icon: ShoppingCart,
    permissions: ["orders:view", "orders:create"],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    permissions: ["analytics:view"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    permissions: ["settings:view", "settings:edit"],
  },
];

function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;

  if (userPermissions.includes("system:admin")) {
    return true;
  }

  for (const required of requiredPermissions) {
    for (const userPerm of userPermissions) {
      if (userPerm === required) return true;

      if (userPerm.endsWith("*")) {
        const prefix = userPerm.slice(0, -1);
        if (required.startsWith(prefix)) {
          return true;
        }
      }
    }
  }

  return false;
}

const canSeeAdmin = (permissions: string[]) => {
  return permissions?.some(
    (p) =>
      p.includes("admin") ||
      p.includes("owner") ||
      p.includes("producer") ||
      p.includes("content:")
  );
};

export default function UnifiedTopNav({
  mode,
  user = null,
  currentPhase = "before",
  onPhaseChange,
  walletNewCount = 0,
  points = 0,
  tier = "Bronze",
  onOpenWallet,
  onOpenQR,
  onOpenScore,
  currentAdminSection = "dashboard",
  onAdminSectionChange,
  onSwitchMode,
  isDemoMode = false,
  onToggleDemo,
}: UnifiedTopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const visibleAdminItems = adminNavItems.filter((item) => {
    if (!user || !user.permissions) return false;
    return hasAnyPermission(user.permissions, item.permissions);
  });

  const userName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
    : "Guest";
  const showModeSwitch = user && user.permissions && canSeeAdmin(user.permissions);
  const envMode = process.env.NEXT_PUBLIC_ENV === "production" ? "Prod" : "Demo";

  const tabBase =
    "px-4 py-2 rounded-full text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400";
  const tabActive = "bg-fuchsia-600 text-white shadow";
  const tabIdle =
    "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <header className="w-full sticky top-0 z-50 bg-white/85 dark:bg-slate-900/85 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-full mx-auto px-3 sm:px-4">
        <div className="h-14 flex items-center gap-2">
          {/* LEFT: Brand */}
          <div className="flex items-center gap-2 min-w-[100px] sm:min-w-[110px]">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 flex-shrink-0" />
            <span className="hidden sm:block text-sm font-semibold tracking-wide text-slate-900 dark:text-white">
              Ode Islands
            </span>
          </div>

          {/* CENTER: Navigation - Desktop/Tablet Only */}
          {mode === "app" ? (
            <nav
              aria-label="Experience timeline"
              className="hidden md:flex items-center gap-1 mx-auto bg-slate-100/70 dark:bg-slate-800/60 rounded-full p-1"
            >
              <button
                onClick={() => onPhaseChange?.("before")}
                className={`${tabBase} ${
                  currentPhase === "before" ? tabActive : tabIdle
                }`}
                aria-current={currentPhase === "before" ? "page" : undefined}
              >
                Before
              </button>
              <button
                onClick={() => onPhaseChange?.("event")}
                className={`${tabBase} ${
                  currentPhase === "event" ? tabActive : tabIdle
                }`}
                aria-current={currentPhase === "event" ? "page" : undefined}
              >
                Event
              </button>
              <button
                onClick={() => onPhaseChange?.("after")}
                className={`${tabBase} ${
                  currentPhase === "after" ? tabActive : tabIdle
                }`}
                aria-current={currentPhase === "after" ? "page" : undefined}
              >
                After
              </button>
            </nav>
          ) : (
            <>
              {/* Desktop Admin Nav */}
              <nav
                aria-label="Admin sections"
                className="hidden lg:flex items-center gap-1 mx-auto overflow-x-auto scrollbar-hide"
              >
                {visibleAdminItems.map((item) => {
                  const Icon = item.icon;
                  const active = currentAdminSection === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onAdminSectionChange?.(item.id)}
                      className={`
                        flex items-center gap-2 ${tabBase}
                        ${active ? tabActive : tabIdle}
                      `}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden xl:inline">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </>
          )}

          {/* Mobile Menu Button (both modes) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`${mode === 'app' ? 'md:hidden' : 'lg:hidden'} mx-auto px-3 py-2 rounded-full bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition`}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          {/* RIGHT: Controls - Desktop/Tablet */}
          <div className="hidden sm:flex items-center gap-2 ml-auto">
            {/* App Mode Controls */}
            {mode === "app" && user && (
              <>
                {/* Wallet */}
                <button
                  onClick={onOpenWallet}
                  className="relative inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-fuchsia-400 dark:hover:border-fuchsia-500 hover:shadow-md hover:shadow-fuchsia-500/10 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                  aria-label="Open Memory Wallet"
                >
                  <WalletCards className="w-5 h-5 text-slate-700 dark:text-slate-200 group-hover:text-fuchsia-600 transition-colors" />
                  <span className="hidden lg:inline text-sm font-medium text-slate-900 dark:text-white">
                    Wallet
                  </span>
                  {walletNewCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-fuchsia-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg shadow-fuchsia-500/50 animate-pulse">
                      {walletNewCount}
                    </span>
                  )}
                </button>

                {/* Tier */}
                <button
                  onClick={onOpenScore}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-fuchsia-600 text-white shadow hover:bg-fuchsia-700 hover:shadow-lg active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                  aria-label={`View your score and progress • ${tier} • ${points} pts`}
                  title={`Click to view your score • ${tier} • ${points} pts`}
                >
                  <div className="grid place-items-center w-6 h-6 rounded-full bg-white/15">
                    <Crown className="w-4 h-4" />
                  </div>
                  <span className="hidden lg:inline text-sm font-semibold">
                    {tier}
                  </span>
                  <span className="hidden lg:inline text-xs opacity-90">
                    • {points} pts
                  </span>
                </button>

                {/* QR Scan */}
                <button
                  onClick={onOpenQR}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                  aria-label="Scan QR Code"
                >
                  <ScanLine className="w-5 h-5" />
                  <span className="hidden lg:inline text-sm">Scan</span>
                </button>
              </>
            )}

            {/* Mode Switch */}
            {showModeSwitch && (
              <button
                onClick={() => onSwitchMode(mode === "app" ? "admin" : "app")}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                aria-label={`Switch to ${mode === "app" ? "Admin" : "App"} mode`}
              >
                {mode === "app" ? (
                  <>
                    <Shield className="w-5 h-5" />
                    <span className="hidden lg:inline text-sm">Admin</span>
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="w-5 h-5" />
                    <span className="hidden lg:inline text-sm">App</span>
                  </>
                )}
              </button>
            )}

            {/* User Profile Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-400 grid place-items-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden lg:inline text-sm text-slate-900 dark:text-white max-w-[120px] truncate">
                    {userName}
                  </span>
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
                      className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden z-20"
                    >
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {userName}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          {user.email}
                        </p>
                        {user.isAdmin && (
                          <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full bg-fuchsia-600 text-white text-xs font-medium">
                            Admin
                          </span>
                        )}
                      </div>
                      {user.isAdmin && mode === "app" && (
                        <button
                          onClick={() => {
                            window.location.href = "/admin";
                            setMenuOpen(false);
                          }}
                          role="menuitem"
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Admin Dashboard
                        </button>
                      )}
                      {user.isAdmin && mode === "admin" && (
                        <button
                          onClick={() => {
                            window.location.href = "/event";
                            setMenuOpen(false);
                          }}
                          role="menuitem"
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                          Back to App
                        </button>
                      )}
                      {onToggleDemo && (
                        <button
                          onClick={() => {
                            onToggleDemo();
                            setMenuOpen(false);
                          }}
                          role="menuitem"
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                        >
                          <span className="flex items-center gap-2">
                            <span>Demo Mode</span>
                          </span>
                          <div className={`
                            w-9 h-5 rounded-full relative transition-colors duration-200
                            ${isDemoMode ? 'bg-fuchsia-600' : 'bg-slate-300 dark:bg-slate-600'}
                          `}>
                            <div className={`
                              absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white
                              transition-transform duration-200
                              ${isDemoMode ? 'translate-x-4' : 'translate-x-0'}
                            `} />
                          </div>
                        </button>
                      )}
                      <button
                        onClick={handleSignOut}
                        role="menuitem"
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => (window.location.href = "/api/login")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700 transition font-medium text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile: User Avatar Only */}
          <div className="sm:hidden ml-auto">
            {user ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-400 grid place-items-center">
                <User className="w-4 h-4 text-white" />
              </div>
            ) : (
              <button
                onClick={() => (window.location.href = "/api/login")}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-fuchsia-600 text-white hover:bg-fuchsia-700 transition font-medium text-xs"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className={`${mode === 'app' ? 'md:hidden' : 'lg:hidden'} border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>
          <div className="px-3 py-3 space-y-3 max-h-[70vh] overflow-y-auto">
            
            {/* App Mode Mobile Menu */}
            {mode === "app" && (
              <>
                {/* Phase Navigation */}
                <div className="space-y-1">
                  <p className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Navigate
                  </p>
                  <button
                    onClick={() => {
                      onPhaseChange?.("before");
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      currentPhase === "before"
                        ? "bg-fuchsia-600 text-white shadow"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                    Before
                  </button>
                  <button
                    onClick={() => {
                      onPhaseChange?.("event");
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      currentPhase === "event"
                        ? "bg-fuchsia-600 text-white shadow"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Calendar className="w-5 h-5" />
                    Event
                  </button>
                  <button
                    onClick={() => {
                      onPhaseChange?.("after");
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      currentPhase === "after"
                        ? "bg-fuchsia-600 text-white shadow"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Gift className="w-5 h-5" />
                    After
                  </button>
                </div>

                {/* Actions */}
                {user && (
                  <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <p className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Actions
                    </p>
                    <button
                      onClick={() => {
                        onOpenWallet?.();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                    >
                      <span className="flex items-center gap-3">
                        <WalletCards className="w-5 h-5" />
                        Memory Wallet
                      </span>
                      {walletNewCount > 0 && (
                        <span className="w-6 h-6 bg-fuchsia-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {walletNewCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        onOpenScore?.();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                    >
                      <span className="flex items-center gap-3">
                        <Crown className="w-5 h-5" />
                        My Progress
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {tier} • {points} pts
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        onOpenQR?.();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                    >
                      <ScanLine className="w-5 h-5" />
                      Scan QR Code
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Admin Mode Mobile Menu */}
            {mode === "admin" && (
              <div className="space-y-1">
                <p className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Admin Sections
                </p>
                {visibleAdminItems.map((item) => {
                  const Icon = item.icon;
                  const active = currentAdminSection === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onAdminSectionChange?.(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                        ${
                          active
                            ? "bg-fuchsia-600 text-white shadow"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mode Switch & Profile */}
            {user && (
              <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Account
                </p>
                
                {/* User Info */}
                <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-400 grid place-items-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {userName}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mode Switch */}
                {showModeSwitch && (
                  <button
                    onClick={() => {
                      onSwitchMode(mode === "app" ? "admin" : "app");
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition"
                  >
                    {mode === "app" ? (
                      <>
                        <Shield className="w-5 h-5" />
                        Switch to Admin
                      </>
                    ) : (
                      <>
                        <ArrowLeftRight className="w-5 h-5" />
                        Switch to App
                      </>
                    )}
                  </button>
                )}

                {/* Sign Out */}
                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
