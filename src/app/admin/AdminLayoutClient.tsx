"use client";

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import UnifiedTopNav from '@/components/UnifiedTopNav';
import { CommandPalette } from '@/components/admin/CommandPalette';
import { layout } from '@/lib/admin/designTokens';

interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  permissions?: string[];
}

interface AdminLayoutClientProps {
  children: ReactNode;
  user: UserData | null;
}

const getAdminSectionFromPath = (pathname: string): string => {
  if (pathname === '/admin') return 'dashboard';
  const match = pathname.match(/^\/admin\/([^\/]+)/);
  return match ? match[1] : 'dashboard';
};

export default function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();

  // CRITICAL SECURITY FIX: Redirect unauthenticated users
  useEffect(() => {
    if (!user) {
      const redirectUrl = `/handler/sign-in?redirect=${encodeURIComponent(pathname)}`;
      console.log('🔒 Unauthenticated access to admin area - redirecting to login');
      router.push(redirectUrl);
    }
  }, [user, router, pathname]);

  // Block rendering if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Additional check: Verify user has admin privileges
  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-slate-400 mb-6">
            You don't have permission to access the admin area.
          </p>
          <button
            onClick={() => router.push('/event')}
            className="px-6 py-3 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 transition-colors"
          >
            Return to App
          </button>
        </div>
      </div>
    );
  }

  const currentSection = getAdminSectionFromPath(pathname);

  return (
    <div className={layout.page}>
      <CommandPalette />
      <UnifiedTopNav
        mode="admin"
        user={user}
        currentAdminSection={currentSection}
        onAdminSectionChange={(section) => {
          const path = section === 'dashboard' ? '/admin' : `/admin/${section}`;
          router.push(path);
        }}
        onSwitchMode={(nextMode) => {
          if (nextMode === 'app') {
            router.push('/event');
          }
        }}
      />
      <main className={layout.content}>
        {children}
      </main>
    </div>
  );
}
