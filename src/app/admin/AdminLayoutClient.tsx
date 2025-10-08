"use client";

import { ReactNode } from 'react';
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
