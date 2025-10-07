"use client";

import { useRouter } from 'next/navigation';
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
  ArrowRight
} from 'lucide-react';
import { surfaces, colors, components } from '@/lib/admin/designTokens';

interface QuickStat {
  label: string;
  value: string;
  icon: React.ElementType;
  href: string;
  iconColor: string;
}

export default function AdminDashboard() {
  const router = useRouter();

  const quickStats: QuickStat[] = [
    { label: 'Story Builder', value: 'Manage', icon: BookOpen, href: '/admin/story', iconColor: 'text-blue-400' },
    { label: 'Events', value: 'Manage', icon: Calendar, href: '/admin/events', iconColor: 'text-purple-400' },
    { label: 'Card Library', value: 'Manage', icon: CreditCard, href: '/admin/cards', iconColor: 'text-green-400' },
    { label: 'Rewards', value: 'Manage', icon: Gift, href: '/admin/rewards', iconColor: 'text-orange-400' },
    { label: 'Wallet', value: 'Manage', icon: Wallet, href: '/admin/wallet', iconColor: 'text-indigo-400' },
    { label: 'Users', value: 'Manage', icon: Users, href: '/admin/users', iconColor: 'text-pink-400' },
    { label: 'Orders', value: 'Manage', icon: ShoppingCart, href: '/admin/orders', iconColor: 'text-amber-400' },
    { label: 'Analytics', value: 'View', icon: BarChart3, href: '/admin/analytics', iconColor: 'text-teal-400' },
  ];

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
                Welcome back, Dev User!
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
                    <p className="text-sm text-slate-400">
                      {stat.value}
                    </p>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-fuchsia-400 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

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
