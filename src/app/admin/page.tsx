"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  CreditCard,
  Gift,
  Wallet,
  Users,
  ShoppingCart,
  BarChart3,
  ArrowRight,
  TrendingUp,
  FileText,
  Activity
} from 'lucide-react';
import { surfaces, colors, components } from '@/lib/admin/designTokens';

interface QuickStat {
  label: string;
  value: string;
  icon: React.ElementType;
  href: string;
  iconColor: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface DashboardStats {
  users: {
    total: number;
    recent: number;
    growthPercent: number;
    change: string;
  };
  chapters: {
    total: number;
    published: number;
    draft: number;
    publishRate: number;
  };
  cards: {
    total: number;
    active: number;
    draft: number;
    recentlyUpdated: number;
  };
  events: {
    total: number;
    active: number;
    inactiveCount: number;
  };
  activity: {
    recentChapters: number;
    recentCards: number;
    weeklyActivity: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ firstName?: string; lastName?: string } | null>(null);

  useEffect(() => {
    loadDashboardStats();
    loadCurrentUser();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const quickStats: QuickStat[] = stats ? [
    {
      label: 'Total Users',
      value: stats.users.total.toString(),
      icon: Users,
      href: '/admin/users',
      iconColor: 'text-pink-400',
      change: stats.users.change,
      trend: stats.users.recent > 0 ? 'up' : 'neutral'
    },
    {
      label: 'Active Events',
      value: stats.events.active.toString(),
      icon: Calendar,
      href: '/admin/events',
      iconColor: 'text-purple-400',
      change: `${stats.events.total} total`,
      trend: 'neutral'
    },
    {
      label: 'Published Content',
      value: stats.chapters.published.toString(),
      icon: BookOpen,
      href: '/admin/story',
      iconColor: 'text-blue-400',
      change: `${stats.chapters.draft} drafts`,
      trend: 'neutral'
    },
    {
      label: 'Active Cards',
      value: stats.cards.active.toString(),
      icon: CreditCard,
      href: '/admin/cards',
      iconColor: 'text-green-400',
      change: `${stats.cards.total} total`,
      trend: 'neutral'
    },
  ] : [
    { label: 'Story Builder', value: 'Manage', icon: BookOpen, href: '/admin/story', iconColor: 'text-blue-400' },
    { label: 'Events', value: 'Manage', icon: Calendar, href: '/admin/events', iconColor: 'text-purple-400' },
    { label: 'Card Library', value: 'Manage', icon: CreditCard, href: '/admin/cards', iconColor: 'text-green-400' },
    { label: 'Users', value: 'Manage', icon: Users, href: '/admin/users', iconColor: 'text-pink-400' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const userName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Admin' : 'Admin';

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className={`w-12 h-12 rounded-xl ${colors.gradients.primary} flex items-center justify-center shadow-lg`}>
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Welcome back, {userName}!
              </h1>
              <p className="text-slate-400 mt-1">
                Manage your content and settings from the Admin CMS
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <button
                key={stat.label}
                onClick={() => router.push(stat.href)}
                className={`group relative ${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50 hover:border-fuchsia-500/50 transition-all duration-300 text-left`}
              >
                <div className="relative">
                  <div className={`w-12 h-12 rounded-lg ${surfaces.subtleGlass} flex items-center justify-center mb-4 border border-slate-700/50`}>
                    <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {stat.label}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-white mb-1">
                        {stat.value}
                      </p>
                      {stat.change && (
                        <p className={`text-xs flex items-center gap-1 ${stat.trend === 'up' ? 'text-green-400' : 'text-slate-400'}`}>
                          {stat.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                          {stat.change}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-fuchsia-400 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className={`${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg ${colors.gradients.primary} flex items-center justify-center`}>
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Updated this week</span>
                  <span className="text-white font-semibold">{stats.activity.weeklyActivity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Chapters updated</span>
                  <span className="text-white font-semibold">{stats.activity.recentChapters}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Cards updated</span>
                  <span className="text-white font-semibold">{stats.activity.recentCards}</span>
                </div>
              </div>
            </div>

            <div className={`${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center`}>
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Content Status</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Publish rate</span>
                  <span className="text-white font-semibold">{stats.chapters.publishRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Draft chapters</span>
                  <span className="text-amber-400 font-semibold">{stats.chapters.draft}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Draft cards</span>
                  <span className="text-amber-400 font-semibold">{stats.cards.draft}</span>
                </div>
              </div>
            </div>

            <div className={`${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center`}>
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">User Growth</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total users</span>
                  <span className="text-white font-semibold">{stats.users.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last 30 days</span>
                  <span className="text-green-400 font-semibold">{stats.users.change}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Growth rate</span>
                  <span className="text-green-400 font-semibold">+{stats.users.growthPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50`}>
            <h2 className="text-xl font-semibold text-white mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/admin/cms')}
                className={`w-full text-left px-4 py-3 rounded-lg ${colors.gradients.primary} text-white font-medium hover:opacity-90 transition-all duration-300 flex items-center justify-between`}
              >
                <span>Open Content Management</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/admin/analytics')}
                className={`w-full text-left px-4 py-3 rounded-lg ${surfaces.subtleGlass} border border-slate-700/50 hover:border-fuchsia-500/50 transition-all duration-300 flex items-center justify-between`}
              >
                <span className="text-white font-medium">View Analytics</span>
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </button>
              <button
                onClick={() => router.push('/admin/users')}
                className={`w-full text-left px-4 py-3 rounded-lg ${surfaces.subtleGlass} border border-slate-700/50 hover:border-fuchsia-500/50 transition-all duration-300 flex items-center justify-between`}
              >
                <span className="text-white font-medium">Manage Users</span>
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          <div className={`${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50`}>
            <h2 className="text-xl font-semibold text-white mb-4">
              System Status
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">CMS Status</span>
                <span className={`${components.badge} bg-green-500/20 text-green-400`}>
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">User Role</span>
                <span className={`${components.badge} bg-fuchsia-500/20 text-fuchsia-400`}>
                  Admin
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Permissions</span>
                <span className={`${components.badge} bg-sky-500/20 text-sky-400`}>
                  Full Access
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
