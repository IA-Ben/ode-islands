"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permissions: string[];
}

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  permissions?: string[];
}

const navItems: NavItem[] = [
  { 
    label: 'Dashboard', 
    href: '/admin', 
    icon: LayoutDashboard, 
    permissions: ['content:view'] 
  },
  { 
    label: 'Story', 
    href: '/admin/story', 
    icon: BookOpen, 
    permissions: ['story:view', 'story:create', 'story:edit'] 
  },
  { 
    label: 'Events', 
    href: '/admin/events', 
    icon: Calendar, 
    permissions: ['events:view', 'events:create', 'events:edit'] 
  },
  { 
    label: 'Cards', 
    href: '/admin/cards', 
    icon: CreditCard, 
    permissions: ['cards:view', 'cards:create', 'cards:edit'] 
  },
  { 
    label: 'Rewards', 
    href: '/admin/rewards', 
    icon: Gift, 
    permissions: ['rewards:view', 'rewards:create'] 
  },
  { 
    label: 'Wallet', 
    href: '/admin/wallet', 
    icon: Wallet, 
    permissions: ['users:manage_wallet'] 
  },
  { 
    label: 'Users', 
    href: '/admin/users', 
    icon: Users, 
    permissions: ['users:view'] 
  },
  { 
    label: 'Orders', 
    href: '/admin/orders', 
    icon: ShoppingCart, 
    permissions: ['orders:view', 'orders:create'] 
  },
  { 
    label: 'Analytics', 
    href: '/admin/analytics', 
    icon: BarChart3, 
    permissions: ['analytics:view'] 
  },
  { 
    label: 'Settings', 
    href: '/admin/settings', 
    icon: Settings, 
    permissions: ['settings:view', 'settings:edit'] 
  },
];

function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  
  if (userPermissions.includes('system:admin')) {
    return true;
  }
  
  for (const required of requiredPermissions) {
    for (const userPerm of userPermissions) {
      if (userPerm === required) return true;
      
      if (userPerm.endsWith('*')) {
        const prefix = userPerm.slice(0, -1);
        if (required.startsWith(prefix)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

export default function AdminTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const visibleNavItems = navItems.filter(item => {
    if (!user || !user.permissions) return false;
    return hasAnyPermission(user.permissions, item.permissions);
  });

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    if (href === '/admin/cms') {
      return pathname === href || pathname?.startsWith('/admin/cms/');
    }
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : '';
  const hasAnyAdminPermission = user && user.permissions && user.permissions.length > 0;

  if (loading) {
    return (
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <Loader2 className="w-5 h-5 animate-spin text-fuchsia-600" />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        </div>
      </nav>
    );
  }

  if (!hasAnyAdminPermission) {
    return (
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Admin CMS</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">The Ode Islands</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-700 dark:text-red-400">
                Access Denied - No Admin Permissions
              </span>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Admin CMS</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">The Ode Islands</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center px-8">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${active
                      ? 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden xl:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* User dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-400 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-900 dark:text-white max-w-[120px] truncate">
                  {userName}
                </span>
              </button>

              {/* Dropdown menu */}
              {userMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden z-20">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{userName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                      {user?.isAdmin && (
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400">
                          Admin
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="px-4 py-3 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${active
                      ? 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
