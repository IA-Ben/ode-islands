"use client";

import { useEffect, useState } from 'react';
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
  ArrowRight,
  Loader2
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  permissions?: string[];
}

interface QuickStat {
  label: string;
  value: string;
  icon: React.ElementType;
  href: string;
  color: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (!response.ok) {
        router.push('/auth/login');
        return;
      }
      const userData = await response.json();
      
      if (!userData.isAdmin && (!userData.permissions || userData.permissions.length === 0)) {
        router.push('/');
        return;
      }
      
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-fuchsia-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

  const quickStats: QuickStat[] = [
    { label: 'Story Builder', value: 'Manage', icon: BookOpen, href: '/admin/story', color: 'from-blue-500 to-cyan-500' },
    { label: 'Events', value: 'Manage', icon: Calendar, href: '/admin/events', color: 'from-purple-500 to-pink-500' },
    { label: 'Card Library', value: 'Manage', icon: CreditCard, href: '/admin/cards', color: 'from-green-500 to-emerald-500' },
    { label: 'Rewards', value: 'Manage', icon: Gift, href: '/admin/rewards', color: 'from-orange-500 to-red-500' },
    { label: 'Wallet', value: 'Manage', icon: Wallet, href: '/admin/wallet', color: 'from-indigo-500 to-purple-500' },
    { label: 'Users', value: 'Manage', icon: Users, href: '/admin/users', color: 'from-pink-500 to-rose-500' },
    { label: 'Orders', value: 'Manage', icon: ShoppingCart, href: '/admin/orders', color: 'from-yellow-500 to-orange-500' },
    { label: 'Analytics', value: 'View', icon: BarChart3, href: '/admin/analytics', color: 'from-teal-500 to-cyan-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center shadow-lg">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back, {userName}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
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
                className="group relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <div className="relative">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 shadow-md`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {stat.label}
                  </h3>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {stat.value}
                    </p>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-fuchsia-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/admin/cms')}
                className="w-full text-left px-4 py-3 rounded-lg bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white font-medium hover:from-fuchsia-600 hover:to-rose-600 transition-all duration-300 flex items-center justify-between"
              >
                <span>Open Content Management</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/admin/analytics')}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 flex items-center justify-between"
              >
                <span className="text-gray-900 dark:text-white font-medium">View Analytics</span>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
              <button
                onClick={() => router.push('/admin/users')}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 flex items-center justify-between"
              >
                <span className="text-gray-900 dark:text-white font-medium">Manage Users</span>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              System Status
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">CMS Status</span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">User Role</span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400">
                  {user.isAdmin ? 'Admin' : 'Editor'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Permissions</span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                  {user.permissions?.length || 0} Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
